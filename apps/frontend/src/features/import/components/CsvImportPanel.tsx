import { useState } from "react";
import { Button } from "@/components/ui/button";
import { COMPLETION_GOALS } from "@/features/completion/lib/completionEstimate";
import { useGameSearch } from "@/features/search/hooks/useGameSearch";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useCsvImport } from "../hooks/useCsvImport";
import type { ImportPreviewRow, ImportRow } from "../service/importService";
import styles from "./CsvImportPanel.module.css";

const STATE_LABELS = {
	READY: "Pronto para adicionar",
	DUPLICATE: "Já está na biblioteca ou neste arquivo",
	NEEDS_MATCH: "Escolha o jogo correspondente",
	INVALID: "Linha inválida",
};
const RESULT_LABELS = {
	ADDED: "Adicionado",
	UPDATED: "Atualizado",
	SKIPPED: "Ignorado",
	FAILED: "Falhou",
};
function MatchResolver({
	name,
	disabled,
	onSelect,
}: {
	name: string;
	disabled: boolean;
	onSelect: (igdbId: number) => void;
}) {
	const [search, setSearch] = useState(name);
	const query = useGameSearch(useDebounce(search, 300));
	return (
		<div className={styles.resolver}>
			<label>
				Buscar correspondência no IGDB
				<input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					minLength={2}
					maxLength={200}
					disabled={disabled}
				/>
			</label>
			{search.trim().length < 2 ? (
				<p>Digite pelo menos dois caracteres.</p>
			) : query.isFetching ? (
				<p role="status">Buscando jogos…</p>
			) : query.isError ? (
				<p role="alert">
					{query.error.message}{" "}
					<Button variant="ghost" onClick={() => void query.refetch()}>
						Tentar novamente
					</Button>
				</p>
			) : !query.data?.length ? (
				<p>Nenhum jogo encontrado. Ajuste o nome.</p>
			) : (
				<ul>
					{query.data.map((game) => (
						<li key={game.igdbId}>
							<Button
								variant="outline"
								disabled={disabled}
								onClick={() => onSelect(game.igdbId)}
							>
								{game.name} · {game.releaseYear ?? "Ano não informado"} ·{" "}
								{game.platforms.slice(0, 2).join(", ")} · IGDB {game.igdbId}
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
function inputSummary(input: ImportRow) {
	const fields: string[] = [];
	if (input.status) fields.push(`Status: ${STATUS_BY_KEY[input.status].label}`);
	if (input.userPlatform !== undefined)
		fields.push(`Plataforma: ${input.userPlatform ?? "vazia"}`);
	if (input.hoursPlayed !== undefined)
		fields.push(`Horas totais: ${input.hoursPlayed ?? 0}`);
	if (input.rating !== undefined)
		fields.push(`Avaliação: ${input.rating ?? "vazia"}`);
	if (input.completionGoal)
		fields.push(
			`Objetivo: ${COMPLETION_GOALS.find((goal) => goal.value === input.completionGoal)?.label}`,
		);
	if (input.completedAt !== undefined)
		fields.push(`Conclusão: ${input.completedAt ?? "vazia"}`);
	if (input.notes !== undefined)
		fields.push(`Notas: ${input.notes ?? "vazias"}`);
	return (
		fields.join(" · ") ||
		"Apenas identificação do jogo; novos registros entram na Fila."
	);
}
function PreviewRow({
	row,
	rawName,
	disabled,
	onChange,
}: {
	row: ImportPreviewRow;
	rawName?: string;
	disabled: boolean;
	onChange: (changes: {
		igdbId?: number;
		duplicateAction?: "SKIP" | "UPDATE";
	}) => void;
}) {
	const [resolving, setResolving] = useState(false);
	const input = row.input;
	return (
		<li className={styles.row}>
			<div>
				<strong>
					Registro {row.index + 1}:{" "}
					{input?.name ?? rawName ?? `IGDB ${input?.igdbId ?? "não informado"}`}
				</strong>
				<p>
					{STATE_LABELS[row.state]}
					{input?.igdbId ? ` · IGDB ${input.igdbId}` : ""}
				</p>
			</div>
			{row.error && <p role="alert">{row.error}</p>}
			{input && <p className={styles.summary}>{inputSummary(input)}</p>}
			{row.state === "DUPLICATE" && (
				<label>
					Ação para o registro {row.index + 1}
					<select
						value={input?.duplicateAction ?? "SKIP"}
						disabled={disabled}
						onChange={(event) =>
							onChange({
								duplicateAction:
									event.target.value === "UPDATE" ? "UPDATE" : "SKIP",
							})
						}
					>
						<option value="SKIP">Ignorar e manter o registro existente</option>
						<option value="UPDATE">
							Atualizar os campos preenchidos nesta linha
						</option>
					</select>
				</label>
			)}
			{row.state === "DUPLICATE" && input?.duplicateAction === "UPDATE" && (
				<p>
					Os campos exibidos acima substituirão os valores existentes. Campos
					vazios no CSV permanecem como estão.
				</p>
			)}
			{(row.state === "NEEDS_MATCH" || !!input?.igdbId) && (
				<div>
					<Button
						variant="ghost"
						disabled={disabled}
						onClick={() => setResolving((value) => !value)}
					>
						{resolving
							? "Fechar busca"
							: input?.igdbId
								? "Alterar correspondência"
								: "Escolher jogo"}
					</Button>
				</div>
			)}
			{resolving && (
				<MatchResolver
					name={input?.name ?? rawName ?? ""}
					disabled={disabled}
					onSelect={(igdbId) => {
						onChange({ igdbId });
						setResolving(false);
					}}
				/>
			)}
		</li>
	);
}
export function CsvImportPanel() {
	const state = useCsvImport();
	const busy =
		state.reading || state.preview.isPending || state.commit.isPending;
	const finished = state.commit.isSuccess;
	const counts = { added: 0, updated: 0, skipped: 0, failed: 0 };
	for (const result of state.results) {
		if (result.state === "ADDED") counts.added++;
		else if (result.state === "UPDATED") counts.updated++;
		else if (result.state === "SKIPPED") counts.skipped++;
		else counts.failed++;
	}
	return (
		<details className={styles.panel}>
			<summary>Importar biblioteca por CSV</summary>
			<div className={styles.content}>
				<p>
					Até 100 jogos por arquivo, no máximo 1 MB. Use vírgula como separador
					e cabeçalhos do modelo. Nome sem IGDB exige escolher a correspondência
					antes de importar.
				</p>
				<p>
					Status: WISHLIST, BACKLOG, PLAYING, PAUSED, COMPLETED ou DROPPED. Sem
					status, novos jogos entram na Fila. Horas usam ponto decimal;
					conclusão usa AAAA-MM-DD. Campos vazios não apagam dados.
				</p>
				<div>
					<Button variant="outline" onClick={state.downloadTemplate}>
						Baixar modelo CSV
					</Button>
				</div>
				<label>
					Arquivo CSV
					<input
						type="file"
						accept=".csv,text/csv"
						disabled={busy}
						onChange={(event) => {
							void state.loadFile(event.target.files?.[0]);
							event.target.value = "";
						}}
					/>
				</label>
				{state.fileName && <p>Arquivo: {state.fileName}</p>}
				{state.error && <p role="alert">{state.error}</p>}
				{state.preview.isError && !state.error && (
					<p role="alert">{state.preview.error.message}</p>
				)}
				{(state.reading || state.preview.isPending) && (
					<p role="status">Preparando prévia…</p>
				)}
				{state.preview.data && (
					<>
						<h3>Prévia: {state.preview.data.rows.length} registro(s)</h3>
						<p>
							{state.ready.length} linha(s) podem ser processadas;{" "}
							{state.blocked} aguardam correção ou correspondência. Duplicatas
							começam como Ignorar. Escolha Atualizar em cada linha que deseja
							substituir.
						</p>
						<ol className={styles.rows}>
							{state.preview.data.rows.map((row) => (
								<PreviewRow
									key={row.index}
									row={row}
									rawName={
										state.rows[row.index]?.name !== undefined
											? String(state.rows[row.index]?.name)
											: undefined
									}
									disabled={busy || finished}
									onChange={(changes) =>
										void state.changeRow(row.index, changes)
									}
								/>
							))}
						</ol>
						<div>
							<Button
								variant="outline"
								disabled={busy || finished || !state.ready.length}
								onClick={state.start}
							>
								Importar {state.ready.length} linha(s) válidas
							</Button>
						</div>
					</>
				)}
				{state.commit.isPending && (
					<div role="status">
						<p>
							Processados {state.progress.completed} de {state.progress.total}{" "}
							registros.
						</p>
						<progress
							value={state.progress.completed}
							max={state.progress.total || 1}
							aria-label="Progresso da importação"
						/>
					</div>
				)}
				{(state.results.length > 0 || finished) && (
					<div aria-live="polite">
						<h3>{finished ? "Importação encerrada" : "Resultado parcial"}</h3>
						<p>
							{counts.added} adicionado(s), {counts.updated} atualizado(s),{" "}
							{counts.skipped} ignorado(s), {counts.failed} falha(s).{" "}
							{state.blocked} linha(s) não foram enviadas.
						</p>
						<ul className={styles.results}>
							{state.results.map((result) => (
								<li key={result.index}>
									Registro {result.index + 1}: {RESULT_LABELS[result.state]}
									{result.error ? ` — ${result.error}` : ""}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</details>
	);
}
