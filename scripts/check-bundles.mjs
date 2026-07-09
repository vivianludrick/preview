#!/usr/bin/env node
/**
 * Bundle segregation check (PROJECT.md step 10).
 *
 * Hard requirement: visiting /md must load only the markdown page's code —
 * pdf.js, pptx parsing, CodeMirror, highlight.js must never be in any page's
 * eagerly-loaded module graph; they may only arrive via dynamic import()
 * from their own route.
 *
 * Method: for each prerendered page, collect the JS modules referenced by the
 * HTML (modulepreload + bootstrap imports), walk their *static* imports
 * transitively (dynamic `import(...)` chains are lazy and therefore fine),
 * and assert no reachable file contains a heavy-dependency marker.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const BUILD = resolve(process.cwd(), 'build');

const PAGES = {
	'/': 'index.html',
	'/md/': 'md/index.html',
	'/pdf/': 'pdf/index.html',
	'/ppt/': 'ppt/index.html'
};

// distinctive content markers for each heavy, route-specific dependency
const MARKERS = {
	'pdfjs-dist': /GlobalWorkerOptions/,
	jszip: /JSZip/,
	codemirror: /cm-content/,
	'highlight.js': /\bhljs\b/
};

function findAppDir() {
	// build/_app/immutable
	const dir = join(BUILD, '_app', 'immutable');
	if (!existsSync(dir)) {
		console.error(`✗ ${relative(process.cwd(), dir)} not found — run \`npm run build\` first`);
		process.exit(1);
	}
	return dir;
}

function* walkFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* walkFiles(path);
		else yield path;
	}
}

/** static import specifiers in bundled output: import"..." / from"..." (never dynamic import("...")) */
function staticImports(source) {
	const specs = new Set();
	for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)("(\.{0,2}\/[^"]+)"|'(\.{0,2}\/[^']+)')/g)) {
		specs.add(match[2] ?? match[3]);
	}
	return specs;
}

function eagerGraph(rootFiles) {
	const seen = new Set();
	const queue = [...rootFiles];
	while (queue.length > 0) {
		const file = queue.pop();
		if (seen.has(file) || !existsSync(file)) continue;
		seen.add(file);
		const source = readFileSync(file, 'utf8');
		for (const spec of staticImports(source)) {
			queue.push(resolve(dirname(file), spec));
		}
	}
	return seen;
}

const appDir = findAppDir();

// sanity check: every marker must exist SOMEWHERE in the build, otherwise the
// marker went stale and the check would pass vacuously
const allJs = [...walkFiles(appDir)].filter((f) => f.endsWith('.js'));
for (const [name, marker] of Object.entries(MARKERS)) {
	if (!allJs.some((f) => marker.test(readFileSync(f, 'utf8')))) {
		console.error(`✗ marker for "${name}" (${marker}) matches nothing in the build — update the check`);
		process.exit(1);
	}
}

let failed = false;
for (const [route, htmlPath] of Object.entries(PAGES)) {
	const html = readFileSync(join(BUILD, htmlPath), 'utf8');
	const roots = [...html.matchAll(/_app\/immutable\/[^"'\s)]+\.js/g)].map((m) =>
		join(BUILD, m[0])
	);
	const reachable = eagerGraph(roots);
	const offenders = [];
	for (const file of reachable) {
		const source = readFileSync(file, 'utf8');
		for (const [name, marker] of Object.entries(MARKERS)) {
			if (marker.test(source)) offenders.push(`${name} via ${relative(BUILD, file)}`);
		}
	}
	if (offenders.length > 0) {
		failed = true;
		console.error(`✗ ${route} eagerly loads heavy deps:\n    ${offenders.join('\n    ')}`);
	} else {
		console.log(`✓ ${route} eager graph is clean (${reachable.size} modules)`);
	}
}

if (failed) {
	console.error('\nBundle segregation check FAILED — heavy deps must stay behind dynamic import().');
	process.exit(1);
}
console.log('\nBundle segregation check passed.');
