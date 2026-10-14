import { X } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Cover } from "@/shared/components/Cover";
import { HltbStat, HltbStatSkeleton } from "@/shared/components/HltbStat";
import { STATUSES } from "@/shared/constants/statuses";
import { hltbCaption } from "@/shared/lib/hltbCaption";
import type { GameSearchResult } from "@/types/api";
import { useAddToLibraryForm } from "../hooks/useAddToLibraryForm";
import { useGameDetail } from "../hooks/useGameSearch";
import styles from "./Search.module.css";
export function AddToLibraryModal({
	game,
	onClose,
	onAdded,
}: {
	game: GameSearchResult;
	onClose: () => void;
	onAdded: (igdbId: number) => void;
}) {
	const { form, onSubmit, isPending, selectPlatform } = useAddToLibraryForm(
		game,
		onAdded,
	);
	const { control } = form;
	const { data: detail, isLoading } = useGameDetail(game.igdbId);
	const hltb = detail?.hltb;
	return (
		<Dialog
			open
			onOpenChange={(value) => {
				if (!value) onClose();
			}}
		>
			<DialogContent
				showCloseButton={false}
				aria-describedby={undefined}
				className={styles.addModal}
			>
				<div className={styles.modalHead}>
					<DialogTitle>Adicionar à biblioteca</DialogTitle>
					<DialogClose asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Fechar"
							className={styles.modalClose}
						>
							<X />
						</Button>
					</DialogClose>
				</div>
				<form onSubmit={onSubmit} className={styles.addForm}>
					<div className={styles.gameGrid}>
						<div className={styles.addCover}>
							<Cover
								game={{
									name: game.name,
									year: game.releaseYear,
									platforms: game.platforms,
									cover: { hue: 20, scheme: "duotone", glyph: game.name[0] },
									coverUrl: game.coverUrl,
								}}
								size="lg"
							/>
						</div>
						<div className={styles.gameFields}>
							<div>
								<div className={styles.meta}>
									{game.genres.slice(0, 2).join(" · ")}
								</div>
								<h3>{game.name}</h3>
								<div className={styles.meta}>
									{game.releaseYear ?? "TBA"} ·{" "}
									{game.platforms.slice(0, 3).join(", ")}
								</div>
							</div>
							{(isLoading || detail) && (
								<div className={styles.field}>
									<Label>Tempo para terminar</Label>
									{isLoading ? (
										<div className={styles.hltbGrid}>
											<HltbStatSkeleton />
											<HltbStatSkeleton />
											<HltbStatSkeleton />
										</div>
									) : hltb ? (
										<div className={styles.hltbGrid}>
											<HltbStat label="Principal" hours={hltb.mainHours} />
											<HltbStat label="+ Extras" hours={hltb.mainExtraHours} />
											<HltbStat
												label="Completista"
												hours={hltb.completionistHours}
											/>
										</div>
									) : (
										<p>{hltbCaption(detail?.hltbStatus, false)}</p>
									)}
								</div>
							)}
							<div className={styles.field}>
								<Label>Status</Label>
								<Controller
									control={control}
									name="status"
									render={({ field }) => (
										<div className={styles.statusGrid}>
											{STATUSES.map((status) => (
												<button
													type="button"
													key={status.key}
													onClick={() => field.onChange(status.key)}
													className={styles.status}
													data-active={field.value === status.key}
													aria-pressed={field.value === status.key}
													style={
														{
															"--status-color": status.color,
														} as React.CSSProperties
													}
												>
													<span className={styles.dot} />
													{status.label}
												</button>
											))}
										</div>
									)}
								/>
							</div>
							<div className={styles.field}>
								<Label htmlFor="add-platform">Plataforma</Label>
								<Controller
									control={control}
									name="userPlatform"
									render={({ field }) => (
										<select
											id="add-platform"
											className={styles.select}
											value={field.value ?? ""}
											onChange={(event) => selectPlatform(event.target.value)}
										>
											<option value="">Escolha uma plataforma</option>
											{game.platforms.map((platform) => (
												<option key={platform} value={platform}>
													{platform}
												</option>
											))}
										</select>
									)}
								/>
							</div>
						</div>
					</div>
					<div className={styles.actions}>
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancelar
						</Button>
						<Button variant="accent" type="submit" disabled={isPending}>
							{isPending ? "Adicionando…" : "Adicionar jogo"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
