import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { fetchLibrary } from "@/features/library/service/libraryService";
import {
	commitImport,
	type ImportResult,
	type ImportRow,
} from "../service/importService";
export function useImportBatch() {
	const qc = useQueryClient();
	const [progress, setProgress] = useState({ completed: 0, total: 0 });
	const [results, setResults] = useState<ImportResult[]>([]);
	const [cacheError, setCacheError] = useState<string | null>(null);
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
				setCacheError(
					"Importação encerrada. Não foi possível atualizar a biblioteca; recarregue a página para conferir os dados.",
				);
			}
			void qc.invalidateQueries({ queryKey: ["stats"] });
			void qc.invalidateQueries({ queryKey: ["retrospective"] });
			void qc.invalidateQueries({ queryKey: ["campaigns"] });
		},
	});
	const reset = useCallback(() => {
		commit.reset();
		setProgress({ completed: 0, total: 0 });
		setResults([]);
		setCacheError(null);
	}, [commit.reset]);
	return {
		commit,
		progress,
		results,
		cacheError,
		reset,
	};
}
