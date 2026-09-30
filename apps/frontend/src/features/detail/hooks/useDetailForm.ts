import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDebounce } from "@/shared/hooks/useDebounce";
import type { LibraryEntry } from "@/types/api";
import { type DetailFormValues, detailSchema } from "../schema/detailSchema";
import { useUpdateLibraryEntry } from "./useLibraryEntry";

export function useDetailForm(game: LibraryEntry) {
	const update = useUpdateLibraryEntry(game.id, game.igdbId);
	const [saved, setSaved] = useState(false);

	const form = useForm<DetailFormValues>({
		resolver: zodResolver(detailSchema),
		defaultValues: {
			status: game.status,
			userPlatform: game.userPlatform ?? "",
			rating: game.rating ?? 0,
			hoursPlayed: game.hoursPlayed ?? 0,
			notes: game.notes ?? "",
			completedAt: game.completedAt ? game.completedAt.slice(0, 10) : "",
		},
	});

	const watched = form.watch();

	const debouncedStatus = useDebounce(watched.status, 800);
	const debouncedPlatform = useDebounce(watched.userPlatform, 800);
	const debouncedRating = useDebounce(watched.rating, 800);
	const debouncedHours = useDebounce(watched.hoursPlayed, 800);
	const debouncedNotes = useDebounce(watched.notes, 1200);
	const debouncedCompletedAt = useDebounce(watched.completedAt, 800);

	// Keep a stable ref to the mutation so the save callback doesn't stale-close over it
	const updateRef = useRef(update);
	useEffect(() => {
		updateRef.current = update;
	});

	// Sync completedAt when the game prop changes (e.g. after a remote update)
	useEffect(() => {
		form.setValue(
			"completedAt",
			game.completedAt ? game.completedAt.slice(0, 10) : "",
		);
	}, [game.completedAt, form]);

	const save = useCallback(async () => {
		const ratingApplies =
			debouncedStatus === "PLAYING" ||
			debouncedStatus === "PAUSED" ||
			debouncedStatus === "COMPLETED" ||
			debouncedStatus === "DROPPED";
		await updateRef.current.mutateAsync({
			status: debouncedStatus,
			userPlatform: debouncedPlatform || undefined,
			rating: ratingApplies ? Math.round(debouncedRating) : undefined,
			hoursPlayed: debouncedHours || undefined,
			notes: debouncedNotes,
			completedAt: debouncedCompletedAt || undefined,
		});
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	}, [
		debouncedStatus,
		debouncedPlatform,
		debouncedRating,
		debouncedHours,
		debouncedNotes,
		debouncedCompletedAt,
	]);

	useEffect(() => {
		if (
			debouncedStatus !== game.status ||
			debouncedPlatform !== (game.userPlatform ?? "") ||
			debouncedRating !== (game.rating ?? 0) ||
			debouncedHours !== (game.hoursPlayed ?? 0) ||
			debouncedNotes !== (game.notes ?? "") ||
			debouncedCompletedAt !==
				(game.completedAt ? game.completedAt.slice(0, 10) : "")
		) {
			save();
		}
	}, [
		debouncedStatus,
		debouncedPlatform,
		debouncedRating,
		debouncedHours,
		debouncedNotes,
		debouncedCompletedAt,
		save,
		game.status,
		game.hoursPlayed,
		game.userPlatform,
		game.rating,
		game.notes,
		game.completedAt,
	]);

	return { form, saved, isSaving: update.isPending };
}
