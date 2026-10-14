import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { localDateTime } from "@/features/sessions/lib/sessionTime";
import { useExpiryClock } from "@/shared/hooks/useExpiryClock";
import type { GameSource, LibraryEntry } from "@/types/api";
import { type SourceValues, sourceSchema } from "../schema/sourceSchema";
import {
	createSource,
	deleteSource,
	fetchSources,
	type SourcePayload,
	updateSource,
} from "../service/sourceService";

const DEFAULT_SOURCE: SourceValues = {
	kind: "STORE",
	label: "",
	expiresAt: "",
};
export function useSources(game: LibraryEntry) {
	const qc = useQueryClient();
	const query = useQuery({
		queryKey: ["sources", game.id],
		queryFn: () => fetchSources(game.id),
	});
	const form = useForm<SourceValues>({
		resolver: zodResolver(sourceSchema),
		defaultValues: DEFAULT_SOURCE,
	});
	const [editing, setEditing] = useState<GameSource | null>(null);
	const [deleting, setDeleting] = useState<GameSource | null>(null);
	const expirations = useMemo(
		() => query.data?.sources.map((source) => source.expiresAt) ?? [],
		[query.data],
	);
	const now = useExpiryClock(expirations, query.isSuccess);
	const mutation = useMutation({
		mutationFn: (
			action:
				| { type: "create"; payload: SourcePayload }
				| { type: "update"; id: string; payload: SourcePayload }
				| { type: "delete"; id: string },
		) => {
			if (action.type === "delete")
				return deleteSource(game.id, action.id).then(() => undefined);
			if (action.type === "update")
				return updateSource(game.id, action.id, action.payload);
			return createSource(game.id, action.payload);
		},
		onSuccess: (saved, action) => {
			const current =
				qc.getQueryData<{ sources: GameSource[] }>(["sources", game.id])
					?.sources ??
				game.sources ??
				[];
			const next =
				action.type === "delete"
					? current.filter((source) => source.id !== action.id)
					: saved
						? [...current.filter((source) => source.id !== saved.id), saved]
						: current;
			const data = { sources: next };
			qc.setQueryData(["sources", game.id], data);
			qc.setQueryData(
				["library", game.igdbId],
				(entry: LibraryEntry | undefined) =>
					entry ? { ...entry, sources: data.sources } : entry,
			);
			qc.setQueryData<LibraryEntry[]>(["library"], (list) =>
				list?.map((entry) =>
					entry.id === game.id ? { ...entry, sources: data.sources } : entry,
				),
			);
			if (action.type !== "delete" || action.id === editing?.id) {
				setEditing(null);
				form.reset(DEFAULT_SOURCE);
			}
			setDeleting(null);
		},
	});
	function edit(source: GameSource | null) {
		setEditing(source);
		mutation.reset();
		form.reset(
			source
				? {
						kind: source.kind,
						label: source.label,
						expiresAt: source.expiresAt ? localDateTime(source.expiresAt) : "",
					}
				: DEFAULT_SOURCE,
		);
	}
	return {
		query,
		form,
		mutation,
		editing,
		edit,
		deleting,
		setDeleting,
		now,
		onSubmit: form.handleSubmit((values) => {
			const payload = {
				kind: values.kind,
				label: values.label,
				expiresAt: values.expiresAt
					? new Date(values.expiresAt).toISOString()
					: null,
			};
			mutation.mutate(
				editing
					? { type: "update", id: editing.id, payload }
					: { type: "create", payload },
			);
		}),
		confirmDelete: () => {
			if (deleting) mutation.mutate({ type: "delete", id: deleting.id });
		},
	};
}
