# Browser E2E

The Playwright suite uses mocked API responses so it can run without backend secrets.

Local setup:

```bash
cd frontend
npm install
npm run test:e2e:install
npm run test:e2e
```

CI setup:

```bash
cd frontend
npm ci
npm run test:e2e:install
npm run test:e2e
```

On Linux, `--with-deps` may require sudo because Chromium needs system libraries.
