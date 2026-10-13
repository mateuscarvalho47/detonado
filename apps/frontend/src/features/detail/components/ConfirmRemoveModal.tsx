import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import styles from "./Detail.module.css";
export function ConfirmRemoveModal({
	gameName,
	onConfirm,
	onCancel,
	isPending,
}: {
	gameName: string;
	onConfirm: () => void;
	onCancel: () => void;
	isPending: boolean;
}) {
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<DialogContent showCloseButton={false} className={styles.modal}>
				<DialogHeader>
					<DialogTitle className={styles.modalTitle}>
						Remover este jogo?
					</DialogTitle>
					<DialogDescription className={styles.modalText}>
						<strong>{gameName}</strong> e todo o seu registro serão removidos da
						biblioteca.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className={styles.modalFooter}>
					<Button variant="ghost" onClick={onCancel}>
						Cancelar
					</Button>
					<Button variant="danger" onClick={onConfirm} disabled={isPending}>
						{isPending ? "Removendo…" : "Remover jogo"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
