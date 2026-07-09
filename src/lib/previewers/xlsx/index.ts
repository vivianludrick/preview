import * as XLSX from 'xlsx';

export interface Sheet {
	name: string;
	rows: string[][];
	truncated: boolean;
}

export interface Workbook {
	sheets: Sheet[];
}

const MAX_ROWS = 2_000;

export function parseWorkbook(bytes: Uint8Array): Workbook {
	const workbook = XLSX.read(bytes, { type: 'array', dense: true });
	const sheets: Sheet[] = workbook.SheetNames.map((name) => {
		const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
			header: 1,
			raw: false,
			defval: ''
		}) as string[][];
		return {
			name,
			rows: rows.slice(0, MAX_ROWS).map((row) => row.map((cell) => String(cell ?? ''))),
			truncated: rows.length > MAX_ROWS
		};
	});
	if (sheets.length === 0) throw new Error('workbook has no sheets');
	return { sheets };
}
