import { XIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SelectOptions } from "@/components/ui/select-options";
import { statusColor } from "@/lib/statusColor";
import { Cover } from "@/shared/components/Cover";
import { HltbStat, HltbStatSkeleton } from "@/shared/components/HltbStat";
import { STATUSES } from "@/shared/constants/statuses";
import type { GameSearchResult } from "@/types/api";
import { useAddToLibraryForm } from "../hooks/useAddToLibraryForm";
import { useGameDetail } from "../hooks/useGameSearch";

interface AddToLibraryModalProps {
	game: GameSearchResult;
	onClose: () => void;
	onAdded: (igdbId: number) => void;
}

export function AddToLibraryModal({
	game,
	onClose,
	onAdded,
}: AddToLibraryModalProps) {
	const { form, onSubmit, isPending } = useAddToLibraryForm(game, onAdded);
	const { control } = form;
	const { data: detail, isLoading: hltbLoading } = useGameDetail(game.igdbId);
	const hltb = detail?.hltb;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				showCloseButton={false}
				aria-describedby={undefined}
				className="p-0 gap-0 max-w-180 bg-bg-1 border border-border rounded-xl shadow-modal"
			>
				<DialogHeader className="flex flex-row items-center justify-between px-5 py-3.5 border-b border-border-soft">
					<DialogTitle className="text-heading text-text-hi">
						Adicionar à biblioteca
					</DialogTitle>
					<DialogClose asChild>
						<Button variant="ghost" size="icon-sm">
							<XIcon />
							<span className="sr-only">Fechar</span>
						</Button>
					</DialogClose>
				</DialogHeader>

				<form onSubmit={onSubmit} className="flex flex-col gap-5 p-5 sm:p-6">
					{/* Grid: cover + fields (sem botões) */}
					<div
						className="flex flex-col sm:grid sm:gap-7 gap-5"
						style={{ gridTemplateColumns: "320px 1fr" }}
					>
						{/* Cover */}
						<div className="w-40 sm:w-auto self-stretch rounded-md overflow-hidden mx-auto sm:mx-0">
							<Cover
								game={{
									name: game.name,
									year: game.releaseYear,
									platforms: game.platforms,
									cover: { hue: 295, scheme: "duotone", glyph: game.name[0] },
									coverUrl: game.coverUrl,
								}}
								size="lg"
							/>
						</div>

						{/* Form fields */}
						<div className="flex flex-col gap-4">
							<div>
								<div className="mono-label text-accent-bright">
									{game.genres.slice(0, 2).join(" · ")}
								</div>
								<h2 className="text-xl font-semibold tracking-tight mt-1 mb-0 text-text-hi">
									{game.name}
								</h2>
								<div className="text-body text-text-md font-mono mt-0.5">
									{game.releaseYear ?? "TBA"} ·{" "}
									{game.platforms.slice(0, 3).join(", ")}
								</div>
							</div>

							{/* HowLongToBeat */}
							{(hltbLoading || hltb) && (
								<div>
									<Label className="mono-label block mb-2">
										Tempo para zerar
									</Label>
									<div className="grid grid-cols-3 gap-1.5">
										{hltbLoading ? (
											<>
												<HltbStatSkeleton />
												<HltbStatSkeleton />
												<HltbStatSkeleton />
											</>
										) : (
											<>
												<HltbStat label="Main" hours={hltb?.mainHours} />
												<HltbStat
													label="Main + Extra"
													hours={hltb?.mainExtraHours}
												/>
												<HltbStat
													label="Completista"
													hours={hltb?.completionistHours}
												/>
											</>
										)}
									</div>
								</div>
							)}

							{/* Status picker */}
							<div>
								<Label className="mono-label block mb-2">Status</Label>
								<Controller
									control={control}
									name="status"
									render={({ field }) => (
										<div className="grid grid-cols-2 gap-1.5">
											{STATUSES.map((s) => (
												<button
													type="button"
													key={s.key}
													onClick={() => field.onChange(s.key)}
													className="flex items-center gap-2 h-8 px-2.5 rounded-md cursor-pointer text-body font-medium border-0"
													style={{
														background:
															field.value === s.key
																? statusColor(s.hue, "bgActive")
																: "var(--color-bg-2)",
														border: `1px solid ${field.value === s.key ? statusColor(s.hue, "borderActive") : "var(--color-border-soft)"}`,
														color:
															field.value === s.key
																? statusColor(s.hue, "textActive")
																: "var(--color-text-md)",
													}}
												>
													<div
														className="size-1.5 rounded-full shrink-0"
														style={{ background: s.color }}
													/>
													{s.label}
												</button>
											))}
										</div>
									)}
								/>
							</div>

							{/* Platform */}
							<div>
								<Label className="mono-label block mb-1.5">Plataforma</Label>
								<Controller
									control={control}
									name="userPlatform"
									render={({ field }) => (
										<SelectOptions
											options={game.platforms}
											value={field.value}
											onChange={field.onChange}
											placeholder="Plataforma"
											className="w-full h-10 bg-bg-2 border-border text-text-hi"
										/>
									)}
								/>
							</div>
						</div>
					</div>

					{/* Botões fora do grid */}
					<div className="flex gap-2.5 justify-end">
						<Button
							type="button"
							variant="ghost"
							onClick={onClose}
							className="h-9 border border-border text-text-md rounded-lg"
						>
							Cancelar
						</Button>
						<Button
							variant="accent"
							type="submit"
							disabled={isPending}
							className="h-9 rounded-lg"
						>
							{isPending ? "Adicionando..." : "Adicionar"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
