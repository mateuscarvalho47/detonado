import { describe, expect, it } from "vitest";
import { csvTemplate, escapeCsv, parseCsv } from "./csv";

describe("CSV import parsing", () => {
	it("supports BOM, CRLF, commas, escaped quotes and multiline quoted fields", () => {
		const rows = parseCsv(
			'\uFEFFigdbId,name,notes,hoursPlayed\r\n1,"Game, One","Parei no ""castelo""\r\nVoltar amanhã",1.5\r\n',
		);
		expect(rows).toEqual([
			{
				igdbId: "1",
				name: "Game, One",
				notes: 'Parei no "castelo"\r\nVoltar amanhã',
				hoursPlayed: "1.5",
			},
		]);
	});
	it("omits empty cells so partial updates preserve existing metadata", () => {
		expect(parseCsv("igdbId,status,hoursPlayed,rating,notes\n1,,0,0,")).toEqual(
			[{ igdbId: "1", hoursPlayed: "0", rating: "0" }],
		);
	});
	it.each([
		["name,name\na,b", /duplicados/],
		["status\nPLAYING", /igdbId ou name/],
		["name,unsupported\nGame,x", /desconhecido/],
		["name,notes\nGame", /quantidade/],
		['name\n"Game', /não fechadas/],
		['name\n"Game"bad', /depois/],
		['name\nGame"bad', /Aspas/],
		["name", /pelo menos um/],
	])("rejects malformed CSV %s", (input, error) => {
		expect(() => parseCsv(input)).toThrow(error);
	});
	it("accepts exactly 100 games and rejects larger files", () => {
		expect(
			parseCsv(
				`name\n${Array.from({ length: 100 }, (_, index) => `Game ${index}`).join("\n")}`,
			),
		).toHaveLength(100);
		expect(() =>
			parseCsv(
				`name\n${Array.from({ length: 101 }, (_, index) => `Game ${index}`).join("\n")}`,
			),
		).toThrow(/100 jogos/);
	});
	it("produces a downloadable template and escapes quoted fields", () => {
		expect(parseCsv(csvTemplate())[0]).toMatchObject({
			name: "Nome do jogo",
			notes: "Onde parei, sem perder as notas",
		});
		expect(escapeCsv('Game, "one"')).toBe('"Game, ""one"""');
	});
});

it("preserves hexadecimal ID input so backend validation can reject it", () => {
	expect(parseCsv("igdbId\n0x10")).toEqual([{ igdbId: "0x10" }]);
});
