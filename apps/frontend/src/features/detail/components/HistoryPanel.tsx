import { useQueries } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CampaignsPanel } from "@/features/campaigns/components/CampaignsPanel";
import {
	JournalEditor,
	JournalRecord,
} from "@/features/journal/components/JournalPanel";
import { useJournal } from "@/features/journal/hooks/useJournal";
import {
	SessionRecord,
	SessionsEditor,
} from "@/features/sessions/components/SessionsPanel";
import { useSessions } from "@/features/sessions/hooks/useSessions";
import { fetchSessions } from "@/features/sessions/service/sessionService";
import { useDraftRegistration } from "@/shared/components/DraftBoundary";
import type { LibraryEntry } from "@/types/api";
import styles from "./HistoryPanel.module.css";
export function HistoryPanel({
	game,
	disabled,
}: {
	game: LibraryEntry;
	disabled: boolean;
}) {
	const sessions = useSessions(game);
	const journal = useJournal(game);
	const sessionEditor = useRef<HTMLDivElement>(null);
	const journalEditor = useRef<HTMLDetailsElement>(null);
	const campaigns = journal.campaigns.data?.campaigns ?? [];
	const previous = campaigns.filter(
		(c) =>
			c.id !== game.activeCampaignId &&
			(journal.campaignFilter === "ALL" || c.id === journal.campaignFilter),
	);
	const historicalSessions = useQueries({
		queries: previous.map((c) => ({
			queryKey: ["sessions", game.id, c.id],
			queryFn: () => fetchSessions(game.id, c.id),
		})),
	});
	const current =
		journal.campaignFilter === "ALL" ||
		journal.campaignFilter === game.activeCampaignId;
	const records = [
		...(current ? (sessions.query.data?.sessions ?? []) : []).map(
			(session) => ({
				kind: "session" as const,
				date: session.playedAt,
				id: session.id,
				session,
			}),
		),
		...historicalSessions.flatMap((query) =>
			(query.data?.sessions ?? []).map((session) => ({
				kind: "session" as const,
				date: session.playedAt,
				id: session.id,
				session,
			})),
		),
		...(journal.query.data?.entries ?? []).map((entry) => ({
			kind: "journal" as const,
			date: entry.legacy ? "" : entry.occurredAt,
			id: entry.id,
			entry,
		})),
	].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
	useEffect(() => {
		if (sessions.editing) {
			sessionEditor.current?.scrollIntoView({ block: "center" });
			sessionEditor.current?.querySelector("input")?.focus();
		}
	}, [sessions.editing]);
	useEffect(() => {
		if (
			(journal.editing ||
				journal.deleting ||
				journal.mutation.isError ||
				journal.mutation.isPending ||
				journal.query.isError ||
				journal.campaigns.isError) &&
			journalEditor.current
		) {
			journalEditor.current.open = true;
			journalEditor.current.scrollIntoView({ block: "center" });
			journalEditor.current.querySelector("textarea")?.focus();
		}
	}, [
		journal.editing,
		journal.deleting,
		journal.mutation.isError,
		journal.mutation.isPending,
		journal.query.isError,
		journal.campaigns.isError,
	]);
	const drafts =
		sessions.form.formState.isDirty ||
		journal.form.formState.isDirty ||
		sessions.mutation.isPending ||
		journal.mutation.isPending;
	useDraftRegistration("history", drafts);
	return (
		<section className={styles.panel} aria-labelledby="history-title">
			<h2 id="history-title">Histórico do jogo</h2>
			<p>
				Sessões registram tempo; anotações guardam lembranças. Onde parei é um
				resumo independente.
			</p>
			<div ref={sessionEditor}>
				<SessionsEditor game={game} state={sessions} hideHistory />
			</div>
			<details
				ref={journalEditor}
				onToggle={(event) => {
					if (
						!event.currentTarget.open &&
						(journal.form.formState.isDirty ||
							journal.mutation.isPending ||
							journal.mutation.isError ||
							journal.deleting)
					)
						event.currentTarget.open = true;
				}}
			>
				<summary>Anotar progresso</summary>
				<JournalEditor game={game} state={journal} hideHistory />
			</details>
			<label>
				Mostrar registros de{" "}
				<select
					value={journal.campaignFilter}
					onChange={(event) => journal.setCampaignFilter(event.target.value)}
				>
					<option value="ALL">Todas as campanhas</option>
					{campaigns.map((c) => (
						<option key={c.id} value={c.id}>
							{c.id === game.activeCampaignId
								? "Campanha atual"
								: `Campanha de ${new Date(c.startedAt).toLocaleDateString("pt-BR")}`}
						</option>
					))}
				</select>
			</label>
			{historicalSessions.map((query, index) =>
				query.isError ? (
					<p key={previous[index].id} role="alert">
						{query.error.message}{" "}
						<Button variant="ghost" onClick={() => void query.refetch()}>
							Tentar novamente
						</Button>
					</p>
				) : query.isLoading ? (
					<p key={previous[index].id} role="status">
						Carregando sessões anteriores…
					</p>
				) : null,
			)}
			{!records.length && <p>Nenhum registro carregado neste filtro.</p>}
			<ol className={styles.timeline}>
				{records.map((record) => (
					<li key={`${record.kind}:${record.id}`}>
						<span>
							{record.kind === "session"
								? `Sessão · ${record.session.campaignId === game.activeCampaignId ? "Campanha atual" : "Campanha anterior"}`
								: "Anotação"}
						</span>
						<ul>
							{record.kind === "session" ? (
								<SessionRecord session={record.session} state={sessions} />
							) : (
								<JournalRecord
									entry={record.entry}
									game={game}
									state={journal}
								/>
							)}
						</ul>
					</li>
				))}
			</ol>
			<details id="campaign-actions">
				<summary>Campanhas anteriores e Jogar novamente</summary>
				<CampaignsPanel game={game} disabled={disabled || drafts} />
			</details>
		</section>
	);
}
