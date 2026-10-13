import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterForm, useResendVerification } from "../hooks/useAuth";
import styles from "./Auth.module.css";
export function RegisterForm() {
	const { form, onSubmit, mutation } = useRegisterForm();
	const resend = useResendVerification();
	const [showPassword, setShowPassword] = useState(false);
	const {
		register,
		watch,
		formState: { errors },
	} = form;
	const email = watch("email");
	if (mutation.isSuccess)
		return (
			<div className={styles.form}>
				<header className={styles.heading}>
					<span className={styles.eyebrow}>Só falta confirmar</span>
					<h1 className={styles.title}>Abra seu e-mail.</h1>
					<p className={styles.intro}>
						Enviamos um link para <strong>{email}</strong>. Ele ativa sua
						biblioteca.
					</p>
				</header>
				<Button
					variant="outline"
					disabled={resend.isPending || resend.isSuccess}
					onClick={() => resend.mutate(email)}
				>
					{resend.isPending ? "Enviando…" : "Reenviar e-mail"}
				</Button>
				{resend.isSuccess && (
					<p className={styles.success}>Novo link enviado.</p>
				)}
				<p className={styles.centerLink}>
					<a href="/login">Voltar ao login</a>
				</p>
			</div>
		);
	return (
		<form onSubmit={onSubmit} className={styles.form}>
			<header className={styles.heading}>
				<span className={styles.eyebrow}>Sua biblioteca pessoal</span>
				<h1 className={styles.title}>Comece pelo próximo jogo.</h1>
				<p className={styles.intro}>
					A conta é gratuita. Seus registros ficam privados.
				</p>
			</header>
			<div className={styles.field}>
				<Label htmlFor="register-email">E-mail</Label>
				<Input
					id="register-email"
					type="email"
					{...register("email")}
					placeholder="seu@email.com"
					autoComplete="email"
				/>
				{errors.email && <p className={styles.error}>{errors.email.message}</p>}
			</div>
			<div className={styles.field}>
				<Label htmlFor="register-password">Senha</Label>
				<div className={styles.password}>
					<Input
						id="register-password"
						type={showPassword ? "text" : "password"}
						{...register("password")}
						placeholder="mínimo 8 caracteres"
						autoComplete="new-password"
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
			<div className={styles.consent}>
				<Checkbox
					id="consent"
					onCheckedChange={(checked) =>
						form.setValue(
							"consent",
							checked ? true : (undefined as unknown as true),
							{ shouldValidate: true },
						)
					}
				/>
				<label htmlFor="consent">
					Li e concordo com a{" "}
					<a href="/privacy" target="_blank" rel="noreferrer">
						Política de Privacidade
					</a>{" "}
					e os{" "}
					<a href="/terms" target="_blank" rel="noreferrer">
						Termos de Uso
					</a>
					.
				</label>
			</div>
			{errors.consent && (
				<p className={styles.error}>{errors.consent.message}</p>
			)}
			{mutation.error && (
				<p className={styles.error}>{mutation.error.message}</p>
			)}
			<Button
				variant="accent"
				type="submit"
				disabled={mutation.isPending}
				className={styles.submit}
			>
				{mutation.isPending ? "Criando…" : "Criar minha biblioteca"}
			</Button>
			<p className={styles.centerLink}>
				Já tem conta? <a href="/login">Entrar</a>
			</p>
		</form>
	);
}
