import { Button } from "@/components/ui/button";
import type { LibraryEntry } from "@/types/api";
import { useChecklist, useCompletionGoal } from "../hooks/useCompletion";
import {
	COMPLETION_GOALS,
	completionEstimate,
} from "../lib/completionEstimate";
import styles from "./CompletionPanel.module.css";
export function CompletionPanel({ game }: { game: LibraryEntry }) {
	const goal = useCompletionGoal(game);
	const checklist = useChecklist(game.id);
	const selectedGoal = goal.form.watch("completionGoal");
	const estimate = completionEstimate(game, selectedGoal);
	const items = checklist.query.data?.items ?? [];
	return (
		<section className={styles.panel} aria-labelledby="completion-title">
			<h2 id="completion-title">Objetivo de conclusão</h2>
			<form onSubmit={goal.onSubmit} className={styles.goalForm}>
				<label>
					Meu objetivo
					<select
						{...goal.form.register("completionGoal", {
							onChange: () => goal.mutation.reset(),
						})}
						disabled={goal.mutation.isPending}
					>
						{COMPLETION_GOALS.map(({ value, label }) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</label>
				<Button
					variant="outline"
					type="submit"
					disabled={goal.mutation.isPending}
				>
					{goal.mutation.isPending ? "Salvando…" : "Salvar objetivo"}
				</Button>
			</form>
			<p>
				{estimate != null
					? `${estimate}h estimadas para este objetivo.`
					: "Sem estimativa para este objetivo."}{" "}
				A estimativa não mede seu progresso real.
			</p>
			{goal.mutation.isError && (
				<p role="alert">{goal.mutation.error.message}</p>
			)}
			{goal.mutation.isSuccess && <p role="status">Objetivo salvo.</p>}
			<h3>Checklist pessoal</h3>
			<p>
				{items.filter((item) => item.completed).length} de {items.length}{" "}
				tarefas marcadas. Marcar tarefas não altera o status do jogo.
			</p>
			<form onSubmit={checklist.onSubmit} className={styles.form}>
				<label>
					{checklist.editing ? "Editar tarefa" : "Nova tarefa"}
					<input
						{...checklist.form.register("text")}
						maxLength={500}
						placeholder="Ex.: terminar as missões secundárias"
					/>
				</label>
				<div className={styles.actions}>
					<Button
						type="submit"
						variant="outline"
						disabled={checklist.mutation.isPending}
					>
						{checklist.editing ? "Salvar tarefa" : "Adicionar tarefa"}
					</Button>
					{checklist.editing && (
						<Button
							type="button"
							variant="ghost"
							onClick={() => checklist.edit(null)}
						>
							Cancelar edição
						</Button>
					)}
				</div>
				{checklist.form.formState.errors.text && (
					<p role="alert">{checklist.form.formState.errors.text.message}</p>
				)}
			</form>
			{checklist.query.isLoading && <p role="status">Carregando checklist…</p>}
			{checklist.query.isError && (
				<p role="alert">
					{checklist.query.error.message}{" "}
					<Button
						variant="ghost"
						onClick={() => void checklist.query.refetch()}
					>
						Tentar novamente
					</Button>
				</p>
			)}
			{checklist.query.isSuccess && items.length === 0 && (
				<p>Nenhuma tarefa adicionada.</p>
			)}
			<ul className={styles.list}>
				{items.map((item) => (
					<li key={item.id}>
						<label>
							<input
								type="checkbox"
								checked={item.completed}
								disabled={checklist.mutation.isPending}
								onChange={(event) =>
									checklist.toggle(item, event.target.checked)
								}
							/>
							<span className={styles.task} data-completed={item.completed}>
								{item.text}
							</span>
						</label>
						<div className={styles.actions}>
							<Button
								variant="ghost"
								disabled={checklist.mutation.isPending}
								aria-label={`Editar ${item.text}`}
								onClick={() => checklist.edit(item)}
							>
								Editar
							</Button>
							<Button
								variant="ghost"
								disabled={checklist.mutation.isPending}
								aria-label={`Excluir ${item.text}`}
								onClick={() => checklist.remove(item.id)}
							>
								Excluir
							</Button>
						</div>
					</li>
				))}
			</ul>
			{checklist.mutation.isPending && <p role="status">Salvando checklist…</p>}
			{checklist.mutation.isError && (
				<p role="alert">{checklist.mutation.error.message}</p>
			)}
			{checklist.mutation.isSuccess && (
				<p role="status">Checklist atualizado.</p>
			)}
		</section>
	);
}
