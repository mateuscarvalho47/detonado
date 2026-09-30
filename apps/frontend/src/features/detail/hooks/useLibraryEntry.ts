import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { LibraryEntry } from "@/types/api";
import {
	fetchLibraryEntry,
	type LibraryEntryPatch,
	refreshLibraryHltb,
	removeLibraryEntry,
	updateLibraryEntry,
} from "../service/detailService";

export function useLibraryEntry(igdbId: number) {
	const qc = useQueryClient();
	return useQuery<LibraryEntry>({
		queryKey: ["library", igdbId],
		queryFn: async () => {
			const cached = qc.getQueryData<LibraryEntry[]>(["library"]);
			if (cached) {
				const entry = cached.find((e) => e.igdbId === igdbId);
				if (entry) return entry;
			}
			return fetchLibraryEntry(igdbId);
		},
		initialData: () =>
			qc
				.getQueryData<LibraryEntry[]>(["library"])
				?.find((e) => e.igdbId === igdbId),
		initialDataUpdatedAt: () => qc.getQueryState(["library"])?.dataUpdatedAt,
	});
}

function writeLibraryEntry(
	qc: QueryClient,
	igdbId: number,
	updated: LibraryEntry,
) {
	qc.setQueryData(["library", igdbId], updated);
	qc.setQueryData<LibraryEntry[]>(["library"], (list) =>
		list?.map((entry) => (entry.id === updated.id ? updated : entry)),
	);
}

export function useUpdateLibraryEntry(id: string, igdbId: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: LibraryEntryPatch) => updateLibraryEntry(id, data),
		onSuccess: (updated) => {
			writeLibraryEntry(qc, igdbId, updated);
			qc.invalidateQueries({ queryKey: ["library"] });
			qc.invalidateQueries({ queryKey: ["stats"] });
		},
	});
}

export function useRefreshLibraryHltb(id: string, igdbId: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => refreshLibraryHltb(id),
		onSuccess: (updated) => {
			writeLibraryEntry(qc, igdbId, updated);
			qc.invalidateQueries({ queryKey: ["library"] });
		},
	});
}

export function useRemoveLibraryEntry(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => removeLibraryEntry(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["library"] });
			qc.invalidateQueries({ queryKey: ["stats"] });
		},
	});
}
