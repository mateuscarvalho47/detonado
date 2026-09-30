import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { LibraryEntry } from "@/types/api";
import { useDetailForm } from "../hooks/useDetailForm";
import {
	useRefreshLibraryHltb,
	useRemoveLibraryEntry,
} from "../hooks/useLibraryEntry";
import { ConfirmRemoveModal } from "./ConfirmRemoveModal";
import { DetailEditForm } from "./DetailEditForm";
import { DetailHero } from "./DetailHero";

interface DetailScreenProps {
	game: LibraryEntry;
}

export function DetailScreen({ game }: DetailScreenProps) {
	const navigate = useNavigate();
	const remove = useRemoveLibraryEntry(game.id);
	const [confirmRemove, setConfirmRemove] = useState(false);

	const refreshHltb = useRefreshLibraryHltb(game.id, game.igdbId);
	const { form, saved } = useDetailForm(game);
	const { control, register, setValue, getValues, watch } = form;

	const status = watch("status");
	const rating = watch("rating");

	return (
		<>
			<div>
				<DetailHero
					game={game}
					status={status}
					saved={saved}
					onBack={() => navigate({ to: "/library" })}
					onRemove={() => setConfirmRemove(true)}
					onRefreshHltb={() => void refreshHltb.mutate()}
					refreshingHltb={refreshHltb.isPending}
				/>
				<DetailEditForm
					game={game}
					control={control}
					register={register}
					setValue={setValue}
					getValues={getValues}
					status={status}
					rating={rating}
				/>
			</div>

			{confirmRemove && (
				<ConfirmRemoveModal
					gameName={game.name}
					onConfirm={async () => {
						await remove.mutateAsync();
						navigate({ to: "/library" });
					}}
					onCancel={() => setConfirmRemove(false)}
					isPending={remove.isPending}
				/>
			)}
		</>
	);
}
