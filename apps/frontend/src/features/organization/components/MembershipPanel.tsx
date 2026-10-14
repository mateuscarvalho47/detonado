import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { LibraryEntry } from "@/types/api";
import { useMembership } from "../hooks/useOrganization";
import styles from "./Organization.module.css";
export function MembershipPanel({ game }: { game: LibraryEntry }) {
	const state = useMembership(game);
	return (
		<section className={`${styles.panel} ${styles.detail}`}>
			<h2>Coleções e tags</h2>
			<p>Crie ou renomeie agrupamentos na Biblioteca.</p>
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
						<fieldset key={field} className={styles.checks}>
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
							{state.query.isSuccess && state.query.data[kind].length === 0 && (
								<p>Nenhum agrupamento disponível.</p>
							)}
						</fieldset>
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
