import { Button } from "@/components/ui/button";
import type { LibraryEntry } from "@/types/api";
import { useSessions } from "../hooks/useSessions";
import { formatSessionDate } from "../lib/sessionTime";
import styles from "./SessionsPanel.module.css";

export function SessionsPanel({ game }: { game: LibraryEntry }) {
	const state = useSessions(game);
	const {
		register,
		formState: { errors },
	} = state.form;
	const sessionMinutes = state.query.data?.sessions.reduce(
		(total, session) => total + (session.pending ? 0 : session.durationMinutes),
		0,
	);
	const pendingCount =
		state.query.data?.sessions.filter((session) => session.pending).length ?? 0;
	return (
		<section className={styles.panel} aria-labelledby="sessions-title">
			<h2 id="sessions-title">Sessões de jogo</h2>
			<p>
				{game.hoursPlayed ?? 0}h no total · {game.baseHours ?? 0}h anteriores ao
				histórico
				{sessionMinutes !== undefined
					? ` · ${Math.round(sessionMinutes / 6) / 10}h em sessões`
					: ""}
			</p>
			<p>
				Editar as horas totais no registro ajusta as horas anteriores. Sessões
				são somadas automaticamente.
			</p>
			{pendingCount > 0 && (
				<p role="status">
					{pendingCount} sessão(ões) salva(s) neste navegador, aguardando
					sincronização. As horas pendentes ainda não entram no total.
				</p>
			)}
			{state.query.data?.offlineHistoryMissing && (
				<p>
					O histórico do servidor ainda não foi salvo neste navegador.
					Conecte-se para consultar as sessões anteriores.
				</p>
			)}
			{game.lastSessionAt && (
				<p>Última sessão: {formatSessionDate(game.lastSessionAt)}</p>
			)}
			<form className={styles.form} onSubmit={state.onSubmit}>
				<h3>{state.editing ? "Editar sessão" : "Registrar sessão"}</h3>
				<div className={styles.fields}>
					<label>
						Data e hora local
						<input type="datetime-local" {...register("playedAt")} required />
					</label>
					<label>
						Duração em minutos
						<input
							type="number"
							min={1}
							max={1440}
							step={1}
							{...register("durationMinutes", { valueAsNumber: true })}
							required
						/>
					</label>
				</div>
				<label>
					Comentário (opcional)
					<textarea rows={3} maxLength={4000} {...register("notes")} />
				</label>
				{Object.entries(errors).map(([field, error]) => (
					<p key={field} role="alert">
						{error.message}
					</p>
				))}
				<div className={styles.actions}>
					<Button
						variant="outline"
						type="submit"
						disabled={state.mutation.isPending}
					>
						{state.mutation.isPending
							? "Salvando…"
							: state.editing
								? "Salvar sessão"
								: "Registrar sessão"}
					</Button>
					{state.editing && (
						<Button
							type="button"
							variant="ghost"
							disabled={state.mutation.isPending}
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
			{state.mutation.isSuccess && <p role="status">Histórico atualizado.</p>}
			{state.query.isLoading && <p role="status">Carregando sessões…</p>}
			{state.query.isError && (
				<p role="alert">
					{state.query.error.message}{" "}
					<Button variant="ghost" onClick={() => void state.query.refetch()}>
						Tentar novamente
					</Button>
				</p>
			)}
			{state.query.isSuccess && state.query.data.sessions.length === 0 && (
				<p>Nenhuma sessão registrada. As horas anteriores foram preservadas.</p>
			)}
			<ul className={styles.list}>
				{state.query.data?.sessions.map((session) => (
					<li key={session.id}>
						<div>
							<strong>
								{formatSessionDate(session.playedAt)} ·{" "}
								{session.durationMinutes} min
							</strong>
							{session.notes && <p className={styles.notes}>{session.notes}</p>}
						</div>
						{session.pending && (
							<p>
								Aguardando sincronização · gerencie a pendência no aviso
								offline.
							</p>
						)}
						{!session.pending && (
							<div className={styles.actions}>
								<Button
									variant="ghost"
									aria-label={`Editar sessão de ${formatSessionDate(session.playedAt)}`}
									disabled={state.mutation.isPending}
									onClick={() => state.edit(session)}
								>
									Editar
								</Button>
								<Button
									variant="ghost"
									aria-label={`Excluir sessão de ${formatSessionDate(session.playedAt)}`}
									disabled={state.mutation.isPending}
									onClick={() => state.setDeleteId(session.id)}
								>
									Excluir
								</Button>
							</div>
						)}
						{state.deleteId === session.id && (
							<div className={styles.confirm}>
								<p>Excluir esta sessão? As horas serão descontadas do total.</p>
								<Button
									variant="outline"
									disabled={state.mutation.isPending}
									onClick={state.confirmDelete}
								>
									Confirmar exclusão
								</Button>
								<Button variant="ghost" onClick={() => state.setDeleteId(null)}>
									Cancelar
								</Button>
							</div>
						)}
					</li>
				))}
			</ul>
		</section>
	);
}
