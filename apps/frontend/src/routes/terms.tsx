import { createFileRoute } from "@tanstack/react-router";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
});

function TermsPage() {
	usePageTitle("Termos de Uso");
	return (
		<div className="max-w-2xl mx-auto px-6 py-12">
			<p className="font-mono text-overline tracking-widest uppercase text-accent-bright mb-2">
				Legal
			</p>
			<h1 className="text-2xl font-semibold tracking-tight text-text-hi mb-1">
				Termos de Uso
			</h1>
			<p className="text-xs text-text-lo font-mono mb-8">
				Última atualização: setembro de 2026
			</p>

			<div className="flex flex-col gap-7 text-body text-text-md leading-relaxed">
				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						1. Aceitação
					</h2>
					<p>
						Ao criar uma conta na{" "}
						<strong className="text-text-hi">Detonado</strong>, você declara ter
						lido e concordado com estes Termos de Uso e com nossa{" "}
						<a
							href="/privacy"
							className="text-accent-bright no-underline hover:underline"
						>
							Política de Privacidade
						</a>
						.
					</p>
				</section>

				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						2. O serviço
					</h2>
					<p>
						O Detonado é uma biblioteca pessoal de jogos. Você anota o que está
						jogando, o que zerou e o que ficou na fila, com horas, nota e
						anotações. A estante fica só na sua conta. O serviço é fornecido no
						estado em que se encontra e pode ser alterado ou descontinuado a
						qualquer momento.
					</p>
				</section>

				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						3. Sua conta
					</h2>
					<ul className="list-disc list-inside flex flex-col gap-1.5 pl-1">
						<li>
							Você é responsável por manter a confidencialidade da sua senha.
						</li>
						<li>
							É proibido compartilhar credenciais de acesso com terceiros.
						</li>
						<li>Você deve ter ao menos 13 anos para usar o serviço.</li>
						<li>
							Uma conta por pessoa. Contas duplicadas podem ser removidas.
						</li>
					</ul>
				</section>

				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						4. Uso aceitável
					</h2>
					<p className="mb-2">É proibido usar o Detonado para:</p>
					<ul className="list-disc list-inside flex flex-col gap-1.5 pl-1">
						<li>Qualquer atividade ilegal ou fraudulenta.</li>
						<li>Tentar acessar dados de outros usuários.</li>
						<li>Sobrecarregar ou prejudicar a infraestrutura do serviço.</li>
					</ul>
				</section>

				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						5. Conteúdo do usuário
					</h2>
					<p>
						Você mantém a propriedade sobre as notas, avaliações e demais
						conteúdos que insere na plataforma. Ao usar o serviço, você nos
						concede uma licença limitada para armazenar e exibir esse conteúdo
						exclusivamente para você. Não utilizamos seu conteúdo para outros
						fins.
					</p>
				</section>

				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						6. Encerramento de conta
					</h2>
					<p>
						Você pode excluir sua conta a qualquer momento em Configurações,
						dentro da conta. A exclusão é permanente e remove todos os seus
						dados. Reservamo-nos o direito de suspender contas que violem estes
						termos.
					</p>
				</section>

				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						7. Limitação de responsabilidade
					</h2>
					<p>
						O serviço é fornecido sem garantias de disponibilidade contínua. Não
						nos responsabilizamos por perda de dados decorrente de falhas
						técnicas. Recomendamos exportar seus dados periodicamente em
						Configurações, dentro da conta.
					</p>
				</section>

				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						8. Lei aplicável
					</h2>
					<p>
						Estes termos são regidos pela legislação brasileira, incluindo a Lei
						Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Qualquer
						disputa será resolvida no foro da comarca do controlador do serviço.
					</p>
				</section>

				<section>
					<h2 className="text-heading font-semibold text-text-hi mb-2">
						9. Contato
					</h2>
					<p>
						Dúvidas sobre estes termos? Entre em contato:{" "}
						<a
							href="mailto:sac@carvalholabs.com.br"
							className="text-accent-bright no-underline hover:underline"
						>
							sac@carvalholabs.com.br
						</a>
					</p>
				</section>
			</div>

			<div className="mt-10 pt-6 border-t border-border-soft">
				<a
					href="/"
					className="text-body text-accent-bright no-underline hover:underline font-medium"
				>
					← Voltar ao início
				</a>
			</div>
		</div>
	);
}
