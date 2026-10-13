import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useLoginForm, useResendVerification } from "../hooks/useAuth";
import styles from "./Auth.module.css";
export function LoginForm() {
	const navigate = useNavigate();
	const {
		form,
		onSubmit,
		mutation: login,
	} = useLoginForm(() => navigate({ to: "/" }));
	const resend = useResendVerification();
	const [showPassword, setShowPassword] = useState(false);
	const {
		register,
		watch,
		formState: { errors },
	} = form;
	const email = watch("email");
	const emailNotVerified =
		login.error instanceof ApiError &&
		login.error.code === "EMAIL_NOT_VERIFIED";
	return (
		<form onSubmit={onSubmit} className={styles.form}>
			<header className={styles.heading}>
				<span className={styles.eyebrow}>Bem-vindo de volta</span>
				<h1 className={styles.title}>Entre e continue.</h1>
				<p className={styles.intro}>
					Seu progresso e sua fila estão esperando.
				</p>
			</header>
			<div className={styles.field}>
				<Label htmlFor="login-email">E-mail</Label>
				<Input
					id="login-email"
					type="email"
					{...register("email")}
					placeholder="seu@email.com"
					autoComplete="email"
				/>
				{errors.email && <p className={styles.error}>{errors.email.message}</p>}
			</div>
			<div className={styles.field}>
				<Label htmlFor="login-password">Senha</Label>
				<div className={styles.password}>
					<Input
						id="login-password"
						type={showPassword ? "text" : "password"}
						{...register("password")}
						placeholder="••••••••"
						autoComplete="current-password"
					/>
					<button
						type="button"
						onClick={() => setShowPassword((value) => !value)}
						className={styles.reveal}
						aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
					>
						{showPassword ? <EyeOff /> : <Eye />}
					</button>
				</div>
				{errors.password && (
					<p className={styles.error}>{errors.password.message}</p>
				)}
			</div>
			<div className={styles.linkRow}>
				<Link to="/forgot-password" className={styles.link}>
					Esqueci minha senha
				</Link>
			</div>
			{login.error && !emailNotVerified && (
				<p className={styles.error}>{login.error.message}</p>
			)}
			{emailNotVerified && (
				<div className={styles.field}>
					<p className={styles.notice}>
						Confirme seu e-mail para acessar a biblioteca.
					</p>
					<Button
						type="button"
						variant="outline"
						disabled={resend.isPending || resend.isSuccess}
						onClick={() => resend.mutate(email)}
					>
						{resend.isPending ? "Enviando…" : "Reenviar confirmação"}
					</Button>
					{resend.isSuccess && (
						<p className={styles.success}>Novo link enviado.</p>
					)}
				</div>
			)}
			<Button
				variant="accent"
				type="submit"
				disabled={login.isPending}
				className={styles.submit}
			>
				{login.isPending ? "Entrando…" : "Entrar"}
			</Button>
			<p className={styles.centerLink}>
				Ainda não usa o Detonado? <Link to="/register">Criar conta</Link>
			</p>
		</form>
	);
}
