import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { fetchSessions } from "@/features/sessions/service/sessionService";
import type { LibraryEntry } from "@/types/api";
import { type CampaignValues, campaignSchema } from "../schema/campaignSchema";
import { fetchCampaigns, startCampaign } from "../service/campaignService";
export function useCampaigns(game: LibraryEntry, disabled: boolean) {
	const qc = useQueryClient();
	const query = useQuery({
		queryKey: ["campaigns", game.id],
		queryFn: () => fetchCampaigns(game.id),
	});
	const [confirming, setConfirming] = useState(false);
	const form = useForm<CampaignValues>({
		resolver: zodResolver(campaignSchema),
		defaultValues: { startedAt: "", notes: "", confirmed: false },
	});
	const mutation = useMutation({
		mutationFn: (values: { startedAt?: string; notes: string | null }) =>
			startCampaign(game.id, values),
		retry: false,
		onSuccess: async (campaign) => {
			const updated: LibraryEntry = {
				...game,
				activeCampaignId: campaign.id,
				status: campaign.status,
				baseHours: campaign.baseHours,
				hoursPlayed: campaign.hoursPlayed ?? 0,
				rating: campaign.rating ?? undefined,
				notes: campaign.notes ?? "",
				completedAt: campaign.completedAt ?? undefined,
				completionGoal: campaign.completionGoal,
				lastSessionAt: null,
			};
			qc.setQueryData(["library", game.igdbId], updated);
			qc.setQueryData<LibraryEntry[]>(["library"], (list) =>
				list?.map((entry) => (entry.id === game.id ? updated : entry)),
			);
			qc.setQueryData(["checklist", game.id], { items: [] });
			setConfirming(false);
			form.reset({ startedAt: "", notes: "", confirmed: false });
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["library"] }),
				qc.invalidateQueries({ queryKey: ["campaigns", game.id] }),
				qc.invalidateQueries({ queryKey: ["sessions", game.id] }),
				qc.invalidateQueries({ queryKey: ["checklist", game.id] }),
				qc.invalidateQueries({ queryKey: ["stats"] }),
			]);
		},
	});
	const onSubmit = form.handleSubmit((values) => {
		if (disabled) {
			form.setError("root", {
				message:
					"Aguarde o salvamento do registro antes de iniciar outra campanha.",
			});
			return;
		}
		mutation.mutate({
			...(values.startedAt
				? { startedAt: new Date(values.startedAt).toISOString() }
				: {}),
			notes: values.notes.trim() || null,
		});
	});
	return { query, form, mutation, confirming, setConfirming, onSubmit };
}
export function useCampaignSessions(
	entryId: string,
	campaignId: string,
	enabled: boolean,
) {
	return useQuery({
		queryKey: ["sessions", entryId, campaignId],
		queryFn: () => fetchSessions(entryId, campaignId),
		enabled,
	});
}
