# Browser smoke test

Runs the main flows (home, course map in light and dark, placement test, AI lesson, AI course)
against the exported web build with the AI server mocked, and saves screenshots.

```bash
# from feynmanmind/
npx expo export --platform web            # → dist/
cd scripts/e2e && npm install             # playwright only; uses the preinstalled Chromium in cloud sessions
node serve.js ../../dist 8123 &           # static server with SPA fallback
CHROMIUM_PATH=/opt/pw-browsers/chromium node smoke.js screenshots
```

Exit code 0 means every check passed and no page errors were thrown.
Leave `CHROMIUM_PATH` unset on a machine where Playwright downloaded its own browser.
