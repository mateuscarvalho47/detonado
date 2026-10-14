import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDraftRegistration } from "@/shared/components/DraftBoundary";
import { useUpdateAccountForm } from "../hooks/useAuth";
import styles from "./Auth.module.css";
export function AccountEditSection() {
	const [success, setSuccess] = useState(false);
	const { form, onSubmit, mutation } = useUpdateAccountForm(() => {
		setSuccess(true);
		setTimeout(() => setSuccess(false), 4000);
	});
	useDraftRegistration("account", form.formState.isDirty || mutation.isPending);
	const {
		register,
		formState: { errors },
	} = form;
	return (
		<section className={styles.accountSection}>
			<h2>
				<Mail />
				Segurança e conta
			</h2>
			<p>Confirme sua senha atual para alterar o e-mail, a senha ou ambos.</p>
			<form onSubmit={onSubmit} className={styles.accountForm}>
				<div className={styles.field}>
					<Label htmlFor="current-password">Senha atual</Label>
					<Input
						id="current-password"
						type="password"
						{...register("currentPassword")}
						autoComplete="current-password"
					/>
					{errors.currentPassword && (
						<p className={styles.error}>{errors.currentPassword.message}</p>
					)}
				</div>
				<div className={styles.field}>
					<Label htmlFor="new-email">Novo e-mail (opcional)</Label>
					<Input
						id="new-email"
						type="email"
						{...register("email")}
						autoComplete="email"
					/>
					{errors.email && (
						<p className={styles.error}>{errors.email.message}</p>
					)}
				</div>
				<div className={styles.field}>
					<Label htmlFor="new-account-password">Nova senha (opcional)</Label>
					<Input
						id="new-account-password"
						type="password"
						{...register("newPassword")}
						autoComplete="new-password"
					/>
					{errors.newPassword && (
						<p className={styles.error}>{errors.newPassword.message}</p>
					)}
				</div>
				{mutation.error && (
					<p className={styles.error}>{mutation.error.message}</p>
				)}
				{success && <p className={styles.success}>Dados atualizados.</p>}
				<div>
					<Button variant="outline" type="submit" disabled={mutation.isPending}>
						<Lock />
						{mutation.isPending ? "Salvando…" : "Salvar alterações"}
					</Button>
				</div>
			</form>
		</section>
	);
}
