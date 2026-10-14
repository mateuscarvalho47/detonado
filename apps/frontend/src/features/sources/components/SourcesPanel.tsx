import { Button } from "@/components/ui/button";
import { formatSessionDate } from "@/features/sessions/lib/sessionTime";
import { useDraftRegistration } from "@/shared/components/DraftBoundary";
import type { LibraryEntry } from "@/types/api";
import { useSources } from "../hooks/useSources";
import { SOURCE_KINDS } from "../lib/sourceKinds";
import styles from "./SourcesPanel.module.css";
export function SourcesPanel({ game }: { game: LibraryEntry }) {
	const state = useSources(game);
	useDraftRegistration(
		"sources",
		state.form.formState.isDirty || state.mutation.isPending,
	);
	return (
		<section className={styles.panel} aria-labelledby="sources-title">
			<h2 id="sources-title">Origem e disponibilidade</h2>
			<p>
				Registre onde possui ou acessa este jogo. Loja, assinatura e empréstimo
				são separados da plataforma em que você joga.
			</p>
			<form className={styles.form} onSubmit={state.onSubmit}>
				<div className={styles.fields}>
					<label>
						Tipo de origem
						<select {...state.form.register("kind")}>
							{SOURCE_KINDS.map((kind) => (
								<option key={kind.value} value={kind.value}>
									{kind.label}
								</option>
							))}
						</select>
					</label>
					<label>
						Nome da origem
						<input
							{...state.form.register("label")}
							maxLength={200}
							placeholder="Ex.: Steam, Game Pass, mídia física"
						/>
					</label>
					<label>
						Vencimento: data e hora local (opcional)
						<input
							type="datetime-local"
							{...state.form.register("expiresAt")}
						/>
					</label>
				</div>
				<p>Deixe o vencimento vazio para registrar acesso sem prazo.</p>
				{Object.entries(state.form.formState.errors).map(([field, error]) => (
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
								? "Salvar origem"
								: "Adicionar origem"}
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
			{state.query.isLoading && <p role="status">Carregando origens…</p>}
			{state.query.isError && (
				<p role="alert">
					{state.query.error.message}{" "}
					<Button variant="ghost" onClick={() => void state.query.refetch()}>
						Tentar novamente
					</Button>
				</p>
			)}
			{state.mutation.isError && (
				<p role="alert">{state.mutation.error.message}</p>
			)}
			{state.mutation.isSuccess && <p role="status">Origens atualizadas.</p>}
			{state.query.isSuccess && !state.query.data.sources.length && (
				<p>Nenhuma origem registrada. A disponibilidade é desconhecida.</p>
			)}
			<ul className={styles.list}>
				{state.query.data?.sources.map((source) => (
					<li key={source.id}>
						<div>
							<strong>{source.label}</strong>
							<p>
								{SOURCE_KINDS.find((kind) => kind.value === source.kind)?.label}{" "}
								·{" "}
								{source.expiresAt
									? `${new Date(source.expiresAt).getTime() <= state.now ? "Vencida em" : "Disponível até"} ${formatSessionDate(source.expiresAt)}`
									: "Disponível sem prazo"}
							</p>
						</div>
						<div className={styles.actions}>
							<Button
								variant="ghost"
								disabled={state.mutation.isPending}
								aria-label={`Editar origem ${source.label}`}
								onClick={() => state.edit(source)}
							>
								Editar
							</Button>
							<Button
								variant="ghost"
								disabled={state.mutation.isPending}
								aria-label={`Excluir origem ${source.label}`}
								onClick={() => state.setDeleting(source)}
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
						Excluir a origem “{state.deleting.label}”? O jogo permanece na
						biblioteca.
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
