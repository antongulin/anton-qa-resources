import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { startFixture } from './server.mjs';

export const scenarios = {
  'writer-alone': { writer: 'demo-shared' },
  'reader-alone': { reader: 'demo-shared' },
  shared: { writer: 'demo-shared', reader: 'demo-shared' },
  separate: { writer: 'demo-writer', reader: 'demo-reader' },
};
const root = fileURLToPath(new URL('.', import.meta.url));
const titles = { writer: 'writer saves Off', reader: 'reader keeps On' };
const clean = text => text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');

export function rejectContextOverrides(env) {
  for (const key of ['PW_TEST_REUSE_CONTEXT', 'PW_TEST_CONNECT_WS_ENDPOINT']) {
    assert.ok(!env[key], `${key} would invalidate managed local context isolation`);
  }
}

export function classify({ scenario, raw, processResult, events }) {
  const accounts = scenarios[scenario];
  assert.ok(accounts, 'Known scenario required');
  assert.ok(!processResult.error && !processResult.signal && !processResult.timedOut, 'Child must complete normally');
  assert.equal(processResult.code, scenario === 'shared' ? 1 : 0, 'Exact raw exit code');
  const report = JSON.parse(raw);
  assert.deepEqual(report.errors, [], 'No global errors');
  assert.equal(report.config.workers, 2, 'Two configured workers');
  assert.equal(report.config.fullyParallel, true, 'Tests remain parallel');
  assert.equal(report.config.projects.length, 1, 'One Chromium project');
  assert.equal(report.config.projects[0].name, 'chromium');
  assert.equal(report.config.projects[0].retries, 0);
  const specs = [];
  function walk(suites) {
    assert.ok(Array.isArray(suites), 'Nested suites required');
    for (const suite of suites) {
      assert.ok(Array.isArray(suite.specs), 'Suite specs required');
      specs.push(...suite.specs);
      if (suite.suites) walk(suite.suites);
    }
  }
  walk(report.suites);
  const roles = Object.keys(accounts);
  assert.deepEqual(specs.map(s => s.title).sort(), roles.map(r => titles[r]).sort(), 'Exact selected tests');
  const observations = {};
  const results = [];
  for (const role of roles) {
    const spec = specs.find(s => s.title === titles[role]);
    assert.equal(spec.tests.length, 1, 'One project result per test');
    const test = spec.tests[0];
    assert.equal(test.projectName, 'chromium');
    assert.equal(test.expectedStatus, 'passed', 'No expected-failure annotations');
    assert.equal(test.results.length, 1, 'No repeated attempts');
    const result = test.results[0];
    results.push(result);
    assert.equal(result.retry, 0);
    assert.ok(Number.isInteger(result.workerIndex) && result.workerIndex >= 0);
    assert.ok(Number.isInteger(result.parallelIndex) && result.parallelIndex >= 0);
    const failure = scenario === 'shared' && role === 'reader';
    assert.equal(result.status, failure ? 'failed' : 'passed');
    assert.equal(test.status, failure ? 'unexpected' : 'expected');
    assert.equal(spec.ok, !failure);
    assert.equal(result.errors.length, failure ? 1 : 0, 'Only the identified value assertion may fail');
    if (failure) {
      const message = clean(result.errors[0].message);
      assert.match(message, /Reader account remains On after reload/);
      assert.match(message, /Expected: "On"/);
      assert.match(message, /Received: "Off"/);
      assert.doesNotMatch(message, /timeout|timed out|browserType|Target closed/i);
      const primary = clean(result.error.message);
      assert.match(primary, /Reader account remains On after reload/);
      assert.match(primary, /Expected: "On"/);
      assert.match(primary, /Received: "Off"/);
      // The collected JSON-reporter error adds the source frame and stack.
      assert.ok(message === primary || message.startsWith(`${primary}\n`), 'Primary and collected error agree');
    } else assert.ok(!result.error, 'Passing result has no error');
    const attachments = result.attachments.filter(a => a.name === 'observation');
    assert.equal(attachments.length, 1, 'One actual observation attachment');
    assert.equal(attachments[0].contentType, 'application/json');
    const observation = JSON.parse(Buffer.from(attachments[0].body, 'base64').toString('utf8'));
    observations[role] = observation;
    assert.equal(observation.role, role);
    assert.equal(observation.account, accounts[role]);
    assert.equal(observation.initial, 'On');
    assert.equal(observation.probe, role, 'Browser storage stays isolated');
    assert.equal(observation.value, role === 'writer' || failure ? 'Off' : 'On');
  }
  if (roles.length === 2) {
    assert.equal(new Set(results.map(r => r.workerIndex)).size, 2, 'Distinct workers');
    assert.equal(new Set(results.map(r => r.parallelIndex)).size, 2, 'Distinct parallel slots');
  }
  assert.equal(report.stats.skipped, 0);
  assert.equal(report.stats.flaky, 0);
  assert.equal(report.stats.expected, roles.length - Number(scenario === 'shared'));
  assert.equal(report.stats.unexpected, Number(scenario === 'shared'));
  assert.ok(Array.isArray(events), 'Server observations required');
  assert.deepEqual(events.map(e => e.seq), events.map((_, i) => i + 1), 'Ordered server event sequence');
  const eventAt = (seq, type, role, value) => {
    const event = events.find(e => e.seq === seq);
    assert.ok(event, 'Observation references a real server event');
    assert.equal(event.type, type);
    assert.equal(event.role, role);
    assert.equal(event.account, accounts[role]);
    assert.equal(event.value, value);
    return event;
  };
  for (const role of roles) {
    const o = observations[role];
    eventAt(o.initialSeq, 'read', role, 'On');
    eventAt(o.reloadSeq, 'read', role, o.value);
    assert.ok(o.initialSeq < o.reloadSeq);
    assert.equal(events.filter(e => e.type === 'read' && e.role === role).length, 2);
  }
  const saves = events.filter(e => e.type === 'save');
  assert.equal(saves.length, roles.includes('writer') ? 1 : 0);
  if (observations.writer) {
    const w = observations.writer;
    assert.deepEqual(w.save, eventAt(w.save.seq, 'save', 'writer', 'Off'));
    assert.ok(w.initialSeq < w.save.seq && w.save.seq < w.reloadSeq);
    const saved = events.filter(e => e.type === 'writer-saved');
    assert.equal(saved.length, 1);
    eventAt(saved[0].seq, 'writer-saved', 'writer', undefined);
    assert.ok(w.reloadSeq < saved[0].seq);
    if (observations.reader) assert.ok(saved[0].seq < observations.reader.reloadSeq, 'Reader reload follows writer verification');
  }
  if (observations.reader) {
    const ready = events.filter(e => e.type === 'reader-ready');
    assert.equal(ready.length, 1);
    eventAt(ready[0].seq, 'reader-ready', 'reader', undefined);
    assert.ok(observations.reader.initialSeq < ready[0].seq && ready[0].seq < observations.reader.reloadSeq);
    if (observations.writer) assert.ok(ready[0].seq < observations.writer.save.seq, 'Reader ready precedes save');
  }
  assert.equal(events.length, roles.length * 3 + Number(roles.includes('writer')), 'No extra operations');
  return observations;
}

