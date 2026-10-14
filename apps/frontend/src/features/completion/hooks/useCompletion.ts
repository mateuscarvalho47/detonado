import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useUpdateLibraryEntry } from "@/features/detail/hooks/useLibraryEntry";
import type { LibraryEntry } from "@/types/api";
import {
	type ChecklistValues,
	type CompletionGoalValues,
	checklistSchema,
	completionGoalSchema,
} from "../schema/completionSchema";
import {
	type ChecklistItem,
	createChecklistItem,
	deleteChecklistItem,
	fetchChecklist,
	updateChecklistItem,
} from "../service/checklistService";
export function useCompletionGoal(game: LibraryEntry) {
	const mutation = useUpdateLibraryEntry(game.id, game.igdbId);
	const form = useForm<CompletionGoalValues>({
		resolver: zodResolver(completionGoalSchema),
		values: { completionGoal: game.completionGoal ?? "MAIN" },
		resetOptions: { keepDirtyValues: true },
	});
	return {
		form,
		mutation,
		onSubmit: form.handleSubmit((values) => {
			mutation.mutate(values, { onSuccess: () => form.reset(values) });
		}),
	};
}
export function useChecklist(entryId: string) {
	const qc = useQueryClient();
	const query = useQuery({
		queryKey: ["checklist", entryId],
		queryFn: () => fetchChecklist(entryId),
	});
	const form = useForm<ChecklistValues>({
		resolver: zodResolver(checklistSchema),
		defaultValues: { text: "" },
	});
	const [editing, setEditing] = useState<ChecklistItem | null>(null);
	const mutation = useMutation({
		mutationFn: (
			action:
				| { type: "create"; text: string }
				| {
						type: "update";
						id: string;
						values: { text?: string; completed?: boolean };
				  }
				| { type: "delete"; id: string },
		) => {
			if (action.type === "create")
				return createChecklistItem(entryId, action.text);
			if (action.type === "delete")
				return deleteChecklistItem(entryId, action.id);
			return updateChecklistItem(entryId, action.id, action.values);
		},
		onSuccess: async (_data, action) => {
			await qc.invalidateQueries({ queryKey: ["checklist", entryId] });
			if (
				action.type === "create" ||
				(action.type === "update" && action.values.text !== undefined)
			) {
				setEditing(null);
				form.reset({ text: "" });
			}
			if (action.type === "delete" && action.id === editing?.id) {
				setEditing(null);
				form.reset({ text: "" });
			}
		},
	});
	function edit(item: ChecklistItem | null) {
		setEditing(item);
		mutation.reset();
		form.reset({ text: item?.text ?? "" });
	}
	return {
		query,
		form,
		mutation,
		editing,
		edit,
		onSubmit: form.handleSubmit(({ text }) => {
			mutation.mutate(
				editing
					? { type: "update", id: editing.id, values: { text } }
					: { type: "create", text },
			);
		}),
		toggle: (item: ChecklistItem, completed: boolean) =>
			mutation.mutate({ type: "update", id: item.id, values: { completed } }),
		remove: (id: string) => mutation.mutate({ type: "delete", id }),
	};
}
