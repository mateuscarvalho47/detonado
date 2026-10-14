import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
	type LibraryFilterValues,
	type SavedFilterValues,
	savedFilterSchema,
} from "../schema/savedFilterSchema";
import {
	createSavedFilter,
	deleteSavedFilter,
	fetchSavedFilters,
	updateSavedFilter,
} from "../service/filterService";
export function useSavedFilters(
	criteria: LibraryFilterValues,
	restore: (filters: LibraryFilterValues) => void,
) {
	const qc = useQueryClient();
	const query = useQuery({
		queryKey: ["saved-filters"],
		queryFn: fetchSavedFilters,
	});
	const [selectedId, setSelectedId] = useState("");
	const form = useForm<SavedFilterValues>({
		resolver: zodResolver(savedFilterSchema),
		defaultValues: { name: "", filters: {} },
	});
	const mutation = useMutation({
		mutationFn: (
			action:
				| { kind: "create" | "update"; values: SavedFilterValues }
				| { kind: "delete" },
		) => {
			if (action.kind === "delete") return deleteSavedFilter(selectedId);
			return action.kind === "update"
				? updateSavedFilter({ id: selectedId, ...action.values })
				: createSavedFilter(action.values);
		},
		onSuccess: (_data, action) => {
			void qc.invalidateQueries({ queryKey: ["saved-filters"] });
			if (action.kind === "delete") {
				setSelectedId("");
				form.reset({ name: "", filters: {} });
			}
		},
	});
	function select(id: string) {
		setSelectedId(id);
		mutation.reset();
		const saved = query.data?.filters.find((item) => item.id === id);
		if (!saved) form.reset({ name: "", filters: {} });
		if (saved) {
			restore(saved.filters);
			form.reset({ name: saved.name, filters: saved.filters });
		}
	}
	function submit(kind: "create" | "update") {
		form.setValue("filters", criteria);
		return form.handleSubmit((values) => {
			mutation.mutate({ kind, values });
		});
	}
	return {
		query,
		selectedId,
		select,
		form,
		mutation,
		save: submit("create"),
		update: submit("update"),
		remove: () => mutation.mutate({ kind: "delete" }),
	};
}
