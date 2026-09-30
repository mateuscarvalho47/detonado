import { Button } from "@/components/ui/button";
import { Cover } from "@/shared/components/Cover";
import { HltbStat } from "@/shared/components/HltbStat";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import { hltbCaption } from "@/shared/lib/hltbCaption";
import type { LibraryEntry } from "@/types/api";
import type { DetailFormValues } from "../schema/detailSchema";

interface DetailHeroProps {
	game: LibraryEntry;
	status: DetailFormValues["status"];
	saved: boolean;
	onBack: () => void;
	onRemove: () => void;
	onRefreshHltb: () => void;
	refreshingHltb: boolean;
}

export function DetailHero({
	game,
	status,
	saved,
	onBack,
	onRemove,
	onRefreshHltb,
	refreshingHltb,
}: DetailHeroProps) {
	const statusDef = STATUS_BY_KEY[status];
	const coverData = {
		hue: STATUS_BY_KEY[status]?.hue ?? 280,
		scheme: "duotone" as const,
		glyph: game.name[0],
	};

	return (
		<div className="px-6 border-b border-border-soft">
			<div className="flex justify-between items-center py-5">
				<Button
					variant="outline"
					size="sm"
					onClick={onBack}
					className="min-h-11 lg:min-h-0 bg-bg-1 border border-border-soft text-text-hi hover:bg-bg-2"
				>
					← Biblioteca
				</Button>
				<div className="flex gap-2 items-center">
					{saved && (
						<span className="font-mono text-caption text-text-md">Salvo</span>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={onRemove}
						className="min-h-11 lg:min-h-0 bg-bg-1 border border-border-soft hover:bg-bg-2"
						style={{ color: "oklch(0.75 0.14 25)" }}
					>
						Remover
					</Button>
				</div>
			</div>

			{/* Content */}
			<div className="flex flex-col md:grid md:grid-cols-[220px_1fr] gap-6 md:gap-9 py-7 pb-10 items-center md:items-start">
				<div className="w-35 md:w-auto aspect-3/4 overflow-hidden shrink-0 border border-border-soft">
					<Cover
						game={{
							name: game.name,
							year: undefined,
							platforms: game.platforms,
							cover: coverData,
							coverUrl: game.coverUrl,
						}}
						size="lg"
						square
					/>
				</div>

				{/* Head info */}
				<div className="flex flex-col gap-3.5 pt-2 w-full text-center md:text-left">
					<div className="mono-label">{game.genres.join(" · ")}</div>
					<h1 className="text-2xl md:text-4xl font-semibold leading-[1.1] m-0 text-text-hi tracking-tight">
						{game.name}
					</h1>
					<div className="text-text-md text-body">
						{game.platforms.join(" · ")}
					</div>
					<div className="flex gap-1.5 flex-wrap justify-center md:justify-start">
						<StatusBadge status={status} />
					</div>

					{/* Quick stats */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-2 p-4 border border-border-soft bg-bg-1 text-left">
						{[
							{ label: "Status", val: statusDef.label },
							{ label: "Plataforma", val: game.userPlatform ?? "—" },
							{
								label: "Avaliação",
								val: game.rating != null ? `${game.rating}/10` : "—",
							},
							{
								label: "Horas",
								val: game.hoursPlayed != null ? `${game.hoursPlayed}h` : "—",
							},
						].map(({ label, val }) => (
							<div key={label} className="flex flex-col gap-1.5">
								<div className="mono-label">{label}</div>
								<div className="text-heading text-text-hi">{val}</div>
							</div>
						))}
					</div>

					<HltbBlock
						game={game}
						onRefresh={onRefreshHltb}
						refreshing={refreshingHltb}
					/>
				</div>
			</div>
		</div>
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
		<div className="mt-2 text-left">
			<div className="mono-label mb-1.5">Tempo para zerar</div>
			{caption ? (
				<p className="m-0 text-body text-text-md">{caption}</p>
			) : (
				<div className="grid grid-cols-3 gap-2">
					<HltbStat label="Principal" hours={game.hltbMain} />
					<HltbStat label="+ Extras" hours={game.hltbMainExtra} />
					<HltbStat label="Completista" hours={game.hltbCompletionist} />
				</div>
			)}
			<button
				type="button"
				onClick={onRefresh}
				disabled={refreshing}
				className="mt-2 font-mono text-caption text-text-md bg-transparent border-0 p-0 cursor-pointer disabled:cursor-default"
			>
				{refreshing ? "Buscando…" : "Buscar de novo"}
			</button>
		</div>
	);
}
