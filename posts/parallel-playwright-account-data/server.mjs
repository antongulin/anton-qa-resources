import { createServer } from 'node:http';

function settingsPage(value) {
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Synthetic account settings</title>
<body><main><h1>Account settings</h1>
<p>Synthetic localhost data. No emails are sent.</p>
<label for="alerts">Email alerts</label>
<select id="alerts"><option${value === 'On' ? ' selected' : ''}>On</option><option${value === 'Off' ? ' selected' : ''}>Off</option></select>
<button type="button">Save</button><p role="status"></p></main>
<script>
document.querySelector('button').addEventListener('click', async () => {
  const response = await fetch('/api/settings', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alerts: document.querySelector('select').value })
  });
  const result = await response.json();
  document.querySelector('[role="status"]').textContent = response.ok ? 'Saved ' + result.value : 'Save failed';
});
</script></body></html>`;
}

// Coordination belongs to the demonstration fixture. It never changes account data.
export async function startFixture({ participants }) {
  const accounts = new Map(['demo-shared', 'demo-writer', 'demo-reader'].map(id => [id, 'On']));
  const events = [];
  const sockets = new Set();
  const gates = {
    'reader-ready': { open: !participants.includes('reader'), pending: new Set() },
    'writer-saved': { open: !participants.includes('writer'), pending: new Set() },
  };
  for (const gate of Object.values(gates)) {
    gate.waiting = new Promise(resolve => { gate.noteWaiting = resolve; });
  }
  const record = (type, role, account, value) => {
    const event = { seq: events.length + 1, type, role, account, value };
    events.push(event);
    return event;
  };
  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  function release(name) {
    const gate = gates[name];
    gate.open = true;
    for (const finish of [...gate.pending]) finish(200);
  }
  function wait(name, res) {
    const gate = gates[name];
    if (gate.open) return json(res, 200, { released: true });
    const finish = status => {
      clearTimeout(timer);
      gate.pending.delete(finish);
      if (!res.destroyed) json(res, status, { released: status === 200 });
    };
    const timer = setTimeout(() => finish(504), 10_000);
    gate.pending.add(finish);
    gate.noteWaiting();
    res.once('close', () => { clearTimeout(timer); gate.pending.delete(finish); });
  }
  const server = createServer((req, res) => {
    void handle(req, res).catch(error => {
      if (!res.headersSent && !res.destroyed) json(res, 400, { error: error.message });
      else res.destroy();
    });
  });
  async function handle(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1');
    const account = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('demo-account='))?.slice(13);
    const role = req.headers['x-demo-role'];
    if (!accounts.has(account) || !participants.includes(role)) return json(res, 401, { error: 'Unknown synthetic account or role' });
    if (req.method === 'GET' && url.pathname === '/settings') {
      const value = accounts.get(account);
      const event = record('read', role, account, value);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-demo-sequence': String(event.seq) });
      return res.end(settingsPage(value));
    }
    if (req.method === 'POST' && url.pathname === '/api/settings') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 1024) return json(res, 413, { error: 'Body too large' });
      }
      const { alerts } = JSON.parse(body);
      if (!['On', 'Off'].includes(alerts)) return json(res, 400, { error: 'Invalid alerts value' });
      accounts.set(account, alerts);
      return json(res, 200, record('save', role, account, alerts));
    }
    if (req.method === 'GET' && url.pathname === '/__demo/wait-reader') return wait('reader-ready', res);
    if (req.method === 'GET' && url.pathname === '/__demo/wait-saved') return wait('writer-saved', res);
    const boundary = url.pathname.slice('/__demo/'.length);
    if (req.method === 'POST' && url.pathname.startsWith('/__demo/') && ((boundary === 'reader-ready' && role === 'reader') || (boundary === 'writer-saved' && role === 'writer'))) {
      const event = record(boundary, role, account);
      release(boundary);
      return json(res, 200, event);
    }
    json(res, 404, { error: 'Not found' });
  }
  server.on('connection', socket => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
  } catch (error) {
    server.close();
    for (const socket of sockets) socket.destroy();
    throw error;
  }
  let closing;
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    events,
    whenWaiting: name => gates[name].waiting,
    close() {
      return closing ??= (async () => {
        for (const gate of Object.values(gates)) for (const finish of [...gate.pending]) finish(503);
        const closed = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        const socketClosures = [...sockets].map(socket => new Promise(resolve => { socket.once('close', resolve); socket.destroy(); }));
        await Promise.all([closed, ...socketClosures]);
        return { listening: server.listening, connections: sockets.size, pendingLatches: Object.values(gates).reduce((n, g) => n + g.pending.size, 0) };
      })();
    },
  };
}
