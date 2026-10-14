export const CSV_HEADERS = [
	"igdbId",
	"name",
	"status",
	"userPlatform",
	"hoursPlayed",
	"rating",
	"notes",
	"completionGoal",
	"completedAt",
] as const;
export type CsvRow = Partial<
	Record<(typeof CSV_HEADERS)[number], string | number>
>;
export function parseCsv(text: string): CsvRow[] {
	const source = text.replace(/^\uFEFF/, "");
	const records: string[][] = [];
	let record: string[] = [],
		field = "",
		quoted = false,
		closedQuote = false;
	function pushField() {
		record.push(field);
		field = "";
		closedQuote = false;
	}
	function pushRecord() {
		pushField();
		if (record.some((value) => value.trim() !== "")) records.push(record);
		record = [];
		if (records.length > 101)
			throw new Error("O arquivo deve ter no máximo 100 jogos.");
	}
	for (let index = 0; index < source.length; index++) {
		const character = source[index];
		if (quoted) {
			if (character === '"') {
				if (source[index + 1] === '"') {
					field += '"';
					index++;
				} else {
					quoted = false;
					closedQuote = true;
				}
			} else field += character;
			continue;
		}
		if (character === '"') {
			if (field !== "" || closedQuote)
				throw new Error("Aspas fora do início de um campo CSV.");
			quoted = true;
		} else if (character === ",") pushField();
		else if (character === "\n" || character === "\r") {
			if (character === "\r" && source[index + 1] === "\n") index++;
			pushRecord();
		} else {
			if (closedQuote) {
				if (character === " " || character === "\t") continue;
				throw new Error("Conteúdo depois do fechamento de aspas CSV.");
			}
			field += character;
		}
	}
	if (quoted) throw new Error("O arquivo tem um campo com aspas não fechadas.");
	if (field !== "" || record.length || closedQuote) pushRecord();
	const header = records.shift()?.map((value) => value.trim());
	if (!header?.length) throw new Error("O arquivo está vazio.");
	if (new Set(header).size !== header.length)
		throw new Error("Há cabeçalhos duplicados no arquivo.");
	if (!header.includes("igdbId") && !header.includes("name"))
		throw new Error("Inclua o cabeçalho igdbId ou name.");
	const unsupported = header.filter(
		(value) => !(CSV_HEADERS as readonly string[]).includes(value),
	);
	if (unsupported.length)
		throw new Error(`Cabeçalho desconhecido: ${unsupported.join(", ")}.`);
	if (!records.length)
		throw new Error("Inclua pelo menos um jogo abaixo dos cabeçalhos.");
	return records.map((values, index) => {
		if (values.length !== header.length)
			throw new Error(
				`Registro ${index + 1}: quantidade de campos diferente do cabeçalho.`,
			);
		const row: CsvRow = {};
		for (let column = 0; column < header.length; column++) {
			const key = header[column] as (typeof CSV_HEADERS)[number];
			const value = key === "notes" ? values[column] : values[column]?.trim();
			if (value === undefined || value === "") continue;
			row[key] = value;
		}
		return row;
	});
}
export function escapeCsv(value: string | number) {
	const text = String(value);
	return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function csvTemplate() {
	return [
		CSV_HEADERS.join(","),
		[
			"",
			"Nome do jogo",
			"BACKLOG",
			"",
			"",
			"",
			"Onde parei, sem perder as notas",
			"MAIN",
			"",
		]
			.map(escapeCsv)
			.join(","),
	].join("\r\n");
}
