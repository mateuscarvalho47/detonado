import type { LibraryEntry } from "@/types/api";
import styles from "./Detail.module.css";
export function DetailInfoPanel({ game }: { game: LibraryEntry }) {
	const rows = [
		{ label: "Gêneros", value: game.genres.join(", ") || "—" },
		{ label: "Plataformas", value: game.platforms.join(", ") || "—" },
		{
			label: "Adicionado",
			value: new Date(game.createdAt).toLocaleDateString("pt-BR"),
		},
		{
			label: "Atualizado",
			value: new Date(game.updatedAt).toLocaleDateString("pt-BR"),
		},
	];
	return (
		<aside className={`${styles.panel} ${styles.info}`}>
			<h2 className={styles.panelTitle}>Sobre este jogo</h2>
			<dl>
				{rows.map((row) => (
					<div key={row.label} className={styles.infoRow}>
						<dt className={styles.label}>{row.label}</dt>
						<dd>{row.value}</dd>
					</div>
				))}
			</dl>
		</aside>
	);
}
