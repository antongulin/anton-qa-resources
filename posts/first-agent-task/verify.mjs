import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('.', import.meta.url);
const source = new URL('pdf-filename.mjs', root);
const tests = new URL('pdf-filename.test.mjs', root);
const original = await readFile(source, 'utf8');
const expectedNames = [
  'accepts a lowercase PDF extension',
  'accepts an uppercase PDF extension',
  'rejects a text file',
  'rejects a suffix after .pdf',
  'rejects an empty name',
];

function run(directory, expectedResults, expectedExit, passes, failures) {
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'pdf-filename.test.mjs'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  const output = result.stdout;
  const cases = [...output.matchAll(/^(ok|not ok) \d+ - (.+)$/gm)].map(([, outcome, name]) => ({ outcome, name }));
  assert.deepEqual(cases, expectedNames.map((name, index) => ({ name, outcome: expectedResults[index] })));
  assert.equal(result.status, expectedExit, output + result.stderr);
  for (const [label, count] of [['tests', 5], ['pass', passes], ['fail', failures], ['cancelled', 0], ['skipped', 0]]) {
    assert.match(output, new RegExp(`^# ${label} ${count}$`, 'm'), output);
  }
  return output;
}

const broken = run(root, ['ok', 'not ok', 'ok', 'ok', 'ok'], 1, 4, 1);
assert.match(broken, /failureType: 'testCodeFailure'/);
assert.match(broken, /false !== true/);
assert.match(broken, /expected: true/);
assert.match(broken, /actual: false/);
console.log('Starting example: four passes and the intended uppercase PDF failure.');

const oldCheck = "name.endsWith('.pdf')";
assert.equal(original.split(oldCheck).length, 2, 'Expected exactly one deliberate case-sensitive check');
const temporary = await mkdtemp(join(tmpdir(), 'first-agent-task-'));
try {
  await writeFile(join(temporary, 'pdf-filename.mjs'), original.replace(oldCheck, "name.toLowerCase().endsWith('.pdf')"));
  await writeFile(join(temporary, 'pdf-filename.test.mjs'), await readFile(tests));
  run(temporary, ['ok', 'ok', 'ok', 'ok', 'ok'], 0, 5, 0);
  console.log('Corrected temporary copy: all five tests pass.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
assert.equal(await readFile(source, 'utf8'), original, 'Published helper must remain unchanged');
