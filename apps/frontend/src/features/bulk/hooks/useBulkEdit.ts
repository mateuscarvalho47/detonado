import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { fetchLibrary } from "@/features/library/service/libraryService";
import { useOrganization } from "@/features/organization/hooks/useOrganization";
import type { LibraryEntry } from "@/types/api";
import { type BulkValues, bulkSchema } from "../schema/bulkSchema";
import {
	type BulkChanges,
	type BulkPayload,
	updateLibraryBulk,
} from "../service/bulkService";
export interface BulkPreview {
	payload: BulkPayload;
	names: Record<string, string>;
	fingerprint: string;
}
export function useBulkEdit(selected: LibraryEntry[]) {
	const qc = useQueryClient();
	const organization = useOrganization();
	const [preview, setPreview] = useState<BulkPreview | null>(null);
	const [cacheError, setCacheError] = useState<string | null>(null);
	const form = useForm<BulkValues>({
		resolver: zodResolver(bulkSchema),
		defaultValues: {
			applyStatus: false,
			status: "BACKLOG",
			applyPlatform: false,
			userPlatform: "",
			applyTags: false,
			tagIds: [],
		},
	});
	const values = form.watch();
	const currentIds = selected.map((game) => game.id);
	const previewCurrent =
		!!preview &&
		preview.fingerprint === JSON.stringify(values) &&
		preview.payload.ids.length === currentIds.length &&
		preview.payload.ids.every((id) => currentIds.includes(id));
	const mutation = useMutation({
		mutationFn: (snapshot: BulkPreview) => updateLibraryBulk(snapshot.payload),
		retry: false,
		onSuccess: async () => {
			setPreview(null);
			setCacheError(null);
			try {
				const library = await fetchLibrary();
				qc.setQueryData(["library"], library);
				for (const game of library)
					qc.setQueryData(["library", game.igdbId], game);
			} catch {
				setCacheError(
					"As alterações foram processadas. Recarregue a biblioteca para conferir os dados atualizados.",
				);
			}
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["library"], refetchType: "none" }),
				qc.invalidateQueries({ queryKey: ["stats"] }),
				qc.invalidateQueries({ queryKey: ["retrospective"] }),
				qc.invalidateQueries({ queryKey: ["organization"] }),
				qc.invalidateQueries({ queryKey: ["campaigns"] }),
			]);
		},
	});
	const onSubmit = form.handleSubmit((parsed) => {
		if (!selected.length || selected.length > 100) {
			form.setError("root", {
				message: "Selecione entre 1 e 100 jogos visíveis.",
			});
			return;
		}
		const changes: BulkChanges = {};
		if (parsed.applyStatus) changes.status = parsed.status;
		if (parsed.applyPlatform)
			changes.userPlatform = parsed.userPlatform || null;
		if (parsed.applyTags) changes.tagIds = parsed.tagIds;
		mutation.reset();
		setPreview({
			payload: { ids: selected.map((game) => game.id), changes },
			names: Object.fromEntries(selected.map((game) => [game.id, game.name])),
			fingerprint: JSON.stringify(values),
		});
	});
	return {
		form,
		values,
		organization,
		preview,
		previewCurrent,
		mutation,
		cacheError,
		onSubmit,
		cancelPreview: () => setPreview(null),
		apply: () => {
			if (preview && previewCurrent && !mutation.isPending)
				mutation.mutate(preview);
		},
	};
}
