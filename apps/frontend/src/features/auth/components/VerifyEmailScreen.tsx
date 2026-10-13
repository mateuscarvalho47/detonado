import { useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResendVerification, useVerifyEmail } from "../hooks/useAuth";
import styles from "./Auth.module.css";
import { AuthShell } from "./AuthShell";

const VERIFIED_KEY = "detonado_email_verified";
export function VerifyEmailScreen() {
	const search = useSearch({ strict: false });
	const token = (search as Record<string, string>).token ?? "";
	const navigate = useNavigate();
	const [alreadyVerified] = useState(
		() => localStorage.getItem(VERIFIED_KEY) === "true",
	);
	const verify = useVerifyEmail(token, !alreadyVerified);
	const resend = useResendVerification();
	const [email, setEmail] = useState("");
	useEffect(() => {
		if (verify.isSuccess) localStorage.setItem(VERIFIED_KEY, "true");
	}, [verify.isSuccess]);
	let content: React.ReactNode;
	if (verify.isLoading)
		content = (
			<div className={styles.form}>
				<span className={styles.eyebrow}>Verificando</span>
				<h1 className={styles.title}>Confirmando seu e-mail…</h1>
				<p className={styles.intro}>Isso leva só um momento.</p>
			</div>
		);
	else if (verify.isSuccess || alreadyVerified)
		content = (
			<div className={styles.form}>
				<div className={styles.successIcon}>
					<CheckCircle2 />
				</div>
				<span className={styles.eyebrow}>E-mail confirmado</span>
				<h1 className={styles.title}>Sua biblioteca está pronta.</h1>
				<p className={styles.intro}>Entre para adicionar o primeiro jogo.</p>
				<Button
					variant="accent"
					onClick={() => {
						localStorage.removeItem(VERIFIED_KEY);
						navigate({ to: "/login" });
					}}
				>
					Entrar na conta
				</Button>
			</div>
		);
	else if (verify.isError && token)
		content = (
			<div className={styles.form}>
				<span className={styles.eyebrow}>Link expirado</span>
				<h1 className={styles.title}>Peça um novo link.</h1>
				<p className={styles.intro}>
					{(verify.error as Error)?.message ?? "O link não é mais válido."}
				</p>
				<div className={styles.field}>
					<Label htmlFor="resend-email">E-mail</Label>
					<Input
						id="resend-email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
				</div>
				<Button
					variant="outline"
					disabled={resend.isPending || !email.trim()}
					onClick={() => resend.mutate(email.trim())}
				>
					{resend.isPending ? "Enviando…" : "Reenviar e-mail"}
				</Button>
				{resend.isSuccess && (
					<p className={styles.success}>Novo link enviado.</p>
				)}
			</div>
		);
	else
		content = (
			<div className={styles.form}>
				<span className={styles.eyebrow}>Link incompleto</span>
				<h1 className={styles.title}>Abra o link do seu e-mail.</h1>
				<Button variant="outline" onClick={() => navigate({ to: "/login" })}>
					Voltar ao login
				</Button>
			</div>
		);
	return <AuthShell>{content}</AuthShell>;
}
