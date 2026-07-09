export const SAMPLE_HTML = `<!doctype html>
<html>
	<head>
		<style>
			body { font-family: system-ui, sans-serif; margin: 2rem; color: #333; }
			.card { border: 1px solid #ddd; border-radius: 12px; padding: 1.5rem; max-width: 26rem; }
			button { background: #6366f1; color: white; border: 0; border-radius: 8px; padding: 0.5rem 1rem; cursor: pointer; }
		</style>
	</head>
	<body>
		<div class="card">
			<h1>preview.html</h1>
			<p>Everything renders in a sandboxed iframe — scripts run, but they can't touch this site.</p>
			<button onclick="this.textContent = 'clicked ' + (++this.dataset.n || (this.dataset.n = 1)) + '×'">
				Try me
			</button>
		</div>
	</body>
</html>
`;
