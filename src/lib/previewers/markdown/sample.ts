export const SAMPLE_DOCUMENT = `# Welcome to preview.md

Everything you type here renders live on the right — **entirely in your browser**.
No server, no telemetry, no uploads.

## Features

- GitHub-flavored markdown: tables, ~~strikethrough~~, task lists
- Code highlighting via highlight.js
- Shareable links that *contain the document itself*, optionally password-protected

## Try it

| Feature | Status |
| --- | --- |
| Live preview | ✅ |
| Dark & light themes | ✅ |
| Encrypted share links | ✅ |

- [x] Open preview.md
- [ ] Write something brilliant
- [ ] Hit the 🔗 button in the header to share it

\`\`\`ts
// share pipeline, all client-side
const blob = await encodeShare(content, password);
const url = \`\${location.origin}\${location.pathname}?data=\${blob}\`;
\`\`\`

> The link **is** the document. Anyone who has it can read it —
> add a password and it's encrypted with AES-256-GCM before it leaves your browser.
`;
