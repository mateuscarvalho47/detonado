import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { fetchLibraryEntry } from "@/features/detail/service/detailService";
import type { LibraryEntry } from "@/types/api";
import { localDateTime } from "../lib/sessionTime";
import { type SessionValues, sessionSchema } from "../schema/sessionSchema";
import {
	createSession,
	deleteSession,
	fetchSessions,
	type PlaySession,
	type SessionPayload,
	updateSession,
} from "../service/sessionService";
export function useSessions(game: LibraryEntry) {
	const qc = useQueryClient();
	const query = useQuery({
		queryKey: ["sessions", game.id],
		queryFn: () => fetchSessions(game.id),
	});
	const [editing, setEditing] = useState<PlaySession | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const attempt = useRef<{ fingerprint: string; clientId: string } | null>(
		null,
	);
	const form = useForm<SessionValues>({
		resolver: zodResolver(sessionSchema),
		defaultValues: {
			playedAt: localDateTime(),
			durationMinutes: 60,
			notes: "",
		},
	});
	async function refresh() {
		await qc.invalidateQueries({ queryKey: ["sessions", game.id] });
		const updated = await fetchLibraryEntry(game.igdbId);
		qc.setQueryData(["library", game.igdbId], updated);
		qc.setQueryData<LibraryEntry[]>(["library"], (list) =>
			list?.map((item) => (item.id === updated.id ? updated : item)),
		);
		void qc.invalidateQueries({ queryKey: ["stats"] });
	}
	const mutation = useMutation({
		mutationFn: (
			action:
				| { kind: "create"; payload: SessionPayload & { clientId: string } }
				| { kind: "update"; id: string; payload: SessionPayload }
				| { kind: "delete"; id: string },
		) => {
			if (action.kind === "delete") return deleteSession(game.id, action.id);
			if (action.kind === "update")
				return updateSession(game.id, action.id, action.payload);
			return createSession(game.id, action.payload);
		},
		onSuccess: async (_data, action) => {
			await refresh();
			if (action.kind === "delete") setDeleteId(null);
			else {
				setEditing(null);
				attempt.current = null;
				form.reset({
					playedAt: localDateTime(),
					durationMinutes: 60,
					notes: "",
				});
			}
		},
	});
	const onSubmit = form.handleSubmit((values) => {
		const payload: SessionPayload = {
			playedAt: new Date(values.playedAt).toISOString(),
			durationMinutes: values.durationMinutes,
			notes: values.notes.trim() || null,
		};
		if (editing) {
			mutation.mutate({ kind: "update", id: editing.id, payload });
			return;
		}
		const fingerprint = JSON.stringify(payload);
		if (attempt.current?.fingerprint !== fingerprint)
			attempt.current = { fingerprint, clientId: crypto.randomUUID() };
		mutation.mutate({
			kind: "create",
			payload: { ...payload, clientId: attempt.current.clientId },
		});
	});
	function edit(session: PlaySession | null) {
		setEditing(session);
		mutation.reset();
		attempt.current = null;
		form.reset(
			session
				? {
						playedAt: localDateTime(session.playedAt),
						durationMinutes: session.durationMinutes,
						notes: session.notes ?? "",
					}
				: { playedAt: localDateTime(), durationMinutes: 60, notes: "" },
		);
	}
	return {
		query,
		form,
		mutation,
		onSubmit,
		editing,
		edit,
		deleteId,
		setDeleteId,
		confirmDelete: () => {
			if (deleteId) mutation.mutate({ kind: "delete", id: deleteId });
		},
	};
}
