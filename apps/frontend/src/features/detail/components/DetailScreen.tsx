import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MembershipPanel } from "@/features/organization/components/MembershipPanel";
import { SourcesPanel } from "@/features/sources/components/SourcesPanel";
import { useDraftRegistration } from "@/shared/components/DraftBoundary";
import type { LibraryEntry } from "@/types/api";
import { useDetailForm } from "../hooks/useDetailForm";
import {
	useRefreshLibraryHltb,
	useRemoveLibraryEntry,
} from "../hooks/useLibraryEntry";
import { ConfirmRemoveModal } from "./ConfirmRemoveModal";
import { DetailEditForm } from "./DetailEditForm";
import { DetailHero } from "./DetailHero";
import { HistoryPanel } from "./HistoryPanel";

interface DetailScreenProps {
	game: LibraryEntry;
}

export function DetailScreen({ game }: DetailScreenProps) {
	const navigate = useNavigate();
	const remove = useRemoveLibraryEntry(game.id);
	const [confirmRemove, setConfirmRemove] = useState(false);

	const refreshHltb = useRefreshLibraryHltb(game.id, game.igdbId);
	const { form, saved, error, isSaving, hasPendingChanges } =
		useDetailForm(game);
	const { control, register, setValue, getValues, watch } = form;
	useDraftRegistration("main", hasPendingChanges || isSaving);

	const status = watch("status");
	const rating = watch("rating");

	return (
		<>
			<div>
				<DetailHero
					game={game}
					status={status}
					saved={saved}
					onBack={() => navigate({ to: "/library", search: true })}
					onRemove={() => setConfirmRemove(true)}
					onRefreshHltb={() => void refreshHltb.mutate()}
					refreshingHltb={refreshHltb.isPending}
				/>
				{error && <p role="alert">{error.message}</p>}
				<DetailEditForm
					game={game}
					control={control}
					register={register}
					setValue={setValue}
					getValues={getValues}
					status={status}
					rating={rating}
				/>
				<MembershipPanel game={game} />
				<details>
					<summary>Origens · opções avançadas</summary>
					<SourcesPanel game={game} />
				</details>
				<HistoryPanel game={game} disabled={isSaving || hasPendingChanges} />
			</div>

			{confirmRemove && (
				<ConfirmRemoveModal
					gameName={game.name}
					onConfirm={async () => {
						await remove.mutateAsync();
						navigate({ to: "/library", search: true });
					}}
					onCancel={() => setConfirmRemove(false)}
					isPending={remove.isPending}
				/>
			)}
		</>
	);
}
