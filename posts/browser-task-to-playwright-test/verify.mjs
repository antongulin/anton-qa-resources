import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Run the same outcome test against the working and deliberately broken app.
for (const broken of [false, true]) {
  const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--reporter=json'], {
    encoding: 'utf8',
    env: { ...process.env, APP_BROKEN: broken ? '1' : '0' },
  });
  assert.ifError(result.error);
  const report = JSON.parse(result.stdout);
  assert.equal(report.errors.length, 0, 'No setup or global errors are expected');
  const specs = report.suites.flatMap(suite => suite.specs);
  assert.equal(specs.length, 1, 'Exactly one persistence test must run');
  const test = specs[0].tests[0];
  const run = test.results[0];
  if (!broken) {
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(run.status, 'passed');
    console.log('Corrected app: persistence assertion passed.');
  } else {
    assert.equal(result.status, 1, 'Broken app must fail the test');
    assert.equal(run.status, 'failed');
    const error = run.error.message.replace(/\\u001b\\[[0-9;]*m/g, '');
    assert.match(error, /toHaveValue/);
    assert.match(error, /Expected.*Sam/);
    assert.match(error, /Received.*Alex/);
    console.log('Broken app: expected Sam/Alex persistence failure confirmed.');
  }
}

