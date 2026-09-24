import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteAccountForm } from "../hooks/useAuth";

export function AccountDeleteSection() {
	const navigate = useNavigate();
	const [deleteOpen, setDeleteOpen] = useState(false);

	const {
		form: deleteForm,
		onSubmit: onDeleteSubmit,
		mutation: deleteMutation,
	} = useDeleteAccountForm(() => {
		navigate({ to: "/login" });
	});

	const {
		register: regDelete,
		formState: { errors: deleteErrors },
	} = deleteForm;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-body font-semibold text-text-hi flex items-center gap-2">
				<Trash2 size={14} className="text-error" />
				Excluir conta
			</h2>
			<p className="text-caption text-text-lo">
				Esta ação remove permanentemente sua conta e toda a sua biblioteca. Não
				há como desfazer. Seu direito de exclusão pela LGPD (Art. 18).
			</p>

			{!deleteOpen ? (
				<Button
					variant="outline"
					onClick={() => setDeleteOpen(true)}
					className="w-fit h-9 rounded-lg text-caption text-error border-error/30 hover:bg-error/10"
				>
					<Trash2 size={12} />
					Excluir minha conta
				</Button>
			) : (
				<form
					onSubmit={onDeleteSubmit}
					className="flex flex-col gap-3 p-4 rounded-lg border border-error/30 bg-error/5"
				>
					<p className="text-caption text-text-md">
						Para confirmar, insira sua senha abaixo:
					</p>
					<div className="flex flex-col gap-1.5">
						<Input
							type="password"
							{...regDelete("password")}
							placeholder="sua senha"
							className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo h-10"
							autoFocus
						/>
						{deleteErrors.password && (
							<p className="text-body m-0 text-error">
								{deleteErrors.password.message}
							</p>
						)}
					</div>
					{deleteMutation.error && (
						<p className="text-body m-0 text-error">
							{deleteMutation.error.message}
						</p>
					)}
					<div className="flex gap-2">
						<Button
							variant="outline"
							type="submit"
							disabled={deleteMutation.isPending}
							className="h-9 rounded-lg text-caption text-error border-error/40 hover:bg-error/10"
						>
							{deleteMutation.isPending ? "Excluindo..." : "Confirmar exclusão"}
						</Button>
						<Button
							variant="ghost"
							type="button"
							onClick={() => setDeleteOpen(false)}
							className="h-9 rounded-lg text-caption text-text-lo"
						>
							Cancelar
						</Button>
					</div>
				</form>
			)}
		</section>
	);
}
