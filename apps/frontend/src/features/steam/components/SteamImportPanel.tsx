import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import styles from "@/features/import/components/CsvImportPanel.module.css";
import { ImportMatchResolver } from "@/features/import/components/ImportMatchResolver";
import type { ImportPreviewRow } from "@/features/import/service/importService";
import type { GameSearchResult } from "@/types/api";
import { useSteamImport } from "../hooks/useSteamImport";
import type { SteamGame } from "../service/steamService";

function SteamRow({
	game,
	preview,
	match,
	checked,
	disabled,
	onToggle,
	onResolve,
}: {
	game: SteamGame;
	preview?: ImportPreviewRow;
	match: GameSearchResult | null;
	checked: boolean;
	disabled: boolean;
	onToggle: () => void;
	onResolve: (match: GameSearchResult) => void;
}) {
	const [resolving, setResolving] = useState(false);
	const ready = preview?.state === "READY";
	return (
		<li className={styles.row}>
			<strong>{game.name}</strong>
			<p>
				Steam {game.appId} ·{" "}
				{game.hoursPlayed.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
				h acumuladas na Steam
			</p>
			<p>
				{match
					? `Correspondência: ${match.name} · IGDB ${match.igdbId}`
					: "Escolha a correspondência no IGDB."}
			</p>
			{preview?.state === "DUPLICATE" && (
				<p>
					Já está na biblioteca ou nesta página. Será ignorado; horas e
					campanhas existentes permanecem como estão.
				</p>
			)}
			{preview?.error && <p role="alert">{preview.error}</p>}
			{ready && (
				<label className={styles.selection}>
					<input
						type="checkbox"
						checked={checked}
						disabled={disabled}
						onChange={onToggle}
					/>
					Importar {game.name}
				</label>
			)}
			<div>
				<Button
					variant="ghost"
					disabled={disabled}
					onClick={() => setResolving((value) => !value)}
				>
					{resolving
						? "Fechar busca"
						: match
							? "Alterar correspondência"
							: "Escolher jogo"}
				</Button>
			</div>
			{resolving && (
				<ImportMatchResolver
					name={game.name}
					disabled={disabled}
					onSelect={(selected) => {
						onResolve(selected);
						setResolving(false);
					}}
				/>
			)}
		</li>
	);
}
export function SteamImportPanel() {
	const state = useSteamImport();
	const finished = state.batch.commit.isSuccess;
	return (
		<details className={styles.panel}>
			<summary>Importar biblioteca Steam</summary>
			<div className={styles.content}>
				{state.status.isLoading && (
					<p role="status">Consultando integração Steam…</p>
				)}
				{state.status.isError && (
					<p role="alert">
						{state.status.error.message}{" "}
						<Button variant="ghost" onClick={() => void state.status.refetch()}>
							Tentar novamente
						</Button>
					</p>
				)}
				{state.status.isSuccess && !state.status.data.configured && (
					<p>
						A importação Steam ainda não está disponível neste servidor. Você
						pode continuar usando a busca e a importação CSV.
					</p>
				)}
				{state.status.data?.configured && !state.status.data.steamId && (
					<p>
						Conecte sua conta Steam nas <Link to="/account">configurações</Link>{" "}
						para consultar seus jogos.
					</p>
				)}
				{state.status.data?.configured && state.status.data.steamId && (
					<>
						<p>
							SteamID verificado: {state.status.data.steamId}. A biblioteca
							precisa estar acessível à consulta Steam.
						</p>
						<p>
							Revise as correspondências antes de importar. Apenas jogos novos
							entram na Fila. Duplicatas são sempre ignoradas. Horas acumuladas
							na Steam entram como horas anteriores, sem sessões datadas.
						</p>
						<div>
							<Button
								variant="outline"
								disabled={state.busy}
								onClick={() => state.load(state.source?.offset ?? 0)}
							>
								{state.page.isPending
									? "Consultando Steam…"
									: state.source
										? "Atualizar esta página"
										: "Preparar prévia Steam"}
							</Button>
						</div>
					</>
				)}
				{state.page.isError && <p role="alert">{state.page.error.message}</p>}
				{state.preview.isError && (
					<p role="alert">
						{state.preview.error.message}{" "}
						<Button
							variant="ghost"
							disabled={state.busy}
							onClick={state.retryPreview}
						>
							Repetir prévia
						</Button>
					</p>
				)}
				{state.preview.isPending && (
					<p role="status">Verificando jogos e duplicatas…</p>
				)}
				{state.source && (
					<>
						<h3>
							Jogos {state.source.rows.length ? state.source.offset + 1 : 0}–
							{state.source.offset + state.source.rows.length} de{" "}
							{state.source.total}
						</h3>
						{state.source.rows.length === 0 && (
							<p>Nenhum jogo foi retornado nesta página.</p>
						)}
						<ol className={styles.rows}>
							{state.source.rows.map((game, index) => (
								<SteamRow
									key={`${state.source?.offset}:${game.appId}`}
									game={game}
									preview={state.preview.data?.rows.find(
										(row) => row.index === index,
									)}
									match={state.overrides[game.appId] ?? game.match}
									checked={!state.excluded.has(index)}
									disabled={state.busy || finished}
									onToggle={() => state.toggle(index)}
									onResolve={(match) => state.resolve(game.appId, match)}
								/>
							))}
						</ol>
						<div>
							<Button
								variant="outline"
								disabled={state.busy || finished || !state.ready.length}
								onClick={state.start}
							>
								Importar {state.ready.length} jogo(s) novo(s) desta página
							</Button>
						</div>
						<div>
							<Button
								variant="ghost"
								disabled={state.busy || state.source.offset === 0}
								onClick={() =>
									state.load(
										Math.max(
											0,
											(state.source?.offset ?? 0) - (state.source?.limit ?? 50),
										),
									)
								}
							>
								Página anterior
							</Button>
							<Button
								variant="ghost"
								disabled={state.busy || !state.source.hasMore}
								onClick={() =>
									state.load(
										(state.source?.offset ?? 0) + (state.source?.limit ?? 50),
									)
								}
							>
								Próxima página
							</Button>
						</div>
					</>
				)}
				{state.batch.commit.isPending && (
					<div role="status">
						<p>
							Processados {state.batch.progress.completed} de{" "}
							{state.batch.progress.total} jogos.
						</p>
						<progress
							value={state.batch.progress.completed}
							max={state.batch.progress.total || 1}
							aria-label="Progresso da importação Steam"
						/>
					</div>
				)}
				{state.batch.cacheError && <p role="alert">{state.batch.cacheError}</p>}
				{state.batch.results.length > 0 && (
					<div aria-live="polite">
						<h3>
							{finished
								? "Importação desta página encerrada"
								: "Resultado parcial"}
						</h3>
						<ul className={styles.results}>
							{state.batch.results.map((result) => (
								<li key={result.index}>
									{state.source?.rows[result.index - state.source.offset]
										?.name ?? `Jogo ${result.index + 1}`}
									:{" "}
									{result.state === "ADDED"
										? "Adicionado"
										: result.state === "SKIPPED"
											? "Ignorado; já está na biblioteca"
											: result.state === "FAILED"
												? `Falhou — ${result.error ?? "Não foi possível importar."}`
												: "Atualizado"}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</details>
	);
}