// The same finally path covers a child failure, malformed report, or an operation throwing.
export async function withFixture(participants, operation, onCleanup = () => {}) {
  const fixture = await startFixture({ participants });
  try {
    return await operation(fixture);
  } finally {
    const cleanup = await fixture.close();
    await onCleanup(cleanup, fixture);
  }
}

async function runChild(args, env, signal, directory) {
  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', error, killTimer;
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', err => { error = err.message; });
    const abort = () => {
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), 3_000);
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    child.once('close', (code, childSignal) => {
      clearTimeout(killTimer);
      signal.removeEventListener('abort', abort);
      resolve({ code, signal: childSignal, error, timedOut: signal.aborted, childClosed: true, pid: child.pid, stdout, stderr });
    });
  });
  await Promise.all([writeFile(join(directory, 'stdout.txt'), result.stdout), writeFile(join(directory, 'stderr.txt'), result.stderr)]);
  const { stdout, stderr, ...receipt } = result;
  return receipt;
}

export async function runScenario(scenario, signal = new AbortController().signal) {
  assert.ok(Object.hasOwn(scenarios, scenario), 'Choose writer-alone, reader-alone, shared, or separate');
  rejectContextOverrides(process.env);
  await mkdir(join(root, 'artifacts'), { recursive: true });
  const directory = await mkdtemp(join(root, 'artifacts', `${scenario}-`));
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  // Leave three seconds for termination before the 90-second scenario bound.
  const timeout = setTimeout(abort, 87_000);
  let processResult;
  let observations;
  let cleanup;
  try {
    await withFixture(Object.keys(scenarios[scenario]), async fixture => {
      const args = ['node_modules/@playwright/test/cli.js', 'test'];
      if (scenario.endsWith('-alone')) args.push('--grep', titles[scenario.split('-')[0]]);
      processResult = await runChild(args, {
        ...process.env,
        DEMO_URL: fixture.url,
        DEMO_ACCOUNTS: JSON.stringify(scenarios[scenario]),
        DEMO_RUN_DIR: directory,
        // Explicit config owns the reporter location even if the caller uses these elsewhere.
        PLAYWRIGHT_JSON_OUTPUT_FILE: '', PLAYWRIGHT_JSON_OUTPUT_NAME: '', PLAYWRIGHT_JSON_OUTPUT_DIR: '',
      }, controller.signal, directory);
      await writeFile(join(directory, 'process.json'), JSON.stringify(processResult, null, 2));
      const raw = await readFile(join(directory, 'report.json'), 'utf8');
      observations = classify({ scenario, raw, processResult, events: fixture.events });
      if (scenario === 'shared') {
        const printFailure = suites => {
          for (const suite of suites) {
            for (const spec of suite.specs) if (spec.title === titles.reader) console.log(clean(spec.tests[0].results[0].error.message));
            if (suite.suites) printFailure(suite.suites);
          }
        };
        printFailure(JSON.parse(raw).suites);
      }
      await writeFile(join(directory, 'observations.json'), JSON.stringify(observations, null, 2));
    }, async (closed, fixture) => {
      cleanup = { ...closed, childClosed: processResult?.childClosed ?? true };
      await Promise.all([
        writeFile(join(directory, 'events.json'), JSON.stringify(fixture.events, null, 2)),
        writeFile(join(directory, 'cleanup.json'), JSON.stringify(cleanup, null, 2)),
      ]);
    });
    assert.deepEqual(cleanup, { listening: false, connections: 0, pendingLatches: 0, childClosed: true });
    console.log(`${scenario}: ${JSON.stringify(observations)}; raw exit ${processResult.code}; cleanup confirmed. Artifacts: ${directory}`);
    return { scenario, directory, processResult, cleanup, observations };
  } catch (error) {
    await writeFile(join(directory, 'verification-error.txt'), error.stack ?? String(error));
    throw new Error(`Verification failed for ${scenario}. Evidence: ${directory}`, { cause: error });
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

async function main() {
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const args = process.argv.slice(2);
    if (args.length) {
      assert.equal(args.length, 2, 'Usage: npm run demo -- <scenario>');
      assert.equal(args[0], '--scenario');
      const result = await runScenario(args[1], controller.signal);
      process.exitCode = result.processResult.code;
    } else {
      const results = [];
      for (const scenario of ['writer-alone', 'reader-alone', 'shared', 'separate', 'shared', 'separate']) {
        if (controller.signal.aborted) throw new Error('Verification interrupted');
        results.push(await runScenario(scenario, controller.signal));
      }
      const summary = join(root, 'artifacts', `verification-${Date.now()}.json`);
      await writeFile(summary, JSON.stringify(results, null, 2));
      console.log(`Verified six fresh scenarios: eight passes, two identified reader failures. Summary: ${summary}`);
    }
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 2; });
}
