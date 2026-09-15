import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';

const root = process.cwd();
const reportDirectory = path.join(root, 'artifacts');
const reportPath = path.join(reportDirectory, 'verification-report.json');

function relative(file) {
  return path.relative(root, file);
}

function withoutAnsi(value) {
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
}

function allTests(suites) {
  return suites.flatMap(suite => [
    ...(suite.specs ?? []).flatMap(spec => (spec.tests ?? []).map(item => ({ ...item, title: spec.title }))),
    ...allTests(suite.suites ?? []),
  ]);
}

function attachment(result, name) {
  const found = result.attachments?.find(item => item.name === name);
  assert.ok(found?.path, `Attempt ${result.retry} must include a ${name} attachment`);
  return found.path;
}

function traceArchive(tracePath) {
  const zip = new AdmZip(tracePath);
  const members = new Map(zip.getEntries().map(entry => [entry.entryName, entry]));
  return {
    members: [...members.keys()],
    text(member) {
      const entry = members.get(member);
      assert.ok(entry, `Trace archive must contain ${member}`);
      return entry.getData().toString('utf8');
    },
  };
}

function checkoutEvidence(tracePath, expected) {
  const archive = traceArchive(tracePath);
  const { members } = archive;
  const networkMember = members.find(member => /^\d+-trace\.network$/.test(member));
  const browserTraceMember = members.find(member => /^\d+-trace\.trace$/.test(member));
  assert.ok(networkMember, 'Trace archive must contain a browser network stream');
  assert.ok(browserTraceMember, 'Trace archive must contain a browser event stream');

  const network = archive.text(networkMember)
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
  const request = network.find(event => event.snapshot?.request?.url?.endsWith('/api/checkout'));
  assert.ok(request, 'Trace network stream must include POST /api/checkout');
  assert.equal(request.snapshot.request.method, 'POST');
  assert.equal(request.snapshot.response.status, expected.status);
  assert.equal(request.snapshot._wasFulfilled, true, 'The response must be the explicit test route fixture');

  const responseResource = request.snapshot.response.content?._file;
  assert.ok(responseResource, 'Trace network stream must name the response resource');
  assert.ok(members.includes(responseResource), 'Trace archive must contain its named response resource');
  const responseBody = archive.text(responseResource);
  assert.match(responseBody, expected.body);

  const browserTrace = archive.text(browserTraceMember);
  assert.match(browserTrace, /Save checkout/);
  assert.match(browserTrace, expected.body);

  return {
    archive: relative(tracePath),
    browserTraceMember,
    networkMember,
    responseResource,
    responseStatus: request.snapshot.response.status,
    responseBody,
  };
}

async function main() {
  await rm(path.join(root, 'test-results'), { recursive: true, force: true });
  await rm(path.join(root, 'playwright-report'), { recursive: true, force: true });
  await rm(reportDirectory, { recursive: true, force: true });

  const run = spawnSync(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test'],
    { cwd: root, encoding: 'utf8', env: process.env },
  );
  assert.ifError(run.error);
  assert.equal(
    run.status,
    0,
    `Playwright must complete with expected flaky tests:\nSTDOUT:\n${run.stdout}\nSTDERR:\n${run.stderr}`,
  );

  const result = JSON.parse(await readFile(path.join(root, 'test-results', 'results.json'), 'utf8'));
  assert.deepEqual(result.errors, [], 'No setup or global errors are expected');
  const tests = allTests(result.suites);
  const coreTests = tests.filter(item => item.projectName === 'on-first-retry' || item.projectName === 'retain-on-failure');
  assert.equal(coreTests.length, 2, 'Both trace modes must run the same core test');

  const traceReports = {};
  for (const coreTest of coreTests) {
    assert.equal(coreTest.status, 'flaky', `${coreTest.projectName} must be classified as flaky`);
    assert.deepEqual(coreTest.results.map(item => item.status), ['failed', 'passed']);
    assert.deepEqual(coreTest.results.map(item => item.retry), [0, 1]);

    const originalFailure = coreTest.results[0];
    const originalError = withoutAnsi(originalFailure.error?.message ?? '');
    assert.match(originalError, /Injected first-attempt save failure/);
    assert.match(originalError, /Saved on retry by synthetic fixture/);

    if (coreTest.projectName === 'on-first-retry') {
      assert.equal(originalFailure.attachments?.some(item => item.name === 'trace'), false);
      const retry = coreTest.results[1];
      const tracePath = attachment(retry, 'trace');
      const evidence = checkoutEvidence(tracePath, {
        status: 200,
        body: /Saved on retry by synthetic fixture/,
      });
      assert.doesNotMatch(traceArchive(tracePath).text(evidence.browserTraceMember), /Injected first-attempt save failure/);
      traceReports.onFirstRetry = { retry: retry.retry, ...evidence };
    } else {
      const tracePath = attachment(originalFailure, 'trace');
      const evidence = checkoutEvidence(tracePath, {
        status: 503,
        body: /Injected first-attempt save failure/,
      });
      const testTrace = traceArchive(tracePath).text('test.trace');
      assert.match(testTrace, /Injected first-attempt save failure/);
      assert.match(testTrace, /\"type\":\"error\"/);
      traceReports.retainOnFailure = {
        retry: originalFailure.retry,
        originalErrorEvidence: {
          expected: 'Saved on retry by synthetic fixture',
          received: 'Injected first-attempt save failure',
        },
        ...evidence,
      };
    }
  }

  const companionTests = tests.filter(item => item.projectName === 'companions');
  assert.equal(companionTests.length, 3, 'All three companion checks must run');
  for (const companion of companionTests) {
    assert.equal(companion.status, 'expected');
    assert.deepEqual(companion.results.map(item => item.status), ['passed']);
  }

  const report = {
    playwrightVersion: result.config?.version,
    outcome: 'verified',
    coreClassification: 'flaky: failed attempt 0 followed by passed retry 1',
    traces: traceReports,
    companions: companionTests.map(item => ({
      title: item.title,
      classification: item.status,
      result: item.results[0].status,
    })),
  };
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Verified trace evidence. JSON report: ${relative(reportPath)}`);
  console.log(JSON.stringify(report, null, 2));
}

await main();
