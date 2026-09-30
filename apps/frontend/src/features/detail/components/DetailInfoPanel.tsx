import type { LibraryEntry } from "@/types/api";

interface DetailInfoPanelProps {
	game: LibraryEntry;
}

export function DetailInfoPanel({ game }: DetailInfoPanelProps) {
	return (
		<div className="bg-bg-1 border border-border-soft p-5 self-start">
			<div className="text-heading font-semibold tracking-tight text-text-hi mb-4">
				Informações
			</div>
			<dl>
				{[
					{ label: "Gêneros", val: game.genres.join(", ") || "—" },
					{
						label: "Plataformas",
						val: game.platforms.join(", ") || "—",
					},
					{
						label: "Adicionado em",
						val: new Date(game.createdAt).toLocaleDateString("pt-BR"),
					},
					{
						label: "Atualizado em",
						val: new Date(game.updatedAt).toLocaleDateString("pt-BR"),
					},
				].map(({ label, val }) => (
					<div
						key={label}
						className="grid grid-cols-[110px_1fr] gap-3 py-2.5 border-b border-border-soft"
					>
						<dt className="mono-label">{label}</dt>
						<dd className="text-heading text-text-hi m-0">{val}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
