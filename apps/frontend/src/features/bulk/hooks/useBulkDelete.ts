import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { removeLibraryEntry } from "@/features/detail/service/detailService";
import { fetchLibrary } from "@/features/library/service/libraryService";
import { rememberResponse } from "@/lib/offlineStore";
import type { LibraryEntry, User } from "@/types/api";

type Game = Pick<LibraryEntry, "id" | "igdbId" | "name">;
type Snapshot = { games: Game[]; ownerId: string };
type Result = Game & { removed: boolean; error?: string };

export function useBulkDelete(selected: LibraryEntry[]) {
	const qc = useQueryClient();
	const [preview, setPreview] = useState<Snapshot | null>(null);
	const [progress, setProgress] = useState(0);
	const [cacheError, setCacheError] = useState<string | null>(null);
	const ownerId = () => qc.getQueryData<User | null>(["me"])?.id;
	const previewCurrent =
		!!preview &&
		preview.ownerId === ownerId() &&
		preview.games.length === selected.length &&
		preview.games.every((game) =>
			selected.some((current) => current.id === game.id),
		);
	const mutation = useMutation({
		retry: false,
		mutationFn: async (snapshot: Snapshot) => {
			const results: Result[] = [];
			let stopped: string | undefined;
			for (const game of snapshot.games) {
				if (ownerId() !== snapshot.ownerId)
					stopped = "A conta mudou; exclusão interrompida.";
				if (stopped) {
					results.push({ ...game, removed: false, error: stopped });
					continue;
				}
				try {
					await removeLibraryEntry(game.id);
					results.push({ ...game, removed: true });
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: "Não foi possível excluir.";
					results.push({ ...game, removed: false, error: message });
					const status =
						error && typeof error === "object" && "status" in error
							? error.status
							: undefined;
					if (
						error instanceof TypeError ||
						status === 401 ||
						status === 403 ||
						status === 429
					)
						stopped =
							"Operação interrompida. Confira a conexão e a sessão antes de tentar novamente.";
				}
				if (ownerId() === snapshot.ownerId) setProgress(results.length);
			}
			return results;
		},
		onSuccess: async (results, snapshot) => {
			if (ownerId() !== snapshot.ownerId) return;
			setPreview(null);
			await qc.cancelQueries({ queryKey: ["library"] });
			if (ownerId() !== snapshot.ownerId) return;
			const removed = results.filter((result) => result.removed);
			const ids = new Set(removed.map((game) => game.id));
			qc.setQueryData<LibraryEntry[]>(["library"], (current) =>
				current?.filter((game) => !ids.has(game.id)),
			);
			for (const game of removed) {
				qc.removeQueries({ queryKey: ["library", game.igdbId], exact: true });
				for (const kind of [
					"sessions",
					"journal",
					"campaigns",
					"checklist",
					"sources",
				])
					qc.removeQueries({ queryKey: [kind, game.id] });
			}
			// A cached offline response must not bring back a confirmed deletion.
			try {
				const library = (await fetchLibrary()).filter(
					(game) => !ids.has(game.id),
				);
				if (ownerId() !== snapshot.ownerId) return;
				qc.setQueryData(["library"], library);
			} catch {
				if (ownerId() === snapshot.ownerId)
					setCacheError(
						"Exclusões processadas. Não foi possível atualizar a biblioteca; confira os resultados abaixo e tente recarregar.",
					);
			}
			if (ownerId() !== snapshot.ownerId) return;
			const library = qc.getQueryData<LibraryEntry[]>(["library"]);
			if (library)
				await rememberResponse("/library", library, snapshot.ownerId).catch(
					() => undefined,
				);
			if (ownerId() !== snapshot.ownerId) return;
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["library"], refetchType: "none" }),
				qc.invalidateQueries({ queryKey: ["stats"] }),
				qc.invalidateQueries({ queryKey: ["retrospective"] }),
				qc.invalidateQueries({ queryKey: ["organization"] }),
			]);
		},
	});
	return {
		preview,
		previewCurrent,
		progress,
		mutation,
		cacheError,
		review: () => {
			const owner = ownerId();
			if (
				!owner ||
				!selected.length ||
				selected.length > 100 ||
				mutation.isPending
			)
				return;
			mutation.reset();
			setCacheError(null);
			setProgress(0);
			setPreview({
				ownerId: owner,
				games: selected.map(({ id, igdbId, name }) => ({ id, igdbId, name })),
			});
		},
		cancel: () => {
			if (!mutation.isPending) setPreview(null);
		},
		apply: () => {
			if (preview && previewCurrent && !mutation.isPending)
				mutation.mutate(preview);
		},
	};
}
