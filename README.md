# preview

A fully client-side, serverless file previewer. Type or upload on the left, see the rendered
result on the right. Share documents as **self-contained URLs** — the content is deflate-compressed
(and optionally AES-256-GCM encrypted) into the link itself. Nothing is ever uploaded or stored.

- `/md` — Markdown: CodeMirror editor ↔ live GFM preview (tables, task lists, highlighted code)
- `/pdf` — PDF: upload ↔ pdf.js-rendered pages (lazy, fit-width, local worker)
- `/ppt` — PPTX: upload ↔ slide view with arrows + thumbnail filmstrip

Zero server, zero telemetry, zero CDN: every byte served comes from this repo's static build.
The only runtime network request is the explicitly user-initiated link shortening.

See [PROJECT.md](./PROJECT.md) for the full product requirements and architecture.

## Development

```sh
npm install
npm run dev            # dev server
npm test               # share-codec unit tests (roundtrip, wrong password, corrupted blobs, …)
npm run build          # static site → build/
npx serve build        # serve the production build locally
npm run check:bundles  # verify heavy deps (pdf.js, JSZip, CodeMirror, hljs) stay per-route
```

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`
(`BASE_PATH=/<repo>` is injected there; local builds use `''` so `npx serve build` just works).
One-time setup: repo **Settings → Pages → Source → GitHub Actions**.

## Share-link format

```
content → deflate (fflate) → [AES-256-GCM, key = PBKDF2-SHA-256 × 600k] → versioned binary envelope → base64url → /{ext}?data=<blob>
```

Anyone with the link has the (encrypted) data; a lost password is unrecoverable by design.
