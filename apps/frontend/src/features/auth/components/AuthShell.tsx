import type { ReactNode } from "react";
import styles from "./Auth.module.css";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
export function AuthShell({
	mode,
	children,
}: {
	mode?: "login" | "register";
	children?: ReactNode;
}) {
	return (
		<div className={styles.page}>
			<aside className={styles.story}>
				<div className={styles.brand}>
					<img src="/logo.svg" alt="" />
					<span>Detonado</span>
				</div>
				<div className={styles.storyCopy}>
					<p>Seu backlog, com contexto</p>
					<h2>Volte ao jogo. Não à estaca zero.</h2>
					<p>
						Guarde onde parou, organize o que vem depois e escolha sua próxima
						sessão sem depender da memória.
					</p>
				</div>
				<div className={styles.storyFooter}>
					Uma biblioteca pessoal. Sem feed. Sem disputa.
				</div>
			</aside>
			<main className={styles.formSide}>
				<div className={styles.card}>
					<div className={`${styles.brand} ${styles.mobileBrand}`}>
						<img src="/logo.svg" alt="" />
						<span>Detonado</span>
					</div>
					{children ?? (mode === "login" ? <LoginForm /> : <RegisterForm />)}
				</div>
			</main>
		</div>
	);
}
