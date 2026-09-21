import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const playwrightCli = ['node_modules/@playwright/test/cli.js', 'test', '--reporter=json'];

function runTests(variant) {
  const result = spawnSync(process.execPath, playwrightCli, {
    encoding: 'utf8',
    env: { ...process.env, APP_VARIANT: variant },
  });
  assert.ifError(result.error);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.errors, [], `No setup or global errors are expected for ${variant}`);
  const specs = [];
  const walk = suites => {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) specs.push({ title: spec.title, status: spec.ok, error: spec.tests[0]?.results[0]?.error?.message ?? '' });
      walk(suite.suites ?? []);
    }
  };
  walk(report.suites);
  return { status: result.status, specs, stdout: result.stdout, stderr: result.stderr };
}

function byTitle(result, fragment) {
  const spec = result.specs.find(item => item.title.includes(fragment));
  assert.ok(spec, `Expected a spec matching "${fragment}" in ${result.specs.map(s => s.title).join(', ')}`);
  return spec;
}

function clean(message) {
  return message.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
}

// 1. Correct app: all three checks pass together.
const correct = runTests('correct');
assert.equal(correct.status, 0, correct.stdout + correct.stderr);
assert.equal(correct.specs.length, 3, 'Light baseline, dark colors, and reduced motion must all run');
for (const spec of correct.specs) assert.equal(spec.status, true, `${spec.title} must pass on the corrected app`);
console.log('Corrected app: baseline, dark colors, and reduced motion all pass.');

// 2. Broken colors: the dark-color check must fail with the color reason.
//    The matchMedia flag is still asserted true, so the failure proves the
//    rendered style was checked, not just the emulation flag.
const brokenColors = runTests('css-stuck');
assert.equal(brokenColors.status, 1, 'The broken-color app must fail the dark-color check');
const colorSpec = byTitle(brokenColors, 'rendered card colors');
const colorError = clean(colorSpec.error);
assert.match(colorError, /Expected a dark surface/, 'Failure must be the rendered-color assertion');
assert.match(colorError, /rgb\(255, 255, 255\)/, 'Failure must name the light color actually rendered');
const motionStillPassed = byTitle(brokenColors, 'rendered transition').status;
assert.equal(motionStillPassed, true, 'Reduced-motion behavior is independent of the color defect');
console.log('Broken colors: dark check failed with the light-rgb reason; motion check still passed.');

// 3. Broken motion: the reduced-motion check must fail with the duration reason.
const brokenMotion = runTests('motion-stuck');
assert.equal(brokenMotion.status, 1, 'The broken-motion app must fail the reduced-motion check');
const motionSpec = byTitle(brokenMotion, 'rendered transition');
const motionError = clean(motionSpec.error);
assert.match(motionError, /Expected transition-duration 0s under reduced motion/, 'Failure must be the rendered-duration assertion');
assert.match(motionError, /received 2s/, 'Failure must name the duration actually rendered');
const colorStillPassed = byTitle(brokenMotion, 'rendered card colors').status;
assert.equal(colorStillPassed, true, 'Dark colors are independent of the motion defect');
console.log('Broken motion: reduced-motion check failed with the 2s reason; dark check still passed.');

// 4. Light baseline holds under the broken variants too.
for (const result of [brokenColors, brokenMotion]) {
  assert.equal(byTitle(result, 'default light rendering').status, true, 'The light baseline must stay green');
}
console.log('Light baseline stays green under both deliberately broken variants.');
console.log('Verification complete: 3 checks, 2 deliberate defects with correct independent failure reasons.');
