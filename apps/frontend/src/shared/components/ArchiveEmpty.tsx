import { BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";

export const ARCHIVE_EMPTY_BODY =
	"O arquivo está vazio. O primeiro jogo entra com um status e, se quiser, uma nota.";

export function ArchiveEmpty({ onAdd }: { onAdd: () => void }) {
	return (
		<EmptyState
			icon={<BookMarked className="size-7" />}
			title="Arquivo vazio"
			body={ARCHIVE_EMPTY_BODY}
			action={
				<Button
					type="button"
					variant="accent"
					size="sm"
					onClick={onAdd}
					className="rounded-lg"
				>
					Adicionar ao arquivo
				</Button>
			}
		/>
	);
}
