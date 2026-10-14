import { Button } from "@/components/ui/button";
import { usePreferencesForm } from "../hooks/usePreferencesForm";
import styles from "./Auth.module.css";

export function PreferencesSection() {
	const { form, catalog, mutation, value, onSubmit, selectPlatform } =
		usePreferencesForm();
	return (
		<section className={styles.accountSection}>
			<h2>Plataforma preferida</h2>
			<p>Preenche a plataforma ao adicionar jogos compatíveis.</p>
			<form className={styles.accountForm} onSubmit={onSubmit}>
				<label htmlFor="preferred-platform">Plataforma preferida</label>
				<select
					id="preferred-platform"
					className={styles.preferenceSelect}
					value={value}
					onChange={(event) => selectPlatform(event.target.value)}
					disabled={catalog.isLoading || mutation.isPending}
				>
					<option value="">Sem preferência</option>
					{value && !catalog.data?.platforms.includes(value) && (
						<option value={value}>{value}</option>
					)}
					{catalog.data?.platforms.map((platform) => (
						<option key={platform}>{platform}</option>
					))}
				</select>
				{catalog.isLoading && <p role="status">Carregando plataformas…</p>}
				{catalog.isError && (
					<p role="alert">
						{catalog.error.message}{" "}
						<Button
							type="button"
							variant="outline"
							onClick={() => void catalog.refetch()}
						>
							Tentar novamente
						</Button>
					</p>
				)}
				{form.formState.errors.preferredPlatform && (
					<p role="alert">{form.formState.errors.preferredPlatform.message}</p>
				)}
				{mutation.isError && <p role="alert">{mutation.error.message}</p>}
				{mutation.isSuccess && <p role="status">Preferência salva.</p>}
				<div>
					<Button
						type="submit"
						variant="outline"
						disabled={mutation.isPending || catalog.isLoading}
					>
						{mutation.isPending ? "Salvando…" : "Salvar preferência"}
					</Button>
				</div>
			</form>
		</section>
	);
}
