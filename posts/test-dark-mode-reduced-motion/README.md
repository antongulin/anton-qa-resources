# Test dark mode and reduced motion in Playwright

Practice app for the forthcoming [anton.qa article](https://www.anton.qa/blog/posts/test-dark-mode-reduced-motion).
Emulate a dark color scheme and a reduced-motion preference, then assert the styles the browser
actually rendered instead of trusting a `matchMedia` flag.

## Setup

Use Node.js 24 LTS and npm. Node.js 22.18 or newer also supports this example.
Dependencies are pinned to preserve the article's behavior.

```bash
git clone https://github.com/antongulin/anton-qa-resources.git
cd anton-qa-resources/posts/test-dark-mode-reduced-motion
npm ci
npx playwright install chromium
npm run serve
```

Open http://127.0.0.1:4193. The page shows a theme card and an animated notice.
Stop the server with Ctrl+C before running automated tests.
On Linux, use `npx playwright install --with-deps chromium` if browser libraries are missing.

## Run the checks

```bash
npm test
npm run verify
```

`npm test` passes against the corrected page. `npm run verify` runs the same three checks against
the corrected page and two deliberately broken variants, and exits successfully only when every
result is expected:

1. The light default stays light with normal motion.
2. `colorScheme: 'dark'` renders the dark card: `rgb(16, 20, 24)` surface, `rgb(244, 246, 248)`
   text, `rgb(138, 180, 248)` border.
3. `reducedMotion: 'reduce'` renders a `0s` transition duration and the reduced-motion flag.

Each preference-specific check asserts the emulated `matchMedia` flag is true before checking
computed styles; the light baseline asserts the dark-scheme flag is false. The broken variants keep
the flag true while dropping the matching CSS rule, so a flag-only test would still pass and only
the rendered-style assertion catches the defect.

To watch a deliberate failure on macOS or Linux:

```bash
APP_VARIANT=css-stuck npm test
```

That run must exit with status 1 because the card stays light. `APP_VARIANT=motion-stuck npm test`
must exit with status 1 because the transition stays at `2s`.
On PowerShell, set `$env:APP_VARIANT="css-stuck"` before testing and remove it afterward.

## What the example proves

`page.emulateMedia` alone reports the preference but never proves a page honours it. Reading
`getComputedStyle` proves the rendered result. The verifier also checks the failure message names
the value actually rendered, so a broken fixture cannot pass for the wrong reason.

## Limits

All colors, text, and motion values are synthetic test tokens. This is a behavior check for one
page, not a full accessibility audit: it does not measure real contrast ratios against WCAG,
check every component, verify images or fonts, or replace manual review with assistive technology.
Chromium is the tested engine. Emulation matches a media preference; it does not change the
operating system setting.

The app listens only on `127.0.0.1`, uses synthetic data, and requires no credentials or external
services. It writes no files. Package installation and the browser download need internet access.

## License

Example code uses the MIT license. See the repository [LICENSE](../../LICENSE).
