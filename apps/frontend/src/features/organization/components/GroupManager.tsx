import { Button } from "@/components/ui/button";
import { useDraftRegistration } from "@/shared/components/DraftBoundary";
import { useGroupManager } from "../hooks/useOrganization";
import styles from "./Organization.module.css";
export function GroupManager() {
	const state = useGroupManager();
	useDraftRegistration(
		"organization",
		state.form.formState.isDirty || state.mutation.isPending,
	);
	return (
		<details className={styles.panel}>
			<summary>Coleções e tags pessoais</summary>
			<div className={styles.content}>
				<p>
					Um jogo pode estar em vários agrupamentos. Excluir uma coleção ou tag
					preserva os jogos.
				</p>
				{state.query.isLoading && <p role="status">Carregando agrupamentos…</p>}
				{state.query.isError && (
					<p role="alert">
						{state.query.error.message}{" "}
						<Button variant="ghost" onClick={() => void state.query.refetch()}>
							Tentar novamente
						</Button>
					</p>
				)}
				<form onSubmit={state.onSubmit} className={styles.form}>
					<label>
						Tipo
						<select
							value={state.kind}
							onChange={(event) =>
								state.edit(
									event.target.value === "collections" ? "collections" : "tags",
									null,
								)
							}
							disabled={state.mutation.isPending}
						>
							<option value="collections">Coleção</option>
							<option value="tags">Tag</option>
						</select>
					</label>
					<label>
						Nome
						<input
							{...state.form.register("name")}
							maxLength={100}
							placeholder={
								state.kind === "collections" ? "Jogar no portátil" : "Com mods"
							}
						/>
					</label>
					<div className={styles.actions}>
						<Button
							variant="outline"
							type="submit"
							disabled={state.mutation.isPending}
						>
							{state.editing ? "Salvar nome" : "Criar agrupamento"}
						</Button>
						{state.editing && (
							<Button
								variant="ghost"
								type="button"
								onClick={() => state.edit(state.kind, null)}
							>
								Cancelar edição
							</Button>
						)}
					</div>
					{state.form.formState.errors.name && (
						<p role="alert">{state.form.formState.errors.name.message}</p>
					)}
				</form>
				{state.mutation.isError && (
					<p role="alert">{state.mutation.error.message}</p>
				)}
				{state.mutation.isPending && <p role="status">Salvando…</p>}
				{state.mutation.isSuccess && (
					<p role="status">Agrupamentos atualizados.</p>
				)}
				<div className={styles.columns}>
					{(["collections", "tags"] as const).map((kind) => (
						<section key={kind}>
							<h3>{kind === "collections" ? "Coleções" : "Tags"}</h3>
							{state.query.isSuccess && !state.query.data[kind].length && (
								<p>Nenhum agrupamento criado.</p>
							)}
							<ul className={styles.list}>
								{state.query.data?.[kind].map((group) => (
									<li key={group.id}>
										<span>{group.name}</span>
										<div className={styles.actions}>
											<Button
												variant="ghost"
												aria-label={`Renomear ${group.name}`}
												disabled={state.mutation.isPending}
												onClick={() => state.edit(kind, group)}
											>
												Renomear
											</Button>
											<Button
												variant="ghost"
												aria-label={`Excluir ${group.name}`}
												disabled={state.mutation.isPending}
												onClick={() => state.setDeleting({ kind, group })}
											>
												Excluir
											</Button>
										</div>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
				{state.deleting && (
					<div className={styles.confirm}>
						<p>
							Excluir “{state.deleting.group.name}”? Os jogos permanecem na
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
			</div>
		</details>
	);
}
