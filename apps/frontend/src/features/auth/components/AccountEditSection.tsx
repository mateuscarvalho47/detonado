import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateAccountForm } from "../hooks/useAuth";

export function AccountEditSection() {
	const [updateSuccess, setUpdateSuccess] = useState(false);

	const {
		form: updateForm,
		onSubmit: onUpdateSubmit,
		mutation: updateMutation,
	} = useUpdateAccountForm(() => {
		setUpdateSuccess(true);
		setTimeout(() => setUpdateSuccess(false), 4000);
	});

	const {
		register: regUpdate,
		formState: { errors: updateErrors },
	} = updateForm;

	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-body font-semibold text-text-hi flex items-center gap-2">
				<Mail size={14} className="text-accent-bright" />
				Editar conta
			</h2>
			<p className="text-caption text-text-lo -mt-2">
				Informe a senha atual e altere o e-mail, a senha, ou ambos.
			</p>
			<form onSubmit={onUpdateSubmit} className="flex flex-col gap-3">
				<div className="flex flex-col gap-1.5">
					<Label className="mono-label">Senha atual</Label>
					<Input
						type="password"
						{...regUpdate("currentPassword")}
						placeholder="sua senha atual"
						className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-10"
					/>
					{updateErrors.currentPassword && (
						<p className="text-body m-0 text-error">
							{updateErrors.currentPassword.message}
						</p>
					)}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="mono-label">
						Novo e-mail <span className="text-text-lo">(opcional)</span>
					</Label>
					<Input
						type="email"
						{...regUpdate("email")}
						placeholder="novo@email.com"
						className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-10"
					/>
					{updateErrors.email && (
						<p className="text-body m-0 text-error">
							{updateErrors.email.message}
						</p>
					)}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="mono-label">
						Nova senha <span className="text-text-lo">(opcional)</span>
					</Label>
					<Input
						type="password"
						{...regUpdate("newPassword")}
						placeholder="mínimo 8 caracteres"
						className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-10"
					/>
					{updateErrors.newPassword && (
						<p className="text-body m-0 text-error">
							{updateErrors.newPassword.message}
						</p>
					)}
				</div>

				{updateMutation.error && (
					<p className="text-body m-0 text-error">
						{updateMutation.error.message}
					</p>
				)}
				{updateSuccess && (
					<p className="text-caption m-0 text-accent-bright">
						Dados atualizados com sucesso.
					</p>
				)}

				<Button
					variant="outline"
					type="submit"
					disabled={updateMutation.isPending}
					className="w-fit h-9 rounded-lg mt-1 text-caption"
				>
					<Lock size={12} />
					{updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
				</Button>
			</form>
		</section>
	);
}
