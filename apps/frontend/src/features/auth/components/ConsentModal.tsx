import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useConsent } from "../hooks/useAuth";
import styles from "./Auth.module.css";
export function ConsentModal() {
	const { mutate, isPending } = useConsent();
	return (
		<Dialog open onOpenChange={() => {}}>
			<DialogContent className={styles.modal}>
				<DialogHeader>
					<DialogTitle>Antes de continuar</DialogTitle>
					<DialogDescription>
						Confirme os termos para usar sua biblioteca.
					</DialogDescription>
				</DialogHeader>
				<div className={styles.modalText}>
					<p>
						Atualizamos nossa{" "}
						<Link to="/privacy" target="_blank">
							Política de Privacidade
						</Link>{" "}
						e os{" "}
						<Link to="/terms" target="_blank">
							Termos de Uso
						</Link>
						.
					</p>
					<p>
						Seus dados não são compartilhados para marketing e você pode excluir
						a conta a qualquer momento.
					</p>
				</div>
				<div className={styles.modalFoot}>
					<Button
						variant="accent"
						disabled={isPending}
						onClick={() => mutate()}
					>
						{isPending ? "Salvando…" : "Aceitar e continuar"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
