import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { compareQueue } from "@/shared/lib/queueOrder";
import type { LibraryEntry } from "@/types/api";
import {
	addToLibrary,
	fetchLibrary,
	moveInQueue,
} from "../service/libraryService";

export function useLibrary(opts?: { enabled?: boolean }) {
	return useQuery<LibraryEntry[]>({
		queryKey: ["library"],
		queryFn: fetchLibrary,
		enabled: opts?.enabled,
	});
}

export function useAddToLibrary() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: addToLibrary,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["library"] });
			qc.invalidateQueries({ queryKey: ["stats"] });
		},
	});
}

export function useMoveInQueue() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) =>
			moveInQueue(id, direction),
		onMutate: async ({ id, direction }) => {
			await qc.cancelQueries({ queryKey: ["library"] });
			const previous = qc.getQueryData<LibraryEntry[]>(["library"]);
			if (!previous) return { previous };
			const queue = previous
				.filter((entry) => entry.status === "BACKLOG")
				.sort(compareQueue);
			const index = queue.findIndex((entry) => entry.id === id);
			const target = direction === "up" ? index - 1 : index + 1;
			if (index < 0 || target < 0 || target >= queue.length)
				return { previous };
			const ordered = queue.map((entry) => entry.id);
			const current = ordered[index];
			const neighbor = ordered[target];
			if (!current || !neighbor) return { previous };
			ordered[index] = neighbor;
			ordered[target] = current;
			const position = new Map(ordered.map((entryId, i) => [entryId, i + 1]));
			qc.setQueryData<LibraryEntry[]>(
				["library"],
				previous.map((entry) => {
					const next = position.get(entry.id);
					return next === undefined ? entry : { ...entry, queuePosition: next };
				}),
			);
			return { previous };
		},
		onError: (_error, _variables, context) => {
			if (context?.previous) qc.setQueryData(["library"], context.previous);
		},
		onSettled: () => {
			void qc.invalidateQueries({ queryKey: ["library"] });
		},
	});
}
