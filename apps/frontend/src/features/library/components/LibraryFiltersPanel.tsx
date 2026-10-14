import { Button } from "@/components/ui/button";
import { useMe } from "@/features/auth/hooks/useAuth";
import { useOrganization } from "@/features/organization/hooks/useOrganization";
import { STATUSES } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";
import type { useLibraryFilters } from "../hooks/useLibraryFilters";
import { useSavedFilters } from "../hooks/useSavedFilters";
import styles from "./LibraryFiltersPanel.module.css";

export function LibraryFiltersPanel({
	library,
	filters,
}: {
	library: LibraryEntry[];
	filters: ReturnType<typeof useLibraryFilters>;
}) {
	const { data: user } = useMe();
	const organization = useOrganization();
	const saved = useSavedFilters(filters.criteria, filters.restore);
	const platforms = [
		...new Set(
			library
				.map((game) => game.userPlatform)
				.filter((value): value is string => !!value),
		),
	].sort();
	const genres = [...new Set(library.flatMap((game) => game.genres))].sort();
	const { advanced, setAdvanced } = filters;
	return (
		<details className={styles.panel}>
			<summary>Combinar e salvar filtros</summary>
			<div className={styles.content}>
				<fieldset className={styles.statuses}>
					<legend>Status</legend>
					{STATUSES.map((status) => (
						<label key={status.key}>
							<input
								type="checkbox"
								checked={filters.activeStatuses.includes(status.key)}
								onChange={(event) =>
									setAdvanced((current) => ({
										...current,
										statuses: event.target.checked
											? [...filters.activeStatuses, status.key]
											: filters.activeStatuses.filter(
													(value) => value !== status.key,
												),
									}))
								}
							/>
							{status.label}
						</label>
					))}
				</fieldset>
				<div className={styles.fields}>
					<label>
						Plataforma registrada
						<select
							value={advanced.platform ?? ""}
							onChange={(event) =>
								setAdvanced((current) => ({
									...current,
									platform: event.target.value || undefined,
								}))
							}
						>
							<option value="">Todas</option>
							{advanced.platform && !platforms.includes(advanced.platform) && (
								<option>{advanced.platform}</option>
							)}
							{platforms.map((value) => (
								<option key={value}>{value}</option>
							))}
						</select>
					</label>
					<label>
						Gênero
						<select
							value={advanced.genre ?? ""}
							onChange={(event) =>
								setAdvanced((current) => ({
									...current,
									genre: event.target.value || undefined,
								}))
							}
						>
							<option value="">Todos</option>
							{advanced.genre && !genres.includes(advanced.genre) && (
								<option>{advanced.genre}</option>
							)}
							{genres.map((value) => (
								<option key={value}>{value}</option>
							))}
						</select>
					</label>
					<label>
						Principal: até (horas)
						<input
							type="number"
							min="0.1"
							max="99999.9"
							step="0.1"
							placeholder="Sem limite"
							value={advanced.maxHours ?? ""}
							onChange={(event) => {
								const value = event.target.valueAsNumber;
								setAdvanced((current) => ({
									...current,
									maxHours:
										Number.isFinite(value) && value > 0 ? value : undefined,
								}));
							}}
						/>
					</label>
				</div>
				<div className={styles.fields}>
					{(
						[
							{ kind: "collections", field: "collectionId", label: "Coleção" },
							{ kind: "tags", field: "tagId", label: "Tag" },
						] as const
					).map(({ kind, field, label }) => (
						<label key={field}>
							{label}
							<select
								value={advanced[field] ?? ""}
								disabled={organization.isLoading}
								onChange={(event) =>
									setAdvanced((current) => ({
										...current,
										[field]: event.target.value || undefined,
									}))
								}
							>
								<option value="">Todas</option>
								{advanced[field] &&
									!organization.data?.[kind].some(
										(group) => group.id === advanced[field],
									) && (
										<option value={advanced[field]}>
											Agrupamento indisponível
										</option>
									)}
								{organization.data?.[kind].map((group) => (
									<option key={group.id} value={group.id}>
										{group.name}
									</option>
								))}
							</select>
						</label>
					))}
				</div>
				{organization.isLoading && (
					<p role="status">Carregando coleções e tags…</p>
				)}
				{organization.isError && (
					<p role="alert">
						{organization.error.message}{" "}
						<Button variant="ghost" onClick={() => void organization.refetch()}>
							Tentar novamente
						</Button>
					</p>
				)}

				<label className={styles.check}>
					<input
						type="checkbox"
						checked={advanced.includeUnknownDuration ?? false}
						onChange={(event) =>
							setAdvanced((current) => ({
								...current,
								includeUnknownDuration: event.target.checked,
							}))
						}
					/>
					Incluir jogos sem estimativa quando houver limite de horas
				</label>
				<div className={styles.actions}>
					{user?.preferredPlatform && (
						<Button
							variant="outline"
							onClick={() =>
								setAdvanced((current) => ({
									...current,
									platform: user.preferredPlatform ?? undefined,
								}))
							}
						>
							Minha plataforma: {user.preferredPlatform}
						</Button>
					)}
					<Button
						variant="ghost"
						onClick={() => {
							filters.clear();
							saved.select("");
						}}
					>
						Limpar todos os filtros
					</Button>
				</div>
				<div className={styles.saved}>
					<label>
						Filtros salvos
						<select
							value={saved.selectedId}
							disabled={saved.query.isLoading}
							onChange={(event) => saved.select(event.target.value)}
						>
							<option value="">Escolha uma busca salva</option>
							{saved.query.data?.filters.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
						</select>
					</label>
					{saved.query.isLoading && (
						<p role="status">Carregando buscas salvas…</p>
					)}
					{saved.query.isError && (
						<p role="alert">
							{saved.query.error.message}{" "}
							<Button
								variant="ghost"
								onClick={() => void saved.query.refetch()}
							>
								Tentar novamente
							</Button>
						</p>
					)}
					<form onSubmit={saved.save} className={styles.saveForm}>
						<label>
							Nome da busca
							<input
								{...saved.form.register("name")}
								maxLength={100}
								placeholder="Curtos para o fim de semana"
							/>
						</label>
						<div className={styles.actions}>
							<Button
								type="submit"
								variant="outline"
								disabled={saved.mutation.isPending}
							>
								Salvar como nova busca
							</Button>
							{saved.selectedId && (
								<>
									<Button
										type="button"
										variant="outline"
										onClick={() => void saved.update()}
										disabled={saved.mutation.isPending}
									>
										Atualizar busca
									</Button>
									<Button
										type="button"
										variant="ghost"
										onClick={saved.remove}
										disabled={saved.mutation.isPending}
									>
										Excluir busca
									</Button>
								</>
							)}
						</div>
						{saved.form.formState.errors.name && (
							<p role="alert">{saved.form.formState.errors.name.message}</p>
						)}
						{saved.form.formState.errors.filters && (
							<p role="alert">
								Revise os filtros: nome e busca até 100 caracteres; limite de
								horas entre 0,1 e 99.999,9.
							</p>
						)}
						{saved.mutation.isError && (
							<p role="alert">{saved.mutation.error.message}</p>
						)}
						{saved.mutation.isPending && <p role="status">Salvando…</p>}
						{saved.mutation.isSuccess && (
							<p role="status">Buscas salvas atualizadas.</p>
						)}
					</form>
				</div>
			</div>
		</details>
	);
}
