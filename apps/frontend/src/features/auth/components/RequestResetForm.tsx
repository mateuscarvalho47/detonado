import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestResetForm } from "../hooks/useAuth";
import styles from "./Auth.module.css";
export function RequestResetForm() {
	const navigate = useNavigate();
	const { form, onSubmit, mutation } = useRequestResetForm((email) =>
		navigate({ to: "/reset-password", search: { email } }),
	);
	const {
		register,
		formState: { errors },
	} = form;
	return (
		<form onSubmit={onSubmit} className={styles.form}>
			<header className={styles.heading}>
				<span className={styles.eyebrow}>Recuperar acesso</span>
				<h1 className={styles.title}>Vamos trazer você de volta.</h1>
				<p className={styles.intro}>
					Enviaremos um código para redefinir sua senha.
				</p>
			</header>
			<div className={styles.field}>
				<Label htmlFor="reset-email">E-mail</Label>
				<Input
					id="reset-email"
					type="email"
					{...register("email")}
					placeholder="seu@email.com"
				/>
				{errors.email && <p className={styles.error}>{errors.email.message}</p>}
			</div>
			{mutation.error && (
				<p className={styles.error}>{mutation.error.message}</p>
			)}
			<Button
				variant="accent"
				type="submit"
				disabled={mutation.isPending}
				className={styles.submit}
			>
				{mutation.isPending ? "Enviando…" : "Enviar código"}
			</Button>
			<p className={styles.centerLink}>
				<a href="/login">Voltar ao login</a>
			</p>
		</form>
	);
}
