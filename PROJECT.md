# Preview — Client-Side File Previewer

A fully client-side, serverless website for previewing files. Type or upload on the left, see the rendered result on the right. Shareable via self-contained URLs (compressed, optionally encrypted). Hosted on GitHub Pages.

---

## 1. Product Requirements (PRD)

### 1.1 Goals

- Preview multiple file types (markdown first, then PDF, PPTX, and more) entirely in the browser.
- Zero server. Zero telemetry. No CDN-loaded scripts, fonts, or styles — every byte served comes from our own static build. Only dependencies explicitly authorized in `package.json` are shipped.
- Shareable links that carry the content itself (no storage anywhere), with optional password protection.
- Hosted on GitHub Pages as a static site.

### 1.2 Non-Goals

- No accounts, no persistence beyond the URL and `localStorage` (theme preference).
- No pixel-perfect PPTX fidelity (complex animations/SmartArt may degrade gracefully).
- No collaborative/real-time editing.

### 1.3 Pages & Routes

| Route | Purpose |
|---|---|
| `/` | Homepage: what the site does + a search bar to find a previewer. Selecting one navigates to `/{ext}`. |
| `/md` | Markdown: CodeMirror editor (left) ↔ rendered preview (right). |
| `/pdf` | PDF: upload button (left) ↔ rendered pages (right). |
| `/ppt` | PPTX: upload button (left) ↔ slide view (right) with prev/next arrows and a bottom filmstrip of slide thumbnails. |
| *(future)* `/csv`, `/json`, `/html`, `/svg`, … | Same shell, different editor/preview pair per type. |

Shared content arrives as a query param: `/{ext}?data=<base64url-blob>`.
(Query string chosen over path segment so GitHub Pages resolves the same static file regardless of payload; base64url is query-safe with no percent-encoding.)

**Hard requirement:** visiting `/md` must load *only* the markdown page's code — each route is its own entry/bundle; pdf.js, pptx parsing, etc. must not be downloaded on unrelated pages.

### 1.4 Layout & View Modes

```
________________________________________________________________
| preview.{ext}                 [ ✏️ | ⬛⬛ | 👁️ ]  🔗  |mocha||
----------------------------------------------------------------
|                              |                               |
|            editor            |           previewer           |
|                              |                               |
----------------------------------------------------------------
```

Header (left → right): logo/title `preview.{ext}` · view-mode toggle group · share button (🔗) · theme toggle (catpuccin/rosepine/dracula etc etc served as json files).

Three view modes (segmented control, icons: `pencil`, `square-split-horizontal`, `eye` from lucide):

| Mode | Behavior |
|---|---|
| **Editor** | Editor takes 100% width; preview hidden. |
| **Split** (default) | Editor left 50%, preview right 50%. |
| **Preview** | Preview takes 100% width; editor hidden — read-only viewing, no editing possible. |

For upload-based types (`/pdf`, `/ppt`) the "editor" pane is the upload/file panel; the same three modes apply.

