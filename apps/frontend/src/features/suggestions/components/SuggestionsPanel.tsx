import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { LibraryEntry } from "@/types/api";
import { useSuggestions } from "../hooks/useSuggestions";
import styles from "./SuggestionsPanel.module.css";
export function SuggestionsPanel({ library }: { library: LibraryEntry[] }) {
	const state = useSuggestions(library);
	const {
		register,
		formState: { errors },
	} = state.form;
	return (
		<section className={styles.panel} aria-labelledby="suggestions-title">
			<h2 id="suggestions-title">O que jogar agora?</h2>
			<p>
				Até três jogos da sua fila ou pausados. A duração é uma estimativa da
				história inteira, sem descontar horas jogadas.
			</p>
			{state.preferredPlatform && !state.filters.platform && (
				<p>
					Prioridade para {state.preferredPlatform}; outras plataformas também
					podem aparecer.
				</p>
			)}
			<form onSubmit={state.onSubmit} className={styles.form}>
				<label>
					Plataforma registrada
					<select {...register("platform")}>
						<option value="">Todas as plataformas</option>
						{state.platforms.map((platform) => (
							<option key={platform}>{platform}</option>
						))}
					</select>
				</label>
				<label>
					Gênero
					<select {...register("genre")}>
						<option value="">Todos os gêneros</option>
						{state.genres.map((genre) => (
							<option key={genre}>{genre}</option>
						))}
					</select>
				</label>
				<label>
					Duração total: até (horas)
					<input
						type="number"
						min="0.1"
						max="99999.9"
						step="0.1"
						placeholder="Sem limite"
						{...register("maxHours", {
							setValueAs: (value: string) =>
								value === "" ? "" : Number(value),
						})}
					/>
				</label>
				<div className={styles.actions}>
					<Button variant="outline" type="submit">
						Encontrar jogos
					</Button>
					<Button variant="ghost" type="button" onClick={state.clear}>
						Limpar
					</Button>
				</div>
				{Object.entries(errors).map(([field, error]) => (
					<p key={field} role="alert">
						{error.message}
					</p>
				))}
			</form>
			{state.unknownCount > 0 && (
				<p>
					{state.unknownCount} jogo(s) sem estimativa ficaram de fora por causa
					do limite de horas.
				</p>
			)}
			<div aria-live="polite">
				{state.suggestions.length === 0 ? (
					<p>
						Nenhum jogo atende a esses critérios. Amplie a duração, altere os
						filtros ou adicione jogos à fila.
					</p>
				) : (
					<ul className={styles.list}>
						{state.suggestions.map(({ game, reasons }) => (
							<li key={game.id}>
								<Link
									to="/library/$igdbId"
									params={{ igdbId: String(game.igdbId) }}
								>
									{game.name}
								</Link>
								<p>{reasons.join(" · ")}</p>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
