import { Calendar } from "lucide-react";
import type { Control, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectOptions } from "@/components/ui/select-options";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { statusColor } from "@/lib/statusColor";
import { STATUSES } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";
import type { DetailFormValues } from "../schema/detailSchema";
import { DetailInfoPanel } from "./DetailInfoPanel";

const RATING_TICKS = Array.from({ length: 9 }, (_, i) => i);

interface DetailEditFormProps {
	game: LibraryEntry;
	control: Control<DetailFormValues>;
	register: UseFormRegister<DetailFormValues>;
	status: DetailFormValues["status"];
	rating: number;
}

export function DetailEditForm({
	game,
	control,
	register,
	status,
	rating,
}: DetailEditFormProps) {
	return (
		<div className="px-6 py-6 pb-15">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
				{/* Edit form */}
				<div className="bg-bg-1 border border-border-soft rounded-lg p-5.5">
					<div className="text-heading font-semibold tracking-tight text-text-hi mb-5">
						Editar entrada
					</div>

					<div className="grid grid-cols-1 gap-5">
						{/* Status picker */}
						<div>
							<Label className="mono-label block mb-1.5">Status</Label>
							<Controller
								control={control}
								name="status"
								render={({ field }) => (
									<ToggleGroup
										type="single"
										value={field.value}
										onValueChange={(v) => {
											if (v) field.onChange(v);
										}}
										className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 justify-start"
									>
										{STATUSES.map((s) => (
											<ToggleGroupItem
												key={s.key}
												value={s.key}
												className="flex items-center gap-2 h-8 px-2.5 rounded-md text-body font-medium border w-full justify-start"
												style={
													field.value === s.key
														? {
																background: statusColor(s.hue, "bgActive"),
																border: `1px solid ${statusColor(s.hue, "borderActive")}`,
																color: statusColor(s.hue, "textActive"),
															}
														: {
																background: "var(--color-bg-2)",
																border: "1px solid var(--color-border-soft)",
																color: "var(--color-text-md)",
															}
												}
											>
												<div
													className="size-1.5 rounded-full shrink-0"
													style={{ background: s.color }}
												/>
												{s.label}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
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
										allowClear
										className="w-full h-10 bg-bg-2 border-border text-text-hi"
									/>
								)}
							/>
						</div>

						{/* Hours */}
						{["PLAYING", "PAUSED", "COMPLETED", "DROPPED"].includes(status) && (
							<div>
								<Label className="mono-label block mb-1.5">Horas jogadas</Label>
								<Controller
									control={control}
									name="hoursPlayed"
									render={({ field }) => (
										<div className="flex items-center bg-bg-2 border border-border rounded-lg h-10 overflow-hidden">
											<button
												type="button"
												onClick={() =>
													field.onChange(Math.max(0, field.value - 0.5))
												}
												className="flex items-center justify-center w-9 shrink-0 h-full text-text-dim hover:text-text-hi hover:bg-bg-3 border-r border-border transition-colors cursor-pointer bg-transparent"
											>
												<span className="text-[17px] leading-none select-none">
													−
												</span>
											</button>
											<div className="flex-1 flex items-center justify-center gap-0.5">
												<input
													type="text"
													inputMode="decimal"
													value={field.value || ""}
													onChange={(e) => {
														const val = parseFloat(
															e.target.value.replace(",", "."),
														);
														field.onChange(
															Number.isNaN(val) ? 0 : Math.max(0, val),
														);
													}}
													className="w-14 text-center bg-transparent border-0 outline-none text-text-hi text-body"
												/>
												<span className="text-text-dim text-body">h</span>
											</div>
											<button
												type="button"
												onClick={() => field.onChange(field.value + 0.5)}
												className="flex items-center justify-center w-9 shrink-0 h-full text-text-dim hover:text-text-hi hover:bg-bg-3 border-l border-border transition-colors cursor-pointer bg-transparent"
											>
												<span className="text-[17px] leading-none select-none">
													+
												</span>
											</button>
										</div>
									)}
								/>
							</div>
						)}

						{/* Rating slider */}
						{["PAUSED", "COMPLETED", "DROPPED"].includes(status) && (
							<div>
								<div className="flex items-baseline justify-between mb-1.5">
									<Label className="mono-label">Avaliação</Label>
									<span className="text-[17px] text-text-hi">
										<b className="font-bold">{rating}</b>
										<span className="text-caption text-text-lo ml-px">/10</span>
									</span>
								</div>
								<div className="relative h-9 bg-bg-2 border border-border rounded-lg overflow-hidden">
									<div
										className="absolute top-0 bottom-0 left-0 pointer-events-none transition-[width] duration-150 gradient-accent-fill"
										style={{ width: `${(rating / 10) * 100}%` }}
									/>
									<div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
										{RATING_TICKS.map((i) => (
											<div key={i} className="w-px h-2 bg-border-strong" />
										))}
									</div>
									<Controller
										control={control}
										name="rating"
										render={({ field }) => (
											<input
												type="range"
												min={0}
												max={10}
												step={0.5}
												value={field.value}
												onChange={(e) =>
													field.onChange(parseFloat(e.target.value))
												}
												className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer m-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0.75 [&::-webkit-slider-thumb]:h-9 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-white/60 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-0.75 [&::-moz-range-thumb]:h-9 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:bg-white/60 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
											/>
										)}
									/>
								</div>
								<div className="flex justify-between text-caption text-text-dim px-0.5 mt-1">
									{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
										<span key={n}>{n}</span>
									))}
								</div>
							</div>
						)}

						{/* Notes */}
						<div>
							<Label className="mono-label block mb-1.5">Notas</Label>
							<Textarea
								{...register("notes")}
								placeholder="Suas anotações sobre o jogo..."
								rows={4}
								className="bg-bg-2 border-border text-text-hi placeholder:text-text-lo resize-y leading-relaxed"
							/>
						</div>

						{/* Completed at */}
						{status === "COMPLETED" && (
							<div>
								<Label className="mono-label block mb-1.5">
									Data de conclusão
								</Label>
								<div className="relative">
									<Input
										type="date"
										{...register("completedAt")}
										style={{ colorScheme: "dark" }}
										className="bg-bg-2 border-border text-text-hi h-10 text-heading w-full pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
									/>
									<Calendar
										size={15}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-text-lo pointer-events-none"
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				<DetailInfoPanel game={game} />
			</div>
		</div>
	);
}