When a page is opened *from a share link(has ?data=<blob>)*, default to **Preview** mode (receiver's primary intent is viewing).

### 1.5 Theming

- Select from the list of themes on the header's drop down, light, dark, catppuccin-latte,catppuccin-mocha, rosepine, dracula, etc served as jsons
- Default: follow `prefers-color-scheme`; explicit user choice overrides and persists in `localStorage`.
- Applied as a `class="dark"` on `<html>` (Tailwind class strategy). No flash of wrong theme: a tiny inline script in `<head>` sets the class before first paint.
- Editor (CodeMirror theme) and preview (typography, code-highlight theme) must both follow the app theme.
- based on the localstorage value fetch the theme json and use the json to apply them to css variables.

### 1.6 Sharing

Pipeline (all client-side):

```
content ──> compress (deflate, fflate) ──┬─(no password)──────────────────────┐
                                         └─(password)──> AES-GCM encrypt ─────┤
                                                          (key = PBKDF2)      ▼
                                                                 base64url ──> /{ext}?data=<blob>
```

Receiver: parse `?data=` → base64url-decode → detect encrypted envelope → (if encrypted) prompt for password → decrypt → decompress → load into the page in Preview mode. Wrong password shows a retry prompt, not a crash.

**Share dialog** (opened from the header 🔗 button, centered modal):

- **Password field** (optional, empty by default) with an ⓘ popover:
  *"Encrypted locally with AES-256-GCM before it ever leaves your browser. If the password is lost the data cannot be recovered — there is no reset."*
- **Generate Link** button — the *only* trigger for computation. Nothing is compressed/encrypted while typing. Clicking runs the pipeline once and fills the link field.
- **Link field** (read-only) + **Copy** button (Clipboard API) with ⓘ:
  *"The link contains your entire document — nothing is uploaded or stored anywhere."*
- **Shorten** button with ⓘ:
  *"Sends the generated link to an external URL-shortening service, which will store it. The content is still compressed/encrypted inside the link; only use this if that tradeoff is acceptable."*
- If the password is edited *after* generating, the link field is marked stale ("Regenerate" state); Copy/Shorten still operate on what's shown, but the stale state is visually obvious.

**Shortening behavior** (explicit opt-in per click, never automatic):

- Fallback chain across multiple free providers (e.g. is.gd → v.gd → 1pt → TinyURL-API → …, exact list finalized during implementation based on current CORS support). Try provider 1; on network failure, CORS block, rate-limit, or size rejection, try the next.
- No password set ⇒ still allowed with no extra confirm (absence of a password is the user's signal the content isn't sensitive).
- If every provider fails: inline non-blocking message ("Couldn't shorten — using full link"); the long URL always remains valid and copyable.
- Known limitation (accepted): providers cap input URLs at roughly 2–8 KB, so shortening will mostly succeed for markdown-sized payloads and fail gracefully for large PDF/PPTX blobs.

### 1.7 Constraints & Quality Bar

- **URL size:** show the generated link's size in the dialog; warn (not block) past ~8 KB and again past ~2 MB (practical browser ceiling).
- **Privacy:** no analytics, no external requests of any kind at runtime *except* the user-initiated shorten call.
- **Performance:** markdown preview re-renders per keystroke (debounced and throttled) and stays smooth on multi-thousand-line documents; heavy work (pdf render, pptx parse, encryption of large blobs) shows progress states, never freezes the UI silently. Load the page first. then let the previewer follow else if using a shared link you can wait for the previewer to load. if not using a shared link directly on /{ext} then load the webpage first so that the user can start typing and load the previewer in the background or asyncly or something like that. no need to freeze the users editing experience. if previewing is taking time show a loader on the preview side only so the user knows that the contents is taking time to get loaded.
- **Keyboard/a11y:** view-mode toggle and dialog are keyboard-navigable; dialog traps focus and closes on `Esc`.

---

## 2. Architecture

### 2.1 Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **SvelteKit** + `@sveltejs/adapter-static`, `prerender = true` everywhere | File-based routing that emits one real static HTML file per route (exactly what GitHub Pages serves); ~2–4 KB runtime vs React's ~40 KB+; compile-time reactivity suits per-keystroke preview updates (no VDOM diff). |
| Styling | **Tailwind CSS** (class-strategy dark mode) | Utility CSS bundled into our own output; no external stylesheets. |
| Icons | **lucide-svelte** | Tree-shaken inline SVGs (`pencil`, `square-split-horizontal`, `eye`, `link`, `moon`, `sun`, `info`, `copy`, `upload`, `chevron-left/right`). No icon fonts, no CDN. |
| Editor | **CodeMirror 6** (`@codemirror/*` modular packages) | Lightweight, npm-only, first-class markdown mode, easy theming. (Monaco rejected: 2–3× heavier, awkward worker self-hosting.) |
| Markdown | **markdown-it** (+ plugins as needed) → HTML string → `{@html}` | Synchronous string-in/string-out fits Svelte and per-keystroke rendering; framework-agnostic. GFM tables/strikethrough/task-lists via plugins; code highlighting via `highlight.js` (bundled, both themes shipped locally). Output sanitized (see 2.6). |
| PDF | **pdfjs-dist** | The only serious pure-client PDF renderer. Worker file bundled as a local static asset via Vite — **never** the CDN worker path from tutorials. |
| PPTX | **JSZip** + slide-XML → HTML/CSS renderer (evaluate `pptx-preview` / pptxjs-style libs first; hand-roll a minimal renderer if they're unmaintained) | No pdf.js-equivalent exists for OOXML; accepted-fidelity approach per Non-Goals. |
| Compression | **fflate** (`deflateSync`/`inflateSync`) | ~8 KB, pure JS, best-in-class speed, consistent cross-browser (vs native `CompressionStream` quirks). |
| Crypto | **Web Crypto API** (`crypto.subtle`) — AES-256-GCM, PBKDF2-SHA-256 key derivation | Native, zero dependencies, zero telemetry. |
| Encoding | base64url (native, URL-safe alphabet `A-Za-z0-9-_`) | Query-string-safe without percent-encoding. |
| State | Svelte runes/stores per page (`viewMode`, `theme`, `content`) | No global state manager needed; there is no server state. |
| Hosting | **GitHub Pages** via GitHub Actions | `paths.base` in `svelte.config.js` set to `/repo-name` (or `''` with a custom domain/CNAME). |

### 2.2 Repository Layout

```
preview/
├── PROJECT.md                     # this file
├── svelte.config.js               # adapter-static, paths.base
├── vite.config.ts
├── tailwind.config.js
├── static/
│   └── pdf.worker.min.mjs         # pdfjs worker, copied from node_modules at build
├── src/
│   ├── app.html                   # inline theme-bootstrap script lives here
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Header.svelte          # title, ViewModeToggle, share + theme buttons
│   │   │   ├── ViewModeToggle.svelte  # editor | split | preview segmented control
│   │   │   ├── SplitLayout.svelte     # the 3-mode pane layout (slots: editor, preview)
│   │   │   ├── ShareDialog.svelte     # password, generate, copy, shorten, ⓘ popovers
│   │   │   ├── PasswordPrompt.svelte  # receiver-side decrypt prompt w/ retry
│   │   │   ├── InfoPopover.svelte     # the ⓘ button + popover
│   │   │   └── ThemeToggle.svelte
│   │   ├── share/
│   │   │   ├── codec.ts           # encode(content, password?) / decode(blob, password?)
│   │   │   ├── crypto.ts          # PBKDF2 + AES-GCM wrap/unwrap
│   │   │   ├── envelope.ts        # binary envelope format (see 2.4)
│   │   │   └── shorten.ts         # provider fallback chain
│   │   ├── stores/
│   │   │   └── theme.ts           # theme store + localStorage persistence
│   │   └── previewers/            # heavy deps live ONLY here, imported ONLY by their route
│   │       ├── markdown/          # markdown-it setup, sanitizer, highlight config
│   │       ├── pdf/               # pdfjs loader + page renderer
│   │       └── ppt/               # pptx parse + slide renderer + filmstrip logic
│   └── routes/
│       ├── +layout.svelte         # theme class, Tailwind css import, Header slotting
│       ├── +page.svelte           # homepage: hero + previewer search
│       ├── md/+page.svelte
│       ├── pdf/+page.svelte
│       └── ppt/+page.svelte
└── .github/workflows/deploy.yml   # build → deploy to Pages
```

**Code-splitting rule:** a previewer's dependencies (`pdfjs-dist`, `jszip`, CodeMirror language packages, `highlight.js`) are imported only inside `src/lib/previewers/<type>/` and only by that route — SvelteKit/Vite then chunks them per-route automatically. CI includes a bundle check (see step 10) to keep this true over time.

### 2.3 Share Codec — Data Flow

```
encode(bytes, password?):
  1. deflate(bytes)                          # fflate, level 9
  2. if password:
       salt   = random 16 B
       key    = PBKDF2(password, salt, 600k iters, SHA-256) → AES-256-GCM key
       iv     = random 12 B
       body   = AES-GCM(key, iv, compressed)
     else:
       body   = compressed
  3. envelope = header ‖ body               # see 2.4
  4. return base64url(envelope)

decode(blob, promptForPassword):
  1. bytes = base64url⁻¹(blob)               # reject malformed input gracefully
  2. parse header → { version, encrypted, salt?, iv? }
  3. if encrypted: password = promptForPassword(); derive key; AES-GCM decrypt
     (auth-tag failure ⇒ wrong password ⇒ re-prompt, bounded retries)
  4. inflate → original bytes → hand to previewer
```

### 2.4 Envelope Format (binary, before base64url)

```
byte 0        magic/version    (0x01)
byte 1        flags            bit0 = encrypted
[if encrypted]
  bytes 2–17  PBKDF2 salt      (16 B)
  bytes 18–29 AES-GCM IV       (12 B)
remaining     payload          (deflated, possibly encrypted, GCM tag appended)
```

Versioned from day one so the format can evolve without breaking old links.

### 2.5 Shorten Provider Chain

```ts
interface Provider {
  name: string;
  maxUrlLength: number;              // skip without a network call if exceeded
  shorten(url: string): Promise<string>;  // throws on any failure
}
// for (const p of providers) { try { return await p.shorten(url) } catch { continue } }
// all failed → typed error → dialog shows non-blocking notice, keeps long URL
```

Each provider call has a short timeout (~7 s). Provider list is a plain array — trivially reorderable/extensible. Use a random provider from the list of providers who allow that specific length of urls.

### 2.6 Security Notes

- **XSS:** markdown-rendered HTML is sanitized before `{@html}` injection — strip script/event-handler/`javascript:` vectors. This is mandatory: share links mean *untrusted* markdown gets rendered in the receiver's browser.
- **Crypto honesty:** PBKDF2 at 600k iterations resists casual brute force, but a weak password on a public link is still weak — the ⓘ copy must not overpromise.
- **`data` never leaves the page:** no logging, no referrer leakage concerns beyond the URL itself; document that anyone with the link has the (encrypted) data.

### 2.7 GitHub Pages Deployment

- `adapter-static` with a `404.html` fallback copy of the app shell (belt-and-braces for deep links; primary routes are real files anyway).
- `paths.base = '/<repo>'` unless a custom domain is configured.
- Workflow: on push to `main` → `npm ci` → `npm run build` → upload `build/` → `actions/deploy-pages`.
- `.nojekyll` in output (adapter handles this) so files/dirs starting with `_` are served.

---

## 3. Implementation Steps

Each step ends in a working, deployable state.

### Step 0 — Scaffold
- `npx sv create` (SvelteKit, TypeScript) → add `adapter-static`, Tailwind, `lucide-svelte`.
- Configure `paths.base`, global `prerender = true`, `.nojekyll`.
- Placeholder pages for `/`, `/md`, `/pdf`, `/ppt`.
- **Done when:** `npm run build` emits a static site that serves locally via `npx serve build`.

### Step 1 — App Shell
- `Header.svelte`, `ViewModeToggle.svelte`, `SplitLayout.svelte`, `ThemeToggle.svelte` + theme store + inline no-flash script.
- Three view modes working with placeholder panes; theme persists and follows system default.
- **Done when:** mode switching and theming work on every route, keyboard-accessible.

### Step 2 — Markdown Previewer (`/md`)
- CodeMirror 6 (markdown mode, theme-synced) in the editor pane.
- markdown-it + GFM plugins + highlight.js + sanitizer in the preview pane; debounced re-render.
- Default sample document on first visit.
- **Done when:** typing updates the preview smoothly; all three modes behave; dark/light restyles both panes and highlighted code.

### Step 3 — Share Codec (no UI yet)
- `envelope.ts`, `crypto.ts`, `codec.ts` with unit tests (Vitest): roundtrip, wrong-password → clean failure, corrupted-blob → clean failure, empty content, multi-MB content.
- **Done when:** tests pass; `encode`/`decode` are pure functions any previewer can call.

### Step 4 — Share Dialog + Receive Flow
- `ShareDialog.svelte`: password field, **Generate Link** (sole computation trigger), link field + size indicator, Copy, stale-after-password-edit state, ⓘ popovers, focus trap, `Esc` to close.
- Receiver path on `/md`: parse `?data=`, `PasswordPrompt.svelte` with bounded retries, load content, default to Preview mode.
- **Done when:** full share → open-in-new-browser → (password →) view loop works for markdown, including the wrong-password and malformed-blob paths.

### Step 5 — URL Shortening
- `shorten.ts` provider chain (finalize the provider list by testing real CORS behavior at implementation time), timeouts, size pre-checks.
- Shorten button in dialog: loading state, success swaps the link field, total-failure shows the inline notice.
- **Done when:** shortening works for small payloads and degrades gracefully (offline, blocked, oversized).

### Step 6 — Homepage
- Hero explaining the product; search bar over the previewer registry (name, extension, description) with keyboard navigation → navigates to `/{ext}`.
- Previewer registry is one data file, so adding a future type updates the homepage automatically.
- **Done when:** searching "markdown" or "md" and hitting Enter lands on `/md`.

### Step 7 — PDF Previewer (`/pdf`)
- Upload panel (file input + drag-and-drop) left; pdf.js-rendered pages right (canvas, lazy page rendering, zoom-to-fit-width).
- Local worker asset; loading/progress state.
- Share support with a size warning for big files.
- **Done when:** a multi-MB PDF renders and scrolls smoothly and never fetches anything remote.

### Step 8 — PPTX Previewer (`/ppt`)
- Evaluate existing pptx-render libs; wire the best or hand-roll minimal (text boxes, images, shapes, backgrounds).
- Main slide view with ←/→ buttons + keyboard arrows; bottom filmstrip of thumbnails (click to jump, active highlighted).
- **Done when:** a typical deck displays with navigable slides and filmstrip; unsupported features degrade visibly but gracefully.

### Step 9 — Deployment
- `deploy.yml` (build + `actions/deploy-pages`), verify `paths.base` on the live site, run the full share loop against the production URL.
- **Done when:** site is live on GitHub Pages and a share link generated there opens correctly there.

### Step 10 — Hardening
- Bundle audit: verify per-route chunks (`/md` must not pull pdfjs, etc.) and add a CI size/segregation check.
- Network audit: DevTools confirms zero runtime requests to third parties except user-initiated shorten calls.
- Edge cases: URL near browser limits, empty content, huge paste, pathological/malicious markdown (XSS suite), corrupted uploads.
- a11y pass: focus order, ARIA on toggle group/dialog, contrast in both themes.

### Future (backlog)
- More previewers: `/csv`, `/json`, `/html`, `/svg`, `/docx`, `/xlsx` — each is a new `previewers/<type>/` + route + registry entry.
- "Download original file" on receiver side.
- PWA/offline support (site already has no runtime network needs).
- Optional native `CompressionStream` path when browser support/behavior is uniform.
