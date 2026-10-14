import { useState } from "react";
import { Button } from "@/components/ui/button";
import { COMPLETION_GOALS } from "@/features/completion/lib/completionEstimate";
import { formatSessionDate } from "@/features/sessions/lib/sessionTime";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";
import { useCampaignSessions, useCampaigns } from "../hooks/useCampaigns";
import type { Campaign } from "../service/campaignService";
import styles from "./CampaignsPanel.module.css";

function HistoricalCampaign({
	entryId,
	campaign,
}: {
	entryId: string;
	campaign: Campaign;
}) {
	const [open, setOpen] = useState(false);
	const sessions = useCampaignSessions(entryId, campaign.id, open);
	return (
		<details
			onToggle={(event) => setOpen(event.currentTarget.open)}
			className={styles.history}
		>
			<summary>
				{formatSessionDate(campaign.startedAt)} ·{" "}
				{STATUS_BY_KEY[campaign.status].label} · {campaign.hoursPlayed ?? 0}h
			</summary>
			<dl className={styles.facts}>
				<div>
					<dt>Início</dt>
					<dd>{formatSessionDate(campaign.startedAt)}</dd>
				</div>
				<div>
					<dt>Conclusão</dt>
					<dd>
						{campaign.completedAt
							? formatSessionDate(campaign.completedAt)
							: "Não concluída"}
					</dd>
				</div>
				<div>
					<dt>Arquivada em</dt>
					<dd>
						{campaign.archivedAt ? formatSessionDate(campaign.archivedAt) : "—"}
					</dd>
				</div>
				<div>
					<dt>Horas anteriores</dt>
					<dd>{campaign.baseHours ?? 0}h</dd>
				</div>
				<div>
					<dt>Avaliação</dt>
					<dd>
						{campaign.rating != null
							? `${campaign.rating}/10`
							: "Sem avaliação"}
					</dd>
				</div>
				<div>
					<dt>Objetivo</dt>
					<dd>
						{
							COMPLETION_GOALS.find(
								(goal) => goal.value === campaign.completionGoal,
							)?.label
						}
					</dd>
				</div>
			</dl>
			{campaign.notes && <p className={styles.notes}>{campaign.notes}</p>}
			<h4>Sessões desta campanha</h4>
			{sessions.isLoading && <p role="status">Carregando sessões…</p>}
			{sessions.isError && (
				<p role="alert">
					{sessions.error.message}{" "}
					<Button variant="ghost" onClick={() => void sessions.refetch()}>
						Tentar novamente
					</Button>
				</p>
			)}
			{sessions.isSuccess && sessions.data.sessions.length === 0 && (
				<p>
					Sem sessões datadas. As horas anteriores estão preservadas no total.
				</p>
			)}
			<ul className={styles.list}>
				{sessions.data?.sessions.map((session) => (
					<li key={session.id}>
						<strong>
							{formatSessionDate(session.playedAt)} · {session.durationMinutes}{" "}
							min
						</strong>
						{session.notes && <p className={styles.notes}>{session.notes}</p>}
					</li>
				))}
			</ul>
		</details>
	);
}
export function CampaignsPanel({
	game,
	disabled = false,
}: {
	game: LibraryEntry;
	disabled?: boolean;
}) {
	const state = useCampaigns(game, disabled);
	const active = state.query.data?.campaigns.find(
		(campaign) => campaign.id === game.activeCampaignId,
	);
	const history =
		state.query.data?.campaigns.filter(
			(campaign) => campaign.id !== game.activeCampaignId,
		) ?? [];
	return (
		<section className={styles.panel} aria-labelledby="campaigns-title">
			<h2 id="campaigns-title">Campanhas e rejogadas</h2>
			{active && (
				<p>
					Campanha ativa desde {formatSessionDate(active.startedAt)} ·{" "}
					{game.hoursPlayed ?? 0}h.
				</p>
			)}
			<p>
				Uma nova campanha preserva o registro atual no histórico e inicia o jogo
				como Jogando, com horas zeradas, sem avaliação e com checklist limpo. O
				objetivo é mantido.
			</p>
			<div>
				<Button
					variant="outline"
					disabled={disabled || state.mutation.isPending}
					onClick={() => state.setConfirming(true)}
				>
					Iniciar nova campanha
				</Button>
			</div>
			{disabled && (
				<p role="status">Aguarde o salvamento das alterações no registro.</p>
			)}
			{state.confirming && (
				<form onSubmit={state.onSubmit} className={styles.form}>
					<h3>Confirmar nova campanha</h3>
					<label>
						Data e hora de início (opcional)
						<input
							type="datetime-local"
							{...state.form.register("startedAt")}
						/>
					</label>
					<label>
						Notas da nova campanha (opcional)
						<textarea
							rows={3}
							maxLength={4000}
							{...state.form.register("notes")}
						/>
					</label>
					<label className={styles.confirm}>
						<input type="checkbox" {...state.form.register("confirmed")} />
						Arquivar a campanha atual e iniciar outra.
					</label>
					{Object.entries(state.form.formState.errors).map(([field, error]) => (
						<p key={field} role="alert">
							{error.message}
						</p>
					))}
					<div className={styles.actions}>
						<Button
							type="submit"
							variant="outline"
							disabled={disabled || state.mutation.isPending}
						>
							{state.mutation.isPending
								? "Iniciando…"
								: "Confirmar nova campanha"}
						</Button>
						<Button
							type="button"
							variant="ghost"
							disabled={state.mutation.isPending}
							onClick={() => state.setConfirming(false)}
						>
							Cancelar
						</Button>
					</div>
				</form>
			)}
			{state.mutation.isError && (
				<p role="alert">{state.mutation.error.message}</p>
			)}
			{state.query.isLoading && <p role="status">Carregando campanhas…</p>}
			{state.query.isError && (
				<p role="alert">
					{state.query.error.message}{" "}
					<Button variant="ghost" onClick={() => void state.query.refetch()}>
						Tentar novamente
					</Button>
				</p>
			)}
			<h3>Campanhas anteriores</h3>
			{state.query.isSuccess && history.length === 0 && (
				<p>Nenhuma campanha anterior.</p>
			)}
			{history.map((campaign) => (
				<HistoricalCampaign
					key={campaign.id}
					entryId={game.id}
					campaign={campaign}
				/>
			))}
		</section>
	);
}
