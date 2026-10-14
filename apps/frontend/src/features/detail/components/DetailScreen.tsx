import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CampaignsPanel } from "@/features/campaigns/components/CampaignsPanel";
import { CompletionPanel } from "@/features/completion/components/CompletionPanel";
import { JournalPanel } from "@/features/journal/components/JournalPanel";
import { MembershipPanel } from "@/features/organization/components/MembershipPanel";
import { SessionsPanel } from "@/features/sessions/components/SessionsPanel";
import { SourcesPanel } from "@/features/sources/components/SourcesPanel";
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
	const { form, saved, error, isSaving, hasPendingChanges } =
		useDetailForm(game);
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
				<CampaignsPanel game={game} disabled={isSaving || hasPendingChanges} />
				<CompletionPanel game={game} />
				<MembershipPanel game={game} />
				<SourcesPanel game={game} />
				<SessionsPanel game={game} />
				<JournalPanel game={game} />
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
