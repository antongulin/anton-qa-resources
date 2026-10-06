import test from 'node:test';
import assert from 'node:assert/strict';
import { isPdfFilename } from './pdf-filename.mjs';

test('accepts a lowercase PDF extension', () => {
  assert.equal(isPdfFilename('invoice.pdf'), true);
});

test('accepts an uppercase PDF extension', () => {
  assert.equal(isPdfFilename('report.PDF'), true);
});

test('rejects a text file', () => {
  assert.equal(isPdfFilename('notes.txt'), false);
});

test('rejects a suffix after .pdf', () => {
  assert.equal(isPdfFilename('report.pdf.exe'), false);
});

test('rejects an empty name', () => {
  assert.equal(isPdfFilename(''), false);
});
