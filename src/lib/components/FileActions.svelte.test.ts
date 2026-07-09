// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import FileActions from './FileActions.svelte';
import { saveFileContent, loadFileContent } from '$lib/storage';

vi.mock('$lib/download', () => ({ downloadBlob: vi.fn() }));
import { downloadBlob } from '$lib/download';

beforeEach(() => {
	localStorage.clear();
	vi.mocked(downloadBlob).mockClear();
});

describe('FileActions', () => {
	it('renders nothing while no file is loaded', () => {
		const { container } = render(FileActions, {
			props: { ext: 'pdf', fileName: '', getBytes: () => null, onclear: vi.fn() }
		});
		expect(container.querySelector('[role="toolbar"]')).toBeNull();
	});

	it('clear unloads the document and forgets its stored copy', async () => {
		saveFileContent('pdf', 'a.pdf', new Uint8Array([1, 2]));
		const onclear = vi.fn();
		render(FileActions, {
			props: { ext: 'pdf', fileName: 'a.pdf', getBytes: () => new Uint8Array([1, 2]), onclear }
		});
		await userEvent.click(screen.getByTitle(/clear/i));
		expect(onclear).toHaveBeenCalled();
		expect(loadFileContent('pdf')).toBeNull();
	});

	it('download hands the original bytes back under the original name', async () => {
		const bytes = new Uint8Array([9, 8, 7]);
		render(FileActions, {
			props: { ext: 'xlsx', fileName: 'report.xlsx', getBytes: () => bytes, onclear: vi.fn() }
		});
		await userEvent.click(screen.getByTitle(/download/i));
		expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'report.xlsx');
	});
});
