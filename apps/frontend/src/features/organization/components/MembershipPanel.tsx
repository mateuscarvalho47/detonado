import { Link } from "@tanstack/react-router";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useDraftRegistration } from "@/shared/components/DraftBoundary";
import type { LibraryEntry } from "@/types/api";
import { useMembership } from "../hooks/useOrganization";
import styles from "./Organization.module.css";
export function MembershipPanel({ game }: { game: LibraryEntry }) {
	const state = useMembership(game);
	useDraftRegistration(
		"membership",
		state.form.formState.isDirty || state.mutation.isPending,
	);
	return (
		<section className={`${styles.panel} ${styles.detail}`}>
			<h2>Coleções</h2>
			<p>
				{state.query.data?.collections
					.filter((group) =>
						state.form.watch("collectionIds").includes(group.id),
					)
					.map((group) => group.name)
					.join(" · ") || "Nenhuma coleção selecionada."}
			</p>
			<p>
				<Link to="/collections">Gerenciar coleções e tags</Link>
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
			<form onSubmit={state.onSubmit} className={styles.content}>
				<div className={styles.columns}>
					{(
						[
							{
								kind: "collections",
								field: "collectionIds",
								label: "Coleções",
							},
							{ kind: "tags", field: "tagIds", label: "Tags" },
						] as const
					).map(({ kind, field, label }) => (
						<details key={field}>
							<summary>
								{kind === "collections"
									? "Escolher coleções"
									: "Tags · organização avançada"}
							</summary>
							<fieldset className={styles.checks}>
								<legend>{label}</legend>
								<Controller
									control={state.form.control}
									name={field}
									render={({ field: input }) => (
										<>
											{state.query.data?.[kind].map((group) => (
												<label key={group.id}>
													<input
														type="checkbox"
														checked={input.value.includes(group.id)}
														disabled={state.mutation.isPending}
														onChange={(event) => {
															state.mutation.reset();
															input.onChange(
																event.target.checked
																	? [...input.value, group.id]
																	: input.value.filter((id) => id !== group.id),
															);
														}}
													/>
													{group.name}
												</label>
											))}
										</>
									)}
								/>
								{state.query.isSuccess &&
									state.query.data[kind].length === 0 && (
										<p>Nenhum agrupamento disponível.</p>
									)}
							</fieldset>
						</details>
					))}
				</div>
				<div>
					<Button
						variant="outline"
						type="submit"
						disabled={!state.query.isSuccess || state.mutation.isPending}
					>
						{state.mutation.isPending ? "Salvando…" : "Salvar agrupamentos"}
					</Button>
				</div>
				{Object.entries(state.form.formState.errors).map(([field, error]) => (
					<p role="alert" key={field}>
						{error.message}
					</p>
				))}
				{state.mutation.isError && (
					<p role="alert">{state.mutation.error.message}</p>
				)}
				{state.mutation.isSuccess && <p role="status">Agrupamentos salvos.</p>}
			</form>
		</section>
	);
}
