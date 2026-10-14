import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { fetchLibrary } from "@/features/library/service/libraryService";
import type { LibraryEntry } from "@/types/api";
import {
	type GroupValues,
	groupSchema,
	type MembershipValues,
	membershipSchema,
} from "../schema/organizationSchema";
import {
	createGroup,
	deleteGroup,
	fetchOrganization,
	type GroupKind,
	type PersonalGroup,
	renameGroup,
	updateMembership,
} from "../service/organizationService";
export function useOrganization() {
	return useQuery({ queryKey: ["organization"], queryFn: fetchOrganization });
}
export function useGroupManager() {
	const query = useOrganization();
	const qc = useQueryClient();
	const [kind, setKind] = useState<GroupKind>("collections");
	const [editing, setEditing] = useState<PersonalGroup | null>(null);
	const [deleting, setDeleting] = useState<{
		kind: GroupKind;
		group: PersonalGroup;
	} | null>(null);
	const form = useForm<GroupValues>({
		resolver: zodResolver(groupSchema),
		defaultValues: { name: "" },
	});
	const mutation = useMutation({
		mutationFn: (
			action:
				| { kind: GroupKind; values: GroupValues; id?: string }
				| { kind: GroupKind; deleteId: string },
		) => {
			if ("deleteId" in action)
				return deleteGroup(action.kind, action.deleteId);
			return action.id
				? renameGroup(action.kind, action.id, action.values)
				: createGroup(action.kind, action.values);
		},
		onSuccess: async () => {
			setEditing(null);
			setDeleting(null);
			form.reset({ name: "" });
			await qc.invalidateQueries({ queryKey: ["organization"] });
			const library = await fetchLibrary();
			qc.setQueryData(["library"], library);
			for (const game of library)
				qc.setQueryData(["library", game.igdbId], game);
		},
	});
	function edit(nextKind: GroupKind, group: PersonalGroup | null) {
		setKind(nextKind);
		setEditing(group);
		form.reset({ name: group?.name ?? "" });
		mutation.reset();
	}
	return {
		query,
		kind,
		edit,
		editing,
		deleting,
		setDeleting,
		form,
		mutation,
		onSubmit: form.handleSubmit((values) => {
			mutation.mutate({ kind, values, id: editing?.id });
		}),
		confirmDelete: () => {
			if (deleting)
				mutation.mutate({ kind: deleting.kind, deleteId: deleting.group.id });
		},
	};
}
export function useMembership(game: LibraryEntry) {
	const query = useOrganization();
	const qc = useQueryClient();
	const form = useForm<MembershipValues>({
		resolver: zodResolver(membershipSchema),
		values: {
			collectionIds: game.collectionIds ?? [],
			tagIds: game.tagIds ?? [],
		},
		resetOptions: { keepDirtyValues: true },
	});
	const mutation = useMutation({
		mutationFn: (values: MembershipValues) => updateMembership(game.id, values),
		onSuccess: (values) => {
			qc.setQueryData(
				["library", game.igdbId],
				(current: LibraryEntry | undefined) =>
					current ? { ...current, ...values } : current,
			);
			qc.setQueryData<LibraryEntry[]>(["library"], (list) =>
				list?.map((current) =>
					current.id === game.id ? { ...current, ...values } : current,
				),
			);
			form.reset(values);
		},
	});
	return {
		query,
		form,
		mutation,
		onSubmit: form.handleSubmit((values) => {
			mutation.mutate(values);
		}),
	};
}
