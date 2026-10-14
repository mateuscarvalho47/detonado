import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { fetchCampaigns } from "@/features/campaigns/service/campaignService";
import { localDateTime } from "@/features/sessions/lib/sessionTime";
import type { LibraryEntry } from "@/types/api";
import { type JournalValues, journalSchema } from "../schema/journalSchema";
import {
	createJournalEntry,
	deleteJournalEntry,
	fetchJournal,
	type JournalEntry,
	type JournalPayload,
	updateJournalEntry,
} from "../service/journalService";

function emptyValues(): JournalValues {
	return { text: "", occurredAt: localDateTime(), spoiler: false };
}
export function useJournal(game: LibraryEntry) {
	const qc = useQueryClient();
	const [campaignFilter, setCampaignFilter] = useState("ALL");
	const [editing, setEditing] = useState<JournalEntry | null>(null);
	const [deleting, setDeleting] = useState<JournalEntry | null>(null);
	const campaigns = useQuery({
		queryKey: ["campaigns", game.id],
		queryFn: () => fetchCampaigns(game.id),
	});
	const query = useQuery({
		queryKey: ["journal", game.id, campaignFilter],
		queryFn: () =>
			fetchJournal(
				game.id,
				campaignFilter === "ALL" ? undefined : campaignFilter,
			),
	});
	const form = useForm<JournalValues>({
		resolver: zodResolver(journalSchema),
		defaultValues: emptyValues(),
	});
	const mutation = useMutation({
		mutationFn: (
			action:
				| {
						type: "create";
						payload: JournalPayload & { campaignId: string | null };
				  }
				| { type: "update"; id: string; payload: JournalPayload }
				| { type: "delete"; id: string },
		) => {
			if (action.type === "create")
				return createJournalEntry(game.id, action.payload);
			if (action.type === "delete")
				return deleteJournalEntry(game.id, action.id);
			return updateJournalEntry(game.id, action.id, action.payload);
		},
		onSuccess: async (_data, action) => {
			await qc.invalidateQueries({ queryKey: ["journal", game.id] });
			if (action.type !== "delete" || action.id === editing?.id) {
				setEditing(null);
				form.reset(emptyValues());
			}
			setDeleting(null);
		},
	});
	function edit(entry: JournalEntry | null) {
		setEditing(entry);
		mutation.reset();
		form.reset(
			entry
				? {
						text: entry.text,
						occurredAt: localDateTime(entry.occurredAt),
						spoiler: entry.spoiler,
					}
				: emptyValues(),
		);
	}
	return {
		campaigns,
		campaignFilter,
		setCampaignFilter,
		query,
		form,
		mutation,
		editing,
		edit,
		deleting,
		setDeleting,
		onSubmit: form.handleSubmit((values) => {
			const payload = {
				...values,
				occurredAt: new Date(values.occurredAt).toISOString(),
			};
			mutation.mutate(
				editing
					? { type: "update", id: editing.id, payload }
					: {
							type: "create",
							payload: {
								...payload,
								campaignId: game.activeCampaignId ?? null,
							},
						},
			);
		}),
		confirmDelete: () => {
			if (deleting) mutation.mutate({ type: "delete", id: deleting.id });
		},
	};
}
