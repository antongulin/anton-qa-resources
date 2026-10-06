export function isPdfFilename(name) {
  return typeof name === 'string' && name.endsWith('.pdf');
}
