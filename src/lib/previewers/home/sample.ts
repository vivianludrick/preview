import { registry } from '$lib/registry';

/**
 * The homepage IS a document rendered by the HTML previewer — switch to the
 * editor view and it becomes editable like any other page; edits persist to
 * localStorage. This builds the default document.
 *
 * It must be fully self-contained (it renders inside the sandboxed preview
 * iframe, so the app's theme variables don't reach it) and use target="_top"
 * links so navigation escapes the frame.
 */

// hand-placed so they never collide with the centered content
const scattered: { ext: string; style: string }[] = [
	{ ext: 'md', style: 'top: 24%; left: 10%; transform: rotate(-8deg)' },
	{ ext: 'csv', style: 'top: 11%; left: 34%; transform: rotate(4deg)' },
	{ ext: 'html', style: 'top: 16%; right: 12%; transform: rotate(7deg)' },
	{ ext: 'pdf', style: 'top: 48%; left: 6%; transform: rotate(3deg)' },
	{ ext: 'ppt', style: 'top: 42%; right: 7%; transform: rotate(-6deg)' },
	{ ext: 'docx', style: 'bottom: 20%; left: 16%; transform: rotate(6deg)' },
	{ ext: 'xlsx', style: 'bottom: 13%; right: 17%; transform: rotate(-4deg)' }
];

export function defaultHomeDoc(base: string): string {
	const scatteredLinks = scattered
		.map(
			(s) =>
				`\t<a class="scatter" style="${s.style}" href="${base}/${s.ext}/" target="_top">.${s.ext}</a>`
		)
		.join('\n');

	const cards = registry
		.map(
			(p) => `\t\t<a class="card" href="${base}/${p.ext}/" target="_top"
\t\t   data-search="${p.ext} ${p.name.toLowerCase()} ${p.keywords.join(' ')}">
\t\t\t<span class="card-title">${p.name} <code>/${p.ext}</code></span>
\t\t\t<span class="card-desc">${p.description}</span>
\t\t</a>`
		)
		.join('\n');

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>preview</title>
<style>
	:root {
		--bg: #eff1f5; --surface: #e6e9ef; --border: #ccd0da;
		--fg: #4c4f69; --muted: #6c6f85; --accent: #1e66f5;
	}
	@media (prefers-color-scheme: dark) {
		:root {
			--bg: #24273a; --surface: #1e2030; --border: #363a4f;
			--fg: #cad3f5; --muted: #a5adcb; --accent: #8aadf4;
		}
	}
	* { box-sizing: border-box; margin: 0; }
	html, body { height: 100%; }
	body {
		background: var(--bg); color: var(--fg);
		font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
		overflow-x: hidden;
	}
	.scatter {
		position: absolute; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 1.1rem; color: var(--muted); opacity: .6; text-decoration: none;
		transition: transform .15s, color .15s, opacity .15s;
	}
	.scatter:hover { color: var(--accent); opacity: 1; scale: 1.1; }
	@media (max-width: 768px) { .scatter { display: none; } }
	main {
		min-height: 100%; max-width: 38rem; margin: 0 auto; padding: 4rem 1.5rem;
		display: flex; flex-direction: column; justify-content: center; gap: 2.5rem;
	}
	h1 { font-size: clamp(3.5rem, 10vw, 5.75rem); letter-spacing: -.025em; text-align: center; }
	h1 em { color: var(--accent); font-style: normal; }
	.tagline { text-align: center; color: var(--muted); font-size: 1.2rem; line-height: 1.55; }
	.tagline small { opacity: .7; font-size: .85rem; }
	/* the results drop over the page instead of pushing it, so nothing shifts */
	.search-area { position: relative; }
	.search {
		display: flex; align-items: center; gap: .5rem;
		border: 1px solid var(--border); border-radius: 1rem;
		background: var(--surface); padding: .875rem 1.125rem;
	}
	.search:focus-within { border-color: var(--accent); }
	.search svg { flex-shrink: 0; color: var(--muted); }
	.search input {
		width: 100%; border: 0; background: transparent; color: var(--fg);
		font: inherit; font-size: 1rem; outline: none;
	}
	/* results list: hidden until something is searched; Material 3 Expressive
	   attached items — big radii on the list's outer corners, small on the
	   shared inner edges, 2px seams between items */
	#cards {
		display: none; position: absolute; top: calc(100% + .625rem); left: 0; right: 0;
		flex-direction: column; gap: 2px; max-height: 46vh; overflow-y: auto; z-index: 5;
	}
	#cards.open { display: flex; }
	.card {
		display: block; background: var(--surface); border-radius: 6px;
		padding: .625rem 1rem; text-decoration: none; color: inherit;
		transition: background .15s, border-radius .15s;
	}
	.card.first { border-top-left-radius: 1rem; border-top-right-radius: 1rem; }
	.card.last { border-bottom-left-radius: 1rem; border-bottom-right-radius: 1rem; }
	.card:hover, .card.active { background: color-mix(in srgb, var(--accent) 16%, var(--surface)); }
	.card-title { font-weight: 500; }
	.card-title code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: .75rem; color: var(--muted);
	}
	.card-desc {
		display: block; font-size: .875rem; color: var(--muted);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	#empty {
		display: none; background: var(--surface); border-radius: 1rem;
		padding: .75rem 1rem; font-size: .875rem; color: var(--muted);
	}
</style>
</head>
<body>
${scatteredLinks}
	<main>
		<header>
			<h1>preview<em>*</em></h1>
			<p class="tagline">
				Render files entirely in your browser and share them as self-contained links —
				no server, no uploads, no tracking.<br>
				<small>(psst — this page is a document too: switch to the editor view and change it.)</small>
			</p>
		</header>
		<section class="search-area">
			<label class="search">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>
				</svg>
				<input id="q" type="search" placeholder="file type…" aria-label="Search previewers">
			</label>
			<div id="cards">
${cards}
				<p id="empty">No previewer matches that.</p>
			</div>
		</section>
	</main>
	<script>
		const q = document.getElementById('q');
		const list = document.getElementById('cards');
		const cards = [...document.querySelectorAll('.card')];
		const empty = document.getElementById('empty');
		function filter() {
			const needle = q.value.trim().toLowerCase();
			list.classList.toggle('open', !!needle);
			const hits = [];
			for (const card of cards) {
				const hit = !!needle && card.dataset.search.includes(needle);
				card.style.display = hit ? '' : 'none';
				card.classList.remove('active', 'first', 'last');
				if (hit) hits.push(card);
			}
			if (hits.length) {
				hits[0].classList.add('active', 'first');
				hits[hits.length - 1].classList.add('last');
			}
			empty.style.display = !needle || hits.length ? 'none' : 'block';
		}
		q.addEventListener('input', filter);
		q.addEventListener('keydown', (e) => {
			const target = document.querySelector('.card.active');
			if (e.key === 'Enter' && target) window.open(target.href, '_top');
		});
	</script>
</body>
</html>
`;
}
