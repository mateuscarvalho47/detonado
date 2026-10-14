import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import styles from "@/features/auth/components/Auth.module.css";
import { useSteamConnection } from "../hooks/useSteamConnection";
export function AccountSteamSection({
	returnTo = "/account",
}: {
	returnTo?: "/account" | "/onboarding";
}) {
	const state = useSteamConnection(returnTo);
	const busy =
		state.connect.isPending ||
		state.verify.isPending ||
		state.disconnect.isPending;
	return (
		<section className={styles.accountSection}>
			<h2>Steam</h2>
			<p>
				Conexão opcional. Você pode usar a busca e importar CSV sem conectar.
			</p>
			<p>
				Ao escolher “Autorizar e conectar Steam”, você autoriza a consulta do
				seu SteamID, jogos e horas acumuladas para verificar a conta e preparar
				a importação. A Steam autentica sua identidade; IGDB/Twitch recebe
				identificadores de jogos para correspondência.
			</p>
			<p>
				Esta autorização é separada do cadastro e vale por até sete dias nesta
				sessão. A consulta fica em cache por até cinco minutos. Jogos e horas só
				entram após revisão e confirmação; duplicatas são preservadas.
			</p>
			<p>
				Desconectar aqui revoga novas consultas nesta sessão, inclusive nas
				outras abas. Outras sessões são independentes. Os jogos importados
				permanecem; remova-os pela ficha ou exclua a conta em Gerenciar meus
				dados. <Link to="/privacy">Ler política de privacidade</Link>.
			</p>

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
						A autorização vale por até sete dias nesta sessão. Os jogos entram
						na biblioteca somente após você revisar e confirmar a importação.
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
					<Link to="/imports">Revisar jogos para importar</Link>
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
							{state.connect.isPending
								? "Abrindo Steam…"
								: "Autorizar e conectar Steam"}
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
