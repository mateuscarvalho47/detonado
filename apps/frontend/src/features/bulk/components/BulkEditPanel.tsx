import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useDraftRegistration } from "@/shared/components/DraftBoundary";
import { STATUS_BY_KEY, STATUSES } from "@/shared/constants/statuses";
import { useBulkDelete } from "../hooks/useBulkDelete";
import { useBulkEdit } from "../hooks/useBulkEdit";
import type { useBulkSelection } from "../hooks/useBulkSelection";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import styles from "./BulkEditPanel.module.css";
export function BulkEditPanel({
	selection,
	visibleCount,
}: {
	selection: ReturnType<typeof useBulkSelection>;
	visibleCount: number;
}) {
	const state = useBulkEdit(selection.selected);
	const deletion = useBulkDelete(selection.selected);
	const busy = state.mutation.isPending || deletion.mutation.isPending;
	useDraftRegistration("bulk", busy);
	useEffect(() => {
		selection.setLocked(busy);
		return () => selection.setLocked(false);
	}, [busy, selection.setLocked]);
	const platforms = [
		...new Set(selection.selected.flatMap((game) => game.platforms)),
	].sort();
	return (
		<section className={styles.panel} aria-labelledby="bulk-title">
			<h2 id="bulk-title">Jogos selecionados</h2>
			<p>
				{selection.selected.length} de {visibleCount} jogos visíveis
				selecionados. Limite de 100 por operação. Jogos que saem dos filtros são
				removidos da seleção.
			</p>
			<div className={styles.actions}>
				<Button
					variant="outline"
					disabled={selection.locked || !visibleCount}
					onClick={selection.selectAll}
				>
					Selecionar até 100 visíveis
				</Button>
				<Button
					variant="ghost"
					disabled={selection.locked}
					onClick={selection.clear}
				>
					Limpar seleção
				</Button>
				<Button
					variant="ghost"
					disabled={selection.locked}
					onClick={selection.cancel}
				>
					Cancelar seleção
				</Button>
			</div>
			<div>
				<Button
					variant="danger"
					disabled={!selection.selected.length || busy}
					onClick={() => {
						state.cancelPreview();
						deletion.review();
					}}
				>
					Excluir selecionados
				</Button>
			</div>
			<BulkDeleteDialog state={deletion} />
			{deletion.cacheError && <p role="alert">{deletion.cacheError}</p>}
			{deletion.mutation.data && (
				<div aria-live="polite">
					<h3>Resultado da exclusão</h3>
					<p>
						{deletion.mutation.data.filter((game) => game.removed).length}{" "}
						jogo(s) excluído(s);{" "}
						{deletion.mutation.data.filter((game) => !game.removed).length}{" "}
						falha(s).
					</p>
					<ul>
						{deletion.mutation.data.map((game) => (
							<li key={game.id}>
								{game.name}:{" "}
								{game.removed ? "Excluído" : `Falhou — ${game.error}`}
							</li>
						))}
					</ul>
				</div>
			)}
			<h3>Editar em lote</h3>
			<form className={styles.form} onSubmit={state.onSubmit}>
				<div className={styles.fields}>
					<fieldset>
						<legend>
							<label>
								<input
									type="checkbox"
									{...state.form.register("applyStatus")}
									disabled={busy}
								/>
								Alterar status
							</label>
						</legend>
						<label>
							Novo status
							<select
								{...state.form.register("status")}
								disabled={!state.values.applyStatus || busy}
							>
								{STATUSES.map((status) => (
									<option key={status.key} value={status.key}>
										{status.label}
									</option>
								))}
							</select>
						</label>
					</fieldset>
					<fieldset>
						<legend>
							<label>
								<input
									type="checkbox"
									{...state.form.register("applyPlatform")}
									disabled={busy}
								/>
								Alterar plataforma
							</label>
						</legend>
						<label>
							Nova plataforma registrada
							<select
								{...state.form.register("userPlatform")}
								disabled={!state.values.applyPlatform || busy}
							>
								<option value="">Limpar plataforma registrada</option>
								{platforms.map((platform) => (
									<option key={platform}>{platform}</option>
								))}
							</select>
						</label>
						<p>
							Jogos incompatíveis com a plataforma escolhida falham sem receber
							outras alterações.
						</p>
					</fieldset>
					<fieldset>
						<legend>
							<label>
								<input
									type="checkbox"
									{...state.form.register("applyTags")}
									disabled={busy}
								/>
								Substituir tags
							</label>
						</legend>
						<p>
							Substitui todas as tags dos jogos selecionados. Sem tags marcadas,
							limpa as tags. Coleções permanecem como estão.
						</p>
						<Controller
							control={state.form.control}
							name="tagIds"
							render={({ field }) => (
								<div className={styles.tags}>
									{state.organization.data?.tags.map((tag) => (
										<label key={tag.id}>
											<input
												type="checkbox"
												checked={field.value.includes(tag.id)}
												disabled={!state.values.applyTags || busy}
												onChange={(event) =>
													field.onChange(
														event.target.checked
															? [...field.value, tag.id]
															: field.value.filter((id) => id !== tag.id),
													)
												}
											/>
											{tag.name}
										</label>
									))}
								</div>
							)}
						/>
						{state.organization.isLoading && (
							<p role="status">Carregando tags…</p>
						)}
						{state.organization.isError && (
							<p role="alert">
								{state.organization.error.message}{" "}
								<Button
									type="button"
									variant="ghost"
									onClick={() => void state.organization.refetch()}
								>
									Tentar novamente
								</Button>
							</p>
						)}
					</fieldset>
				</div>
				{Object.entries(state.form.formState.errors).map(([field, error]) => (
					<p role="alert" key={field}>
						{error.message}
					</p>
				))}
				<div>
					<Button
						variant="outline"
						type="submit"
						disabled={
							!selection.selected.length ||
							busy ||
							(state.values.applyTags && !state.organization.isSuccess)
						}
					>
						Revisar alterações
					</Button>
				</div>
			</form>
			{state.preview && state.previewCurrent && (
				<div className={styles.preview}>
					<h3>
						Confirmar alterações em {state.preview.payload.ids.length} jogo(s)
					</h3>
					<ul>
						{state.preview.payload.ids.map((id) => (
							<li key={id}>{state.preview?.names[id]}</li>
						))}
					</ul>
					<ul>
						{state.preview.payload.changes.status && (
							<li>
								Status:{" "}
								{STATUS_BY_KEY[state.preview.payload.changes.status].label}
							</li>
						)}
						{state.preview.payload.changes.userPlatform !== undefined && (
							<li>
								Plataforma:{" "}
								{state.preview.payload.changes.userPlatform ??
									"Limpar plataforma registrada"}
							</li>
						)}
						{state.preview.payload.changes.tagIds && (
							<li>
								Substituir tags por:{" "}
								{state.preview.payload.changes.tagIds.length
									? state.preview.payload.changes.tagIds
											.map(
												(id) =>
													state.organization.data?.tags.find(
														(tag) => tag.id === id,
													)?.name ?? "Tag indisponível",
											)
											.join(", ")
									: "Nenhuma tag"}
							</li>
						)}
					</ul>
					<div className={styles.actions}>
						<Button variant="outline" disabled={busy} onClick={state.apply}>
							{state.mutation.isPending ? "Aplicando…" : "Confirmar e aplicar"}
						</Button>
						<Button
							variant="ghost"
							disabled={busy}
							onClick={state.cancelPreview}
						>
							Voltar à edição
						</Button>
					</div>
				</div>
			)}
			{state.preview && !state.previewCurrent && (
				<p>
					A seleção ou os campos mudaram. Revise as alterações novamente antes
					de aplicar.
				</p>
			)}
			{state.mutation.isError && (
				<p role="alert">{state.mutation.error.message}</p>
			)}
			{state.cacheError && <p role="alert">{state.cacheError}</p>}
			{state.mutation.data && (
				<div aria-live="polite">
					<h3>Resultado da edição</h3>
					<p>
						{state.mutation.data.summary.updated} jogo(s) atualizado(s);{" "}
						{state.mutation.data.summary.failed} falha(s).
					</p>
					<ul>
						{state.mutation.data.results.map((result) => (
							<li key={result.id}>
								{state.mutation.variables?.names[result.id] ?? "Jogo"}:{" "}
								{result.state === "UPDATED"
									? "Atualizado"
									: `Falhou — ${result.error ?? "Não foi possível atualizar."}`}
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
}
