import { createServer } from 'node:http';

export async function startServer(port = 4187) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const broken = url.searchParams.get('broken') === '1';
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(`<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Profile fixture</title>
<body><main><h1>Profile settings</h1>
<form><label for="name">Display name</label>
<input id="name" autocomplete="off"><button>Save</button></form>
<p role="status"></p><p>Current name: <strong data-testid="current-name"></strong></p>
<script>
const field = document.querySelector('#name');
const current = document.querySelector('[data-testid="current-name"]');
field.value = localStorage.getItem('displayName') || 'Alex';
current.textContent = field.value;
document.querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  // Deliberate application defect: acknowledge Save but discard the new value.
  if (!${broken}) localStorage.setItem('displayName', field.value);
  current.textContent = localStorage.getItem('displayName') || 'Alex';
  document.querySelector('[role="status"]').textContent = 'Saved';
});
</script></main></body></html>`);
  });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  return server;
}

if (process.argv[1]?.endsWith('/server.ts')) {
  await startServer();
  console.log('Fixture listening on http://127.0.0.1:4187');
}

