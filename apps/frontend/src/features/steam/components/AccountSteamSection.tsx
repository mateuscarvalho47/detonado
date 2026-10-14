import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import styles from "@/features/auth/components/Auth.module.css";
import { useSteamConnection } from "../hooks/useSteamConnection";
export function AccountSteamSection() {
	const state = useSteamConnection();
	const busy =
		state.connect.isPending ||
		state.verify.isPending ||
		state.disconnect.isPending;
	return (
		<section className={styles.accountSection}>
			<h2>Steam</h2>
			{state.query.isLoading && (
				<p role="status">Consultando integração Steam…</p>
			)}
			{state.query.isError && (
				<p role="alert">
					{state.query.error.message}{" "}
					<Button variant="ghost" onClick={() => void state.query.refetch()}>
						Tentar novamente
					</Button>
				</p>
			)}
			{state.verify.isPending && (
				<p role="status">Verificando conexão Steam…</p>
			)}
			{state.verify.isSuccess && <p role="status">Steam conectada.</p>}
			{state.query.isSuccess && !state.query.data.configured && (
				<p>
					A importação Steam ainda não está disponível neste servidor. As demais
					funções da biblioteca continuam disponíveis.
				</p>
			)}
			{state.query.data?.steamId ? (
				<>
					<p>SteamID verificado: {state.query.data.steamId}</p>
					<p>
						A conexão vale para esta sessão. Os jogos entram na biblioteca
						somente após você revisar e confirmar a importação.
					</p>
					<div>
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => state.disconnect.mutate()}
						>
							Desconectar Steam
						</Button>
					</div>
					<Link to="/library">Ir à biblioteca para importar</Link>
				</>
			) : state.query.data?.configured ? (
				<>
					<p>
						Conecte sua conta pelo site oficial da Steam para consultar seus
						jogos. A visibilidade da biblioteca pode limitar a consulta.
					</p>
					<div>
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => state.connect.mutate()}
						>
							{state.connect.isPending ? "Abrindo Steam…" : "Conectar Steam"}
						</Button>
					</div>
				</>
			) : null}
			{state.disconnect.isSuccess && (
				<p role="status">
					Steam desconectada. Seus jogos permanecem na biblioteca.
				</p>
			)}
			{state.callbackError && <p role="alert">{state.callbackError}</p>}
			{[
				{ key: "connect", error: state.connect.error },
				{ key: "verify", error: state.verify.error },
				{ key: "disconnect", error: state.disconnect.error },
			].map(
				({ key, error }) =>
					error && (
						<p role="alert" key={key}>
							{error.message}
						</p>
					),
			)}
		</section>
	);
}
