import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify, rejectContextOverrides, withFixture } from '../verify.mjs';

// Small inputs for the public Playwright 1.64.1 JSON reporter contract.
// These are classifier tests, never demonstration receipts.
function specimen(scenario = 'shared') {
  const paired = !scenario.endsWith('-alone');
  const roles = paired ? ['writer', 'reader'] : [scenario.split('-')[0]];
  const account = role => scenario === 'separate' ? `demo-${role}` : 'demo-shared';
  const events = [];
  const emit = (type, role, value) => {
    const event = { seq: events.length + 1, type, role, account: account(role), ...(value === undefined ? {} : { value }) };
    events.push(event);
    return event;
  };
  const observations = {};
  for (const role of roles) observations[role] = {
    role, account: account(role), initial: 'On', probe: role,
    initialSeq: emit('read', role, 'On').seq,
  };
  if (roles.includes('reader')) emit('reader-ready', 'reader');
  if (roles.includes('writer')) {
    observations.writer.save = emit('save', 'writer', 'Off');
    observations.writer.value = 'Off';
    observations.writer.reloadSeq = emit('read', 'writer', 'Off').seq;
    emit('writer-saved', 'writer');
  }
  if (roles.includes('reader')) {
    observations.reader.value = scenario === 'shared' ? 'Off' : 'On';
    observations.reader.reloadSeq = emit('read', 'reader', observations.reader.value).seq;
  }
  const message = 'Error: Reader account remains On after reload\n\nExpected: "On"\nReceived: "Off"';
  const specs = roles.map((role, index) => {
    const failed = role === 'reader' && scenario === 'shared';
    return {
      title: role === 'writer' ? 'writer saves Off' : 'reader keeps On', ok: !failed,
      tests: [{
        expectedStatus: 'passed', projectName: 'chromium', status: failed ? 'unexpected' : 'expected',
        results: [{
          status: failed ? 'failed' : 'passed', retry: 0, workerIndex: index, parallelIndex: index,
          ...(failed ? { error: { message } } : {}), errors: failed ? [{ message: `${message}\n\n    at tests/accounts.spec.js:60:71` }] : [],
          attachments: [{ name: 'observation', contentType: 'application/json', body: Buffer.from(JSON.stringify(observations[role])).toString('base64') }],
        }],
      }],
    };
  });
  return {
    scenario, processResult: { code: scenario === 'shared' ? 1 : 0, signal: null }, events,
    report: {
      config: { workers: 2, fullyParallel: true, projects: [{ name: 'chromium', retries: 0 }] },
      suites: [{ specs: [], suites: [{ specs }] }], errors: [],
      stats: { expected: roles.length - Number(scenario === 'shared'), unexpected: Number(scenario === 'shared'), skipped: 0, flaky: 0 },
    },
  };
}
const specs = input => input.report.suites[0].suites[0].specs;
const result = (input, index = 1) => specs(input)[index].tests[0].results[0];
const verify = input => classify({ ...input, raw: JSON.stringify(input.report) });
function changeObservation(input, change) {
  const attachment = result(input).attachments[0];
  const observation = JSON.parse(Buffer.from(attachment.body, 'base64'));
  change(observation);
  attachment.body = Buffer.from(JSON.stringify(observation)).toString('base64');
}

for (const scenario of ['shared', 'separate', 'writer-alone', 'reader-alone']) {
  test(`TP-06 accepts complete ${scenario} reporter and server evidence`, () => {
    const observations = verify(specimen(scenario));
    assert.equal(observations.reader?.value, scenario === 'shared' ? 'Off' : scenario === 'writer-alone' ? undefined : 'On');
  });
}

