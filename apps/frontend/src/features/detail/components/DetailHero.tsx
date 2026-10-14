import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { CompletionPanel } from "@/features/completion/components/CompletionPanel";
import { Cover } from "@/shared/components/Cover";
import { HltbStat } from "@/shared/components/HltbStat";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import { hltbCaption } from "@/shared/lib/hltbCaption";
import type { LibraryEntry } from "@/types/api";
import type { DetailFormValues } from "../schema/detailSchema";
import styles from "./Detail.module.css";

export function DetailHero({
	game,
	status,
	saved,
	onBack,
	onRemove,
	onRefreshHltb,
	refreshingHltb,
}: {
	game: LibraryEntry;
	status: DetailFormValues["status"];
	saved: boolean;
	onBack: () => void;
	onRemove: () => void;
	onRefreshHltb: () => void;
	refreshingHltb: boolean;
}) {
	const statusDefinition = STATUS_BY_KEY[status];
	const stats = [
		{ label: "Status", value: statusDefinition.label },
		{ label: "Plataforma", value: game.userPlatform ?? "—" },
		{
			label: "Sua nota",
			value: game.rating != null ? `${game.rating}/10` : "—",
		},
		{
			label: "Tempo jogado",
			value: game.hoursPlayed != null ? `${game.hoursPlayed}h` : "—",
		},
	];
	return (
		<section className={styles.hero}>
			<div className={styles.heroBar}>
				<Button variant="outline" size="sm" onClick={onBack}>
					← Biblioteca
				</Button>
				<div className={styles.heroActions}>
					{saved && <span className={styles.saved}>Alterações salvas</span>}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild>
							<Button variant="ghost" size="sm">
								Ações
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Portal>
							<DropdownMenu.Content
								className={styles.actionMenu}
								sideOffset={8}
							>
								<DropdownMenu.Item
									onSelect={() => {
										const panel = document.getElementById(
											"campaign-actions",
										) as HTMLDetailsElement | null;
										if (panel) {
											panel.open = true;
											panel.scrollIntoView({ block: "center" });
											panel.querySelector("button")?.focus();
										}
									}}
								>
									Jogar novamente
								</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={onRemove}>
									Remover jogo
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>
				</div>
			</div>
			<div className={styles.heroContent}>
				<div className={styles.heroCover}>
					<Cover
						game={{
							name: game.name,
							platforms: game.platforms,
							cover: {
								hue: statusDefinition.hue,
								scheme: "duotone",
								glyph: game.name[0],
							},
							coverUrl: game.coverUrl,
						}}
						size="lg"
					/>
				</div>
				<div className={styles.heroCopy}>
					<div className={styles.genres}>{game.genres.join(" · ")}</div>
					<h1 className={styles.title}>{game.name}</h1>
					<p className={styles.platforms}>{game.platforms.join(" · ")}</p>
					<StatusBadge status={status} />
					<div className={styles.quickStats}>
						{stats.map((stat) => (
							<div key={stat.label} className={styles.stat}>
								<div className={styles.label}>{stat.label}</div>
								<div className={styles.statValue}>{stat.value}</div>
							</div>
						))}
					</div>
					<HltbBlock
						game={game}
						onRefresh={onRefreshHltb}
						refreshing={refreshingHltb}
					/>
					<CompletionPanel game={game} />
				</div>
			</div>
		</section>
	);
}

function HltbBlock({
	game,
	onRefresh,
	refreshing,
}: {
	game: LibraryEntry;
	onRefresh: () => void;
	refreshing: boolean;
}) {
	const hasTimes =
		game.hltbMain != null ||
		game.hltbMainExtra != null ||
		game.hltbCompletionist != null;
	const caption = hltbCaption(game.hltbStatus, hasTimes);
	return (
		<div className={styles.hltb}>
			<div className={styles.label}>Tempo para terminar</div>
			{caption ? (
				<p className={styles.caption}>{caption}</p>
			) : (
				<div className={styles.hltbGrid}>
					<HltbStat label="Principal" hours={game.hltbMain} />
					<HltbStat label="+ Extras" hours={game.hltbMainExtra} />
					<HltbStat label="Completista" hours={game.hltbCompletionist} />
				</div>
			)}
			<button
				type="button"
				onClick={onRefresh}
				disabled={refreshing}
				className={styles.refresh}
			>
				{refreshing ? "Buscando…" : "Atualizar estimativas"}
			</button>
		</div>
	);
}
