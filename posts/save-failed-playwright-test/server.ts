import { createServer } from 'node:http';
import { basename } from 'node:path';

let paymentRequestCount = 0;

function sendJson(response: import('node:http').ServerResponse, status: number, body: object) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function page(title: string, body: string, script: string) {
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>${title}</title>
<body><main>${body}<script>${script}</script></main></body></html>`;
}

const checkoutPage = page(
  'Local checkout fixture',
  `<h1>Local checkout</h1><label for="note">Order note</label>
  <input id="note" value="Leave at door"><button type="button">Save checkout</button>
  <p role="status" aria-live="polite"></p>`,
  `document.querySelector('button').addEventListener('click', async () => {
    const response = await fetch('/api/checkout', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: document.querySelector('#note').value })
    });
    const result = await response.json();
    document.querySelector('[role="status"]').textContent = result.message;
  });`,
);

const paymentPage = page(
  'Synthetic payment fixture',
  `<h1>Synthetic payment</h1><button type="button">Submit synthetic payment</button>
  <p role="status" aria-live="polite"></p>`,
  `document.querySelector('button').addEventListener('click', async () => {
    const response = await fetch('/api/payment', { method: 'POST' });
    const result = await response.json();
    document.querySelector('[role="status"]').textContent = result.message;
  });`,
);

const timeoutPage = page(
  'Browser timeout fixture',
  `<h1>Browser-only timeout</h1><button type="button">Start local timeout</button>
  <p data-testid="session-state">Signed in</p>`,
  `document.querySelector('button').addEventListener('click', () => {
    window.setTimeout(() => {
      document.querySelector('[data-testid="session-state"]').textContent = 'Timed out';
    }, 300_000);
  });`,
);

export async function startServer(port = 4191) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/__health') return sendJson(response, 200, { ok: true });
    if (url.pathname === '/__payment-count') return sendJson(response, 200, { paymentRequestCount });
    if (url.pathname === '/__reset-payment-count' && request.method === 'POST') {
      paymentRequestCount = 0;
      return sendJson(response, 200, { paymentRequestCount });
    }
    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      return sendJson(response, 200, { saved: true, message: 'Saved by local fixture' });
    }
    if (url.pathname === '/api/payment' && request.method === 'POST') {
      paymentRequestCount += 1;
      return sendJson(response, 201, { message: 'Local fixture received request', paymentRequestCount });
    }
    if (url.pathname === '/payment') return response.end(paymentPage);
    if (url.pathname === '/timeout') return response.end(timeoutPage);
    return response.end(checkoutPage);
  });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  return server;
}

if (basename(process.argv[1] ?? '') === 'server.ts') {
  await startServer();
  console.log('Fixture listening on http://127.0.0.1:4191');
}
