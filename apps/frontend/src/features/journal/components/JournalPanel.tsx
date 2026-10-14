import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatSessionDate } from "@/features/sessions/lib/sessionTime";
import type { LibraryEntry } from "@/types/api";
import { useJournal } from "../hooks/useJournal";
import type { JournalEntry } from "../service/journalService";
import styles from "./JournalPanel.module.css";

function JournalText({ entry }: { entry: JournalEntry }) {
	const [revealed, setRevealed] = useState(false);
	return (
		<>
			{entry.spoiler && (
				<Button
					variant="ghost"
					aria-expanded={revealed}
					onClick={() => setRevealed((current) => !current)}
				>
					{revealed ? "Ocultar spoiler" : "Mostrar anotação com spoiler"}
				</Button>
			)}
			{(!entry.spoiler || revealed) && (
				<p className={styles.text}>{entry.text}</p>
			)}
		</>
	);
}
export function JournalPanel({ game }: { game: LibraryEntry }) {
	const state = useJournal(game);
	const entries = state.query.data?.entries ?? [];
	return (
		<section className={styles.panel} aria-labelledby="journal-title">
			<h2 id="journal-title">Diário de progresso</h2>
			<p>
				Guarde registros datados de cada campanha. O campo Onde parei continua
				separado; adicionar uma anotação não modifica esse campo.
			</p>
			<form className={styles.form} onSubmit={state.onSubmit}>
				<h3>
					{state.editing
						? "Editar anotação"
						: "Nova anotação na campanha atual"}
				</h3>
				{state.editing?.legacy && (
					<p>
						Anotação anterior preservada. A data original é desconhecida; a data
						abaixo foi atribuída na preservação e pode ser ajustada.
					</p>
				)}
				<label>
					Data e hora do registro (local)
					<input
						type="datetime-local"
						required
						{...state.form.register("occurredAt")}
					/>
				</label>
				<label>
					Anotação
					<textarea
						rows={4}
						maxLength={4000}
						{...state.form.register("text")}
					/>
				</label>
				<label className={styles.check}>
					<input type="checkbox" {...state.form.register("spoiler")} />
					Contém spoiler
				</label>
				{Object.entries(state.form.formState.errors).map(([field, error]) => (
					<p role="alert" key={field}>
						{error.message}
					</p>
				))}
				<div className={styles.actions}>
					<Button
						type="submit"
						variant="outline"
						disabled={state.mutation.isPending}
					>
						{state.mutation.isPending
							? "Salvando…"
							: state.editing
								? "Salvar anotação"
								: "Registrar anotação"}
					</Button>
					{state.editing && (
						<Button
							type="button"
							variant="ghost"
							onClick={() => state.edit(null)}
						>
							Cancelar edição
						</Button>
					)}
				</div>
			</form>
			{state.mutation.isError && (
				<p role="alert">{state.mutation.error.message}</p>
			)}
			{state.mutation.isSuccess && <p role="status">Diário atualizado.</p>}
			<label>
				Mostrar registros de
				<select
					value={state.campaignFilter}
					disabled={state.mutation.isPending}
					onChange={(event) => state.setCampaignFilter(event.target.value)}
				>
					<option value="ALL">Todas as campanhas</option>
					{game.activeCampaignId && (
						<option value={game.activeCampaignId}>Campanha atual</option>
					)}
					{state.campaigns.data?.campaigns
						.filter((campaign) => campaign.id !== game.activeCampaignId)
						.map((campaign) => (
							<option key={campaign.id} value={campaign.id}>
								Campanha de {formatSessionDate(campaign.startedAt)}
							</option>
						))}
				</select>
			</label>
			{state.campaigns.isLoading && <p role="status">Carregando campanhas…</p>}
			{state.campaigns.isError && (
				<p role="alert">
					Não foi possível carregar campanhas anteriores.{" "}
					<Button
						variant="ghost"
						onClick={() => void state.campaigns.refetch()}
					>
						Tentar novamente
					</Button>
				</p>
			)}
			{state.query.isLoading && <p role="status">Carregando diário…</p>}
			{state.query.isError && (
				<p role="alert">
					{state.query.error.message}{" "}
					<Button variant="ghost" onClick={() => void state.query.refetch()}>
						Tentar novamente
					</Button>
				</p>
			)}
			{state.query.isSuccess && entries.length === 0 && (
				<p>Nenhuma anotação neste filtro.</p>
			)}
			<ul className={styles.list}>
				{entries.map((entry) => (
					<li key={entry.id}>
						<div>
							<strong>
								{entry.legacy
									? "Anotação anterior preservada"
									: formatSessionDate(entry.occurredAt)}
							</strong>
							<p>
								{entry.campaignId === game.activeCampaignId
									? "Campanha atual"
									: "Campanha anterior"}
								{entry.legacy ? " · Data original desconhecida" : ""}
							</p>
						</div>
						<JournalText
							key={`${entry.id}:${entry.updatedAt}:${entry.spoiler}`}
							entry={entry}
						/>
						<div className={styles.actions}>
							<Button
								variant="ghost"
								disabled={state.mutation.isPending}
								aria-label={`Editar anotação ${entry.legacy ? "anterior preservada" : formatSessionDate(entry.occurredAt)}`}
								onClick={() => state.edit(entry)}
							>
								Editar
							</Button>
							<Button
								variant="ghost"
								disabled={state.mutation.isPending}
								aria-label={`Excluir anotação ${entry.legacy ? "anterior preservada" : formatSessionDate(entry.occurredAt)}`}
								onClick={() => state.setDeleting(entry)}
							>
								Excluir
							</Button>
						</div>
					</li>
				))}
			</ul>
			{state.deleting && (
				<div className={styles.confirm}>
					<p>
						Excluir esta anotação do diário? O campo Onde parei e as notas da
						campanha permanecem como estão.
					</p>
					<Button
						variant="outline"
						disabled={state.mutation.isPending}
						onClick={state.confirmDelete}
					>
						Confirmar exclusão
					</Button>
					<Button variant="ghost" onClick={() => state.setDeleting(null)}>
						Cancelar
					</Button>
				</div>
			)}
		</section>
	);
}
