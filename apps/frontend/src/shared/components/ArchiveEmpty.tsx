import { BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";

export const ARCHIVE_EMPTY_BODY =
	"Busque um jogo e marque o status. A fila e as horas saem daí.";

export function ArchiveEmpty({ onAdd }: { onAdd: () => void }) {
	return (
		<EmptyState
			icon={<BookMarked className="size-7" />}
			title="Nenhum jogo ainda"
			body={ARCHIVE_EMPTY_BODY}
			action={
				<Button
					type="button"
					variant="accent"
					size="sm"
					onClick={onAdd}
					className="rounded-lg"
				>
					Buscar um jogo
				</Button>
			}
		/>
	);
}