const refusals = {
  'missing test': input => specs(input).pop(),
  'extra test': input => specs(input).push(structuredClone(specs(input)[0])),
  'reader timeout': input => { result(input).status = 'timedOut'; },
  'unrelated reader error': input => { result(input).errors[0].message = 'browserType.launch: Executable does not exist'; },
  'unrelated primary error': input => { result(input).error.message = 'Unrelated error'; },
  'extra reader error': input => { result(input).errors.push({ message: 'unrelated failure' }); },
  'writer failure': input => { result(input, 0).status = 'failed'; },
  'unexpected reader pass': input => { result(input).status = 'passed'; },
  'all green exit': input => { input.processResult.code = 0; },
  'retried result': input => { result(input).retry = 1; },
  'multiple attempts': input => { specs(input)[1].tests[0].results.push(structuredClone(result(input))); },
  'expected-failure annotation': input => { specs(input)[1].tests[0].expectedStatus = 'failed'; },
  'skip': input => { result(input).status = 'skipped'; },
  'flaky summary': input => { input.report.stats.flaky = 1; },
  'global error': input => { input.report.errors.push({ message: 'setup failed' }); },
  'missing attachment': input => { result(input).attachments = []; },
  'wrong value': input => changeObservation(input, o => { o.value = 'On'; }),
  'missing value': input => changeObservation(input, o => { delete o.value; }),
  'wrong initial value': input => changeObservation(input, o => { o.initial = 'Off'; }),
  'shared storage probe': input => changeObservation(input, o => { o.probe = 'writer'; }),
  'missing storage probe': input => changeObservation(input, o => { delete o.probe; }),
  'wrong account': input => changeObservation(input, o => { o.account = 'demo-reader'; }),
  'child spawn error': input => { input.processResult.error = 'ENOENT'; },
  'child signal': input => { input.processResult.signal = 'SIGTERM'; },
  'scenario deadline': input => { input.processResult.timedOut = true; },
  'same worker': input => { result(input).workerIndex = result(input, 0).workerIndex; },
  'same parallel slot': input => { result(input).parallelIndex = result(input, 0).parallelIndex; },
  'wrong project': input => { specs(input)[1].tests[0].projectName = 'firefox'; },
  'retries enabled': input => { input.report.config.projects[0].retries = 1; },
  'serialization': input => { input.report.config.fullyParallel = false; },
  'missing save event': input => { input.events.splice(3, 1); },
  'unverified reload': input => changeObservation(input, o => { o.reloadSeq = o.initialSeq; }),
  'out of order readiness': input => { input.events[2].type = 'writer-saved'; },
};
for (const [name, mutate] of Object.entries(refusals)) {
  test(`TP-06 rejects ${name}`, () => {
    const input = specimen();
    mutate(input);
    assert.throws(() => verify(input));
  });
}
for (const raw of ['', '{broken', 'null']) {
  test(`TP-06 rejects malformed/missing report ${JSON.stringify(raw)}`, () => {
    assert.throws(() => classify({ ...specimen(), raw }));
  });
}
for (const scenario of ['writer-alone', 'reader-alone', 'separate']) {
  test(`TP-06 ${scenario} rejects a failed or missing test`, () => {
    const failed = specimen(scenario);
    result(failed, 0).status = 'failed';
    assert.throws(() => verify(failed));
    const missing = specimen(scenario);
    specs(missing).pop();
    assert.throws(() => verify(missing));
  });
}
test('TP-06 refuses inherited context reuse and external browser overrides', () => {
  for (const key of ['PW_TEST_REUSE_CONTEXT', 'PW_TEST_CONNECT_WS_ENDPOINT']) {
    assert.throws(() => rejectContextOverrides({ [key]: '1' }), new RegExp(key));
  }
  rejectContextOverrides({});
});

test('TP-05 orchestration error closes a real listener and pending latch; next fixture is fresh', { timeout: 10_000 }, async () => {
  let oldURL, cleanup, pending;
  await assert.rejects(withFixture(['writer', 'reader'], async fixture => {
    oldURL = fixture.url;
    const headers = { cookie: 'demo-account=demo-shared', 'x-demo-role': 'writer' };
    const saved = await fetch(`${fixture.url}/api/settings`, { method: 'POST', headers, body: JSON.stringify({ alerts: 'Off' }) });
    assert.equal((await saved.json()).value, 'Off');
    // Confirm the real request is latched before exercising error cleanup.
    const { request } = await import('node:http');
    pending = new Promise(resolve => {
      const req = request(`${fixture.url}/__demo/wait-reader`, { headers }, res => { res.resume(); res.once('end', () => resolve(res.statusCode)); });
      req.on('error', () => resolve('closed'));
      req.end();
    });
    await fixture.whenWaiting('reader-ready');
    throw new Error('Controlled orchestration error (guard only)');
  }, receipt => { cleanup = receipt; }), /Controlled orchestration error/);
  assert.deepEqual(cleanup, { listening: false, connections: 0, pendingLatches: 0 });
  assert.ok([503, 'closed'].includes(await pending));
  await assert.rejects(fetch(`${oldURL}/settings`, { signal: AbortSignal.timeout(1000) }));
  await withFixture(['reader'], async fixture => {
    const response = await fetch(`${fixture.url}/settings`, { headers: { cookie: 'demo-account=demo-shared', 'x-demo-role': 'reader' } });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<option selected>On<\/option>/);
    assert.equal(fixture.events[0].value, 'On');
  });
});
