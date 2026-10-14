import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { type CsvRow, csvTemplate, parseCsv } from "../lib/csv";
import { importFileSchema } from "../schema/importSchema";
import { type ImportRow, previewImport } from "../service/importService";
import { useImportBatch } from "./useImportBatch";
export function useCsvImport() {
	const [rows, setRows] = useState<
		(CsvRow & { duplicateAction?: "SKIP" | "UPDATE" })[]
	>([]);
	const [fileName, setFileName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [reading, setReading] = useState(false);
	const preview = useMutation({ mutationFn: previewImport, retry: false });
	const batch = useImportBatch();
	const { commit, progress, results } = batch;
	async function loadFile(file: File | undefined) {
		if (!file || commit.isPending || reading) return;
		setReading(true);
		setError(null);
		preview.reset();
		batch.reset();
		setRows([]);
		setFileName(file.name);
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
		error: error ?? batch.cacheError,
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
