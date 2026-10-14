import { createFileRoute } from "@tanstack/react-router";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import styles from "@/styles/Routes.module.css";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
});

function PrivacyPage() {
	usePageTitle("Política de Privacidade");
	return (
		<div className={styles.legal}>
			<p>Legal</p>
			<h1>Política de Privacidade</h1>
			<p>Última atualização: 14 de outubro de 2026</p>

			<div>
				<section>
					<h2>1. Quem somos</h2>
					<p>
						O <strong>Detonado</strong> é uma biblioteca pessoal de jogos. O
						controlador dos seus dados é o desenvolvedor responsável pelo
						serviço (contato:{" "}
						<a href="mailto:sac@carvalholabs.com.br">sac@carvalholabs.com.br</a>
						).
					</p>
				</section>

				<section>
					<h2>2. Dados que coletamos</h2>
					<ul>
						<li>
							<strong>Endereço de e-mail</strong> — usado para criar e acessar
							sua conta.
						</li>
						<li>
							<strong>Senha</strong> — armazenada exclusivamente em formato hash
							(Argon2). Nunca temos acesso à sua senha em texto claro.
						</li>
						<li>
							<strong>Biblioteca de jogos</strong> — jogos adicionados, ficha
							(capa, gêneros e plataformas), status, plataforma, nota, horas
							jogadas, notas pessoais, data de conclusão e tempos do
							HowLongToBeat.
						</li>
						<li>
							<strong>Preferências e progresso</strong> — plataforma preferida,
							conclusão da personalização inicial, coleções, tags, buscas
							salvas, campanhas, sessões datadas, checklist, origens e diário,
							inclusive indicações de spoiler.
						</li>
						<li>
							<strong>Steam, quando autorizada</strong> — SteamID verificado,
							jogos e horas acumuladas para preparar uma prévia de importação. A
							autorização é opcional e separada do cadastro.
						</li>

						<li>
							<strong>Dados de sessão</strong> — identificador de sessão
							armazenado em cookie seguro (httpOnly, válido por 7 dias).
						</li>
					</ul>
					<p>
						Não coletamos nome, CPF, telefone, endereço, dados de pagamento,
						localização ou qualquer outro dado além dos listados acima.
					</p>
				</section>

				<section>
					<h2>3. Por que tratamos seus dados</h2>
					<ul>
						<li>
							<strong>Execução do contrato</strong> (LGPD, Art. 7º, V) — para
							fornecer a biblioteca pessoal de jogos.
						</li>
						<li>
							<strong>Consentimento</strong> (LGPD, Art. 7º, I) — para enviar o
							e-mail de verificação e comunicações essenciais da conta.
						</li>
					</ul>
				</section>

				<section>
					<h2>4. Com quem compartilhamos</h2>
					<ul>
						<li>
							<strong>Resend</strong> — serviço de entrega de e-mail
							transacional. Recebe seu endereço de e-mail para entregar o link
							de verificação e o código de redefinição de senha. Consulte a{" "}
							<a
								href="https://resend.com/legal/privacy-policy"
								target="_blank"
								rel="noreferrer"
							>
								política de privacidade da Resend
							</a>
							.
						</li>
						<li>
							<strong>IGDB / Twitch</strong> — banco de dados de jogos.
							Utilizamos apenas para busca de informações sobre jogos. Nenhum
							dado pessoal seu é enviado.
						</li>
						<li>
							<strong>HowLongToBeat</strong> — consulta de duração. Recebe o
							nome do jogo quando os tempos são buscados. Seu e-mail não é
							enviado.
						</li>
					</ul>
					<p>
						Não vendemos, alugamos ou compartilhamos seus dados com terceiros
						para fins de marketing.
					</p>
				</section>

				<section>
					<h2>5. Por quanto tempo guardamos</h2>
					<p>
						Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir
						sua conta, todos os dados pessoais (perfil e biblioteca) são
						removidos permanentemente. Registros de operação (logs) podem ser
						mantidos por até 6 meses para fins de segurança.
					</p>
				</section>

				<section>
					<h2>6. Seus direitos (LGPD)</h2>
					<p>Conforme a Lei nº 13.709/2018, você tem direito a:</p>
					<ul>
						<li>
							<strong>Acesso</strong> — saber quais dados temos sobre você.
						</li>
						<li>
							<strong>Correção</strong> — atualizar seu e-mail ou senha em{" "}
							<a href="/account">Configurações da Conta</a>.
						</li>
						<li>
							<strong>Portabilidade</strong> — exportar a conta e a biblioteca
							em JSON, com ficha, status, horas, nota e tempos.
						</li>
						<li>
							<strong>Exclusão</strong> — excluir sua conta e todos os dados
							permanentemente.
						</li>
						<li>
							<strong>Revogação do consentimento</strong> — a qualquer momento,
							excluindo sua conta.
						</li>
					</ul>
					<p>
						Para exercer qualquer um desses direitos, acesse{" "}
						<a href="/account">Configurações da Conta</a> ou entre em contato
						pelo e-mail{" "}
						<a href="mailto:sac@carvalholabs.com.br">sac@carvalholabs.com.br</a>
						.
					</p>
				</section>

				<section>
					<h2>7. Segurança</h2>
					<p>
						Adotamos medidas técnicas para proteger seus dados: senhas com hash
						Argon2, cookie de sessão httpOnly (em produção, Secure e
						SameSite=None), token de sessão em cada alteração, comunicação via
						HTTPS e armazenamento de sessão em Redis com TTL de 7 dias.
					</p>
				</section>
				<section>
					<h2>Steam e armazenamento neste navegador</h2>
					<p>
						Ao autorizar a Steam, registramos a versão da explicação e a data da
						autorização no servidor para esta sessão, por até sete dias. O login
						oficial é feito na Steam; não recebemos sua senha Steam. A Steam
						recebe a solicitação de autenticação e consulta. IGDB/Twitch recebe
						identificadores de jogos para correspondência; HowLongToBeat recebe
						nomes de jogos para estimativas.
					</p>
					<p>
						A consulta dos jogos e horas Steam fica em cache no servidor por até
						cinco minutos. Só os jogos revisados e confirmados entram na
						biblioteca; duplicatas são preservadas. Horas importadas são horas
						anteriores, sem data de sessão.
					</p>
					<p>
						Desconectar Steam em Configurações revoga a autorização desta sessão
						no servidor e impede novas consultas, inclusive por abas da mesma
						sessão. Outras sessões têm autorizações independentes. O cache
						expira em até cinco minutos; desconectar não apaga os jogos
						importados. Para removê-los, use a ficha de cada jogo ou exclua sua
						conta em Gerenciar meus dados.
					</p>
					<p>
						Para leitura offline, dados já consultados ficam neste navegador,
						separados por conta, por até sete dias. Sessões pendentes ficam no
						navegador até sincronização ou descarte. Sair ou excluir a conta
						limpa os dados locais; o descarte de pendências exige confirmação.
						As demais alterações precisam de conexão.
					</p>
				</section>

				<section>
					<h2>8. Alterações nesta política</h2>
					<p>
						Podemos atualizar esta política periodicamente. Alterações
						significativas serão comunicadas via e-mail. A data de "Última
						atualização" no topo desta página sempre refletirá a versão mais
						recente.
					</p>
				</section>

				<section>
					<h2>9. Contato</h2>
					<p>
						Dúvidas sobre privacidade? Entre em contato:{" "}
						<a href="mailto:sac@carvalholabs.com.br">sac@carvalholabs.com.br</a>
					</p>
				</section>
			</div>

			<div>
				<a href="/">← Voltar ao início</a>
			</div>
		</div>
	);
}
