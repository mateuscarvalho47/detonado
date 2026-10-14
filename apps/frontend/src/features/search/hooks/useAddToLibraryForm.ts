import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMe } from "@/features/auth/hooks/useAuth";
import { useAddToLibrary } from "@/features/library/hooks/useLibrary";
import type { GameSearchResult } from "@/types/api";
import {
	type AddToLibraryFormValues,
	addToLibrarySchema,
} from "../schema/addToLibrarySchema";

export function useAddToLibraryForm(
	game: GameSearchResult,
	onAdded: (igdbId: number) => void,
) {
	const mutation = useAddToLibrary();
	const { data: user } = useMe();
	const previousGame = useRef(game.igdbId);
	const manuallySelected = useRef(false);
	const initialPlatform = user?.preferredPlatform
		? game.platforms.includes(user.preferredPlatform)
			? user.preferredPlatform
			: ""
		: (game.platforms[0] ?? "");

	const form = useForm<AddToLibraryFormValues>({
		resolver: zodResolver(addToLibrarySchema),
		defaultValues: {
			status: "BACKLOG",
			userPlatform: initialPlatform,
		},
	});

	useEffect(() => {
		if (previousGame.current !== game.igdbId) {
			previousGame.current = game.igdbId;
			manuallySelected.current = false;
			form.reset({ status: "BACKLOG", userPlatform: initialPlatform });
		} else if (!manuallySelected.current) {
			form.setValue("userPlatform", initialPlatform);
		}
	}, [game.igdbId, initialPlatform, form]);

	const onSubmit = form.handleSubmit(async (values) => {
		await mutation.mutateAsync({
			igdbId: game.igdbId,
			status: values.status,
			userPlatform: values.userPlatform,
		});
		onAdded(game.igdbId);
	});

	return {
		form,
		onSubmit,
		isPending: mutation.isPending,
		selectPlatform: (value: string) => {
			manuallySelected.current = true;
			form.setValue("userPlatform", value, { shouldDirty: true });
		},
	};
}
