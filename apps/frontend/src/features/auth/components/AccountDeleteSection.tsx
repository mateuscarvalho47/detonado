import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteAccountForm } from "../hooks/useAuth";
import styles from "./Auth.module.css";
export function AccountDeleteSection() {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const { form, onSubmit, mutation } = useDeleteAccountForm(() =>
		navigate({ to: "/login" }),
	);
	const {
		register,
		formState: { errors },
	} = form;
	return (
		<section className={styles.accountSection}>
			<h2>
				<Trash2 />
				Excluir conta
			</h2>
			<p>
				Remove permanentemente sua conta e toda a biblioteca. Esta ação não pode
				ser desfeita.
			</p>
			{!open ? (
				<div>
					<Button variant="danger" onClick={() => setOpen(true)}>
						<Trash2 />
						Excluir minha conta
					</Button>
				</div>
			) : (
				<form onSubmit={onSubmit} className={styles.dangerBox}>
					<div className={styles.field}>
						<Label htmlFor="delete-password">Confirme com sua senha</Label>
						<Input
							id="delete-password"
							type="password"
							{...register("password")}
							autoFocus
						/>
						{errors.password && (
							<p className={styles.error}>{errors.password.message}</p>
						)}
					</div>
					{mutation.error && (
						<p className={styles.error}>{mutation.error.message}</p>
					)}
					<div className={styles.actions}>
						<Button
							variant="danger"
							type="submit"
							disabled={mutation.isPending}
						>
							{mutation.isPending ? "Excluindo…" : "Confirmar exclusão"}
						</Button>
						<Button
							variant="ghost"
							type="button"
							onClick={() => setOpen(false)}
						>
							Cancelar
						</Button>
					</div>
				</form>
			)}
		</section>
	);
}
