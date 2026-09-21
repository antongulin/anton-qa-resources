import { createServer } from 'node:http';
import { basename } from 'node:path';

type Variant = 'correct' | 'css-stuck' | 'motion-stuck';

const themeBase = `
:root { color-scheme: light dark; --paper: #ffffff; --ink: #171717; --accent: #0b57d0; }
body { background: var(--paper); color: var(--ink); }
.card { background: var(--paper); color: var(--ink); border: 1px solid var(--accent); }
`;

const themeDark = `
@media (prefers-color-scheme: dark) { :root { --paper: #101418; --ink: #f4f6f8; --accent: #8ab4f8; } }
`;

const motionBase = `
.banner { transition: opacity 2s linear; opacity: 1; }
.banner.is-hidden { opacity: 0; }
`;

const motionReduced = `
@media (prefers-reduced-motion: reduce) {
  .banner { transition: none; }
  .banner.is-hidden { opacity: 0; }
  .banner-flag::after { content: "reduced"; }
}
`;

// Both broken variants keep the media query text absent so the emulation flag is
// still honoured but no rule applies it. A flag-only test would pass; the
// rendered-style assertions must fail.
function stylesFor(variant: Variant) {
  const theme = variant === 'css-stuck' ? themeBase : themeBase + themeDark;
  const motion = variant === 'motion-stuck' ? motionBase : motionBase + motionReduced;
  return theme + motion;
}

function page(variant: Variant) {
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Synthetic theme settings</title>
<style>${stylesFor(variant)}</style>
<body><main>
<h1>Synthetic settings</h1>
<section class="card" data-testid="card">
  <p>Theme preview card. Color and contrast are synthetic test values only.</p>
</section>
<button type="button" data-testid="dismiss">Dismiss notice</button>
<p class="banner" data-testid="banner">Animated notice: transition is synthetic.</p>
<p class="banner-flag" data-testid="banner-flag">unreduced</p>
</main>
<script>
document.querySelector('[data-testid="dismiss"]').addEventListener('click', () => {
  document.querySelector('[data-testid="banner"]').classList.add('is-hidden');
});
</script></body></html>`;
}

export async function startServer(port = 4193) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const variant = url.searchParams.get('variant');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(page(variant === 'css-stuck' || variant === 'motion-stuck' ? variant : 'correct'));
  });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  return server;
}

if (basename(process.argv[1] ?? '') === 'server.ts') {
  await startServer();
  console.log('Fixture listening on http://127.0.0.1:4193');
}
