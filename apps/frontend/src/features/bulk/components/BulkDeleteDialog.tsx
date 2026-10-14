import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from "@/components/ui/dialog";
import type { useBulkDelete } from "../hooks/useBulkDelete";
import styles from "./BulkEditPanel.module.css";

export function BulkDeleteDialog({
	state,
}: {
	state: ReturnType<typeof useBulkDelete>;
}) {
	if (!state.preview) return null;
	const busy = state.mutation.isPending;
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) state.cancel();
			}}
		>
			<DialogContent
				showCloseButton={false}
				onEscapeKeyDown={(event) => {
					if (busy) event.preventDefault();
				}}
			>
				<DialogTitle>Excluir {state.preview.games.length} jogo(s)?</DialogTitle>
				<DialogDescription>
					Os jogos selecionados e seus registros, incluindo campanhas, sessões,
					diário e checklist, serão excluídos permanentemente. Essa ação não
					pode ser desfeita. Sessões offline pendentes desses jogos não poderão
					ser sincronizadas.
				</DialogDescription>
				<ul className={styles.deleteList}>
					{state.preview.games.map((game) => (
						<li key={game.id}>{game.name}</li>
					))}
				</ul>
				{!state.previewCurrent && !busy && (
					<p role="alert">
						A seleção mudou. Cancele e revise os jogos novamente.
					</p>
				)}
				{busy && (
					<p role="status">
						Excluindo: {state.progress} de {state.preview.games.length}{" "}
						processados…
					</p>
				)}
				<DialogFooter className={styles.deleteFooter}>
					<Button variant="ghost" disabled={busy} onClick={state.cancel}>
						Cancelar exclusão
					</Button>
					<Button
						variant="danger"
						disabled={busy || !state.previewCurrent}
						onClick={state.apply}
					>
						{busy ? "Excluindo…" : "Confirmar exclusão"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
