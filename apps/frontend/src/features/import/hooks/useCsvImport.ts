import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchLibrary } from "@/features/library/service/libraryService";
import { type CsvRow, csvTemplate, parseCsv } from "../lib/csv";
import { importFileSchema } from "../schema/importSchema";
import {
	commitImport,
	type ImportResult,
	type ImportRow,
	previewImport,
} from "../service/importService";
export function useCsvImport() {
	const qc = useQueryClient();
	const [rows, setRows] = useState<
		(CsvRow & { duplicateAction?: "SKIP" | "UPDATE" })[]
	>([]);
	const [fileName, setFileName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [reading, setReading] = useState(false);
	const [progress, setProgress] = useState({ completed: 0, total: 0 });
	const [results, setResults] = useState<ImportResult[]>([]);
	const preview = useMutation({ mutationFn: previewImport, retry: false });
	const commit = useMutation({
		mutationFn: async (selected: { row: ImportRow; index: number }[]) => {
			const collected: ImportResult[] = [];
			setProgress({ completed: 0, total: selected.length });
			for (let offset = 0; offset < selected.length; offset += 10) {
				const batch = selected.slice(offset, offset + 10);
				try {
					const response = await commitImport(batch.map(({ row }) => row));
					for (let localIndex = 0; localIndex < batch.length; localIndex++) {
						const result = response.results.find(
							(item) => item.index === localIndex,
						);
						collected.push(
							result
								? { ...result, index: batch[localIndex].index }
								: {
										index: batch[localIndex].index,
										state: "FAILED",
										error: "A resposta não informou o resultado desta linha.",
									},
						);
					}
				} catch (failure) {
					const message =
						failure instanceof Error
							? failure.message
							: "Falha ao importar este lote.";
					for (const item of batch)
						collected.push({
							index: item.index,
							state: "FAILED",
							error: `${message} Confira a biblioteca antes de repetir este lote.`,
						});
				}
				setResults([...collected]);
				setProgress({ completed: collected.length, total: selected.length });
			}
			return collected;
		},
		retry: false,
		onSuccess: async () => {
			try {
				const library = await fetchLibrary();
				qc.setQueryData(["library"], library);
				for (const game of library)
					qc.setQueryData(["library", game.igdbId], game);
			} catch {
				setError(
					"Importação encerrada. Não foi possível atualizar a biblioteca; recarregue a página para conferir os dados.",
				);
			}
			void qc.invalidateQueries({ queryKey: ["stats"] });
			void qc.invalidateQueries({ queryKey: ["retrospective"] });
			void qc.invalidateQueries({ queryKey: ["campaigns"] });
		},
	});
	async function loadFile(file: File | undefined) {
		if (!file || commit.isPending || reading) return;
		setReading(true);
		setError(null);
		preview.reset();
		commit.reset();
		setRows([]);
		setResults([]);
		setFileName(file.name);
		setProgress({ completed: 0, total: 0 });
		try {
			const validation = importFileSchema.safeParse(file);
			if (!validation.success)
				throw new Error(
					validation.error.issues[0]?.message ?? "Arquivo inválido.",
				);
			const validated = validation.data;
			const nextRows = parseCsv(await validated.text());
			setRows(nextRows);
			await preview.mutateAsync(nextRows);
		} catch (failure) {
			setError(
				failure instanceof Error
					? failure.message
					: "Não foi possível ler este arquivo.",
			);
		} finally {
			setReading(false);
		}
	}
	async function changeRow(
		index: number,
		changes: { igdbId?: number; duplicateAction?: "SKIP" | "UPDATE" },
	) {
		if (commit.isPending) return;
		const updated = rows.map((row, current) =>
			current === index ? { ...row, ...changes } : row,
		);
		setRows(updated);
		setError(null);
		try {
			await preview.mutateAsync(updated);
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : "A prévia falhou.");
		}
	}
	const ready =
		preview.data?.rows
			.filter(
				(item) =>
					item.input?.igdbId &&
					(item.state === "READY" || item.state === "DUPLICATE"),
			)
			.map((item) => ({ row: item.input as ImportRow, index: item.index })) ??
		[];
	const blocked = (preview.data?.rows.length ?? 0) - ready.length;
	function downloadTemplate() {
		const url = URL.createObjectURL(
			new Blob([`\uFEFF${csvTemplate()}`], { type: "text/csv;charset=utf-8" }),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "detonado-modelo.csv";
		anchor.click();
		URL.revokeObjectURL(url);
	}
	return {
		rows,
		fileName,
		error,
		reading,
		preview,
		commit,
		ready,
		blocked,
		progress,
		results,
		loadFile,
		changeRow,
		downloadTemplate,
		start: () => {
			if (
				ready.length &&
				!preview.isPending &&
				!commit.isPending &&
				!commit.isSuccess
			)
				commit.mutate(ready);
		},
	};
}
