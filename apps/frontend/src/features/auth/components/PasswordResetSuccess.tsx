import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./Auth.module.css";
export function PasswordResetSuccess() {
	const navigate = useNavigate();
	return (
		<div className={styles.form}>
			<div className={styles.successIcon}>
				<CheckCircle2 />
			</div>
			<header className={styles.heading}>
				<span className={styles.eyebrow}>Senha atualizada</span>
				<h1 className={styles.title}>Tudo certo.</h1>
				<p className={styles.intro}>Sua nova senha já está ativa.</p>
			</header>
			<Button
				variant="accent"
				onClick={() => navigate({ to: "/login" })}
				className={styles.submit}
			>
				Fazer login
			</Button>
		</div>
	);
}
