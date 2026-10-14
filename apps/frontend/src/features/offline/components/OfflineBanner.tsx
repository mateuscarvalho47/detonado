import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LibraryEntry } from "@/types/api";
import { useOfflineSync } from "../hooks/useOfflineSync";
import type { QueuedSession } from "../service/offlineService";
import styles from "./OfflineBanner.module.css";

function PendingSession({
	row,
	game,
	busy,
	onDiscard,
	onRetry,
	onMove,
}: {
	row: QueuedSession;
	game?: Pick<LibraryEntry, "igdbId" | "name">;
	busy: boolean;
	onDiscard: () => void;
	onRetry: () => void;
	onMove: () => void;
}) {
	const [confirm, setConfirm] = useState(false);
	const [discarding, setDiscarding] = useState(false);
	return (
		<li className={styles.item}>
			{game ? (
				<Link
					to="/library/$igdbId"
					params={{ igdbId: String(game.igdbId) }}
					aria-label={`Abrir registro de ${game.name}`}
				>
					{game.name}
				</Link>
			) : (
				<strong>Jogo não disponível nesta biblioteca</strong>
			)}
			<p>
				{new Date(row.payload.playedAt).toLocaleString("pt-BR")} ·{" "}
				{row.payload.durationMinutes} min
			</p>
			{row.payload.notes && <p className={styles.notes}>{row.payload.notes}</p>}
			{row.error && <p role="alert">{row.error}</p>}
			<p>
				{row.error
					? "Confira o histórico do jogo antes de registrar outra sessão."
					: "Aguardando sincronização."}
			</p>
			<div className={styles.actions}>
				{row.error && (
					<Button variant="outline" disabled={busy} onClick={onRetry}>
						Tentar novamente
					</Button>
				)}
				<Button
					variant="ghost"
					disabled={busy}
					onClick={() => setDiscarding(true)}
				>
					Descartar pendência
				</Button>
			</div>
			{row.status === 409 && (
				<div className={styles.confirm}>
					<label>
						<input
							type="checkbox"
							checked={confirm}
							onChange={(event) => setConfirm(event.target.checked)}
							disabled={busy}
						/>
						Conferi o histórico e quero registrar uma nova sessão na campanha
						atual.
					</label>
					<Button
						variant="outline"
						disabled={!confirm || busy}
						onClick={onMove}
					>
						Registrar como nova sessão
					</Button>
				</div>
			)}
			{discarding && (
				<div className={styles.confirm}>
					<p>
						Descartar este registro local? Isso não exclui sessões já gravadas
						no servidor.
					</p>
					<Button variant="outline" disabled={busy} onClick={onDiscard}>
						Confirmar descarte
					</Button>
					<Button
						variant="ghost"
						disabled={busy}
						onClick={() => setDiscarding(false)}
					>
						Cancelar
					</Button>
				</div>
			)}
		</li>
	);
}

export function OfflineBanner({ authenticated }: { authenticated: boolean }) {
	const state = useOfflineSync(authenticated);
	if (!authenticated)
		return state.rows.length > 0 ? (
			<aside className={styles.banner}>
				<p>
					Entre novamente na mesma conta para sincronizar registros pendentes.
				</p>
			</aside>
		) : null;
	if (state.online && !state.cached && !state.rows.length && !state.error)
		return null;
	return (
		<aside className={styles.banner} aria-label="Conexão e sessões pendentes">
			<p role="status">
				{state.cached || !state.online
					? "Usando os dados salvos neste navegador."
					: "Conexão disponível."}{" "}
				{state.rows.length > 0
					? `${state.rows.length} sessão(ões) aguardando sincronização.`
					: ""}
			</p>
			<p>
				Sessões pendentes ainda não entram no total de horas do servidor. As
				outras alterações precisam de conexão.
			</p>
			{state.error && <p role="alert">{state.error}</p>}
			<Button
				variant="outline"
				disabled={state.busy}
				onClick={() => void state.synchronize()}
			>
				{state.busy ? "Sincronizando…" : "Sincronizar agora"}
			</Button>
			{state.rows.length > 0 && (
				<details id="offline-pending">
					<summary>Ver registros pendentes</summary>
					<ul className={styles.list}>
						{state.rows.map((row) => (
							<PendingSession
								key={row.payload.clientId}
								row={row}
								game={state.gameForRow(row)}
								busy={state.busy}
								onDiscard={() => void state.discard(row)}
								onRetry={() => void state.retry(row)}
								onMove={() => void state.move(row)}
							/>
						))}
					</ul>
				</details>
			)}
		</aside>
	);
}
