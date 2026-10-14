import { Calendar } from "lucide-react";
import type {
	Control,
	UseFormGetValues,
	UseFormRegister,
	UseFormSetValue,
} from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";
import type { DetailFormValues } from "../schema/detailSchema";
import styles from "./Detail.module.css";
import { DetailInfoPanel } from "./DetailInfoPanel";

const HOURS_MAX = 99999.9;
const clampHours = (value: number) =>
	Math.round(Math.min(HOURS_MAX, Math.max(0, value)) * 10) / 10;
function todayInputValue() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function NotesField({
	register,
	label,
	placeholder,
}: {
	register: UseFormRegister<DetailFormValues>;
	label: string;
	placeholder: string;
}) {
	return (
		<div className={styles.field}>
			<Label htmlFor="game-notes">{label}</Label>
			<Textarea
				id="game-notes"
				{...register("notes")}
				placeholder={placeholder}
				rows={4}
				maxLength={4000}
			/>
		</div>
	);
}

export function DetailEditForm({
	game,
	control,
	register,
	setValue,
	getValues,
	status,
	rating,
}: {
	game: LibraryEntry;
	control: Control<DetailFormValues>;
	register: UseFormRegister<DetailFormValues>;
	setValue: UseFormSetValue<DetailFormValues>;
	getValues: UseFormGetValues<DetailFormValues>;
	status: DetailFormValues["status"];
	rating: number;
}) {
	const tracksProgress = ["PLAYING", "PAUSED", "COMPLETED", "DROPPED"].includes(
		status,
	);
	const whereILeftOff = status === "PLAYING" || status === "PAUSED";
	return (
		<section className={styles.editArea}>
			<div className={styles.editGrid}>
				<div className={styles.panel}>
					<h2 className={styles.panelTitle}>Meu registro</h2>
					<div className={styles.fields}>
						{whereILeftOff && (
							<NotesField
								register={register}
								label="Onde parei"
								placeholder="Ex.: antes do chefe da torre"
							/>
						)}
						<div className={styles.field}>
							<Label>Status</Label>
							<Controller
								control={control}
								name="status"
								render={({ field }) => (
									<div className={styles.statusGrid}>
										{STATUSES.map((item) => (
											<button
												type="button"
												key={item.key}
												onClick={() => {
													field.onChange(item.key);
													if (
														item.key === "COMPLETED" &&
														!getValues("completedAt")
													)
														setValue("completedAt", todayInputValue());
													if (item.key !== "COMPLETED")
														setValue("completedAt", "");
												}}
												className={styles.statusButton}
												data-active={field.value === item.key}
												aria-pressed={field.value === item.key}
												style={
													{
														"--status-color": item.color,
													} as React.CSSProperties
												}
											>
												<span className={styles.statusDot} />
												{item.label}
											</button>
										))}
									</div>
								)}
							/>
						</div>
						<div className={styles.field}>
							<Label htmlFor="game-platform">Plataforma</Label>
							<Controller
								control={control}
								name="userPlatform"
								render={({ field }) => (
									<select
										id="game-platform"
										className={styles.select}
										value={field.value ?? ""}
										onChange={field.onChange}
									>
										<option value="">Não informada</option>
										{game.platforms.map((platform) => (
											<option key={platform} value={platform}>
												{platform}
											</option>
										))}
									</select>
								)}
							/>
						</div>
						{tracksProgress && (
							<div className={styles.field}>
								<Label>Horas jogadas</Label>
								<Controller
									control={control}
									name="hoursPlayed"
									render={({ field }) => (
										<div className={styles.stepper}>
											<button
												type="button"
												aria-label="Diminuir meia hora"
												onClick={() =>
													field.onChange(clampHours(field.value - 0.5))
												}
											>
												−
											</button>
											<input
												aria-label="Horas jogadas"
												inputMode="decimal"
												value={field.value === 0 ? "0" : field.value || ""}
												onChange={(event) => {
													const value = Number.parseFloat(
														event.target.value.replace(",", "."),
													);
													field.onChange(
														Number.isNaN(value) ? 0 : clampHours(value),
													);
												}}
											/>
											<button
												type="button"
												aria-label="Adicionar meia hora"
												onClick={() =>
													field.onChange(clampHours(field.value + 0.5))
												}
											>
												+
											</button>
										</div>
									)}
								/>
							</div>
						)}
						{tracksProgress && (
							<div className={styles.field}>
								<div className={styles.ratingTop}>
									<Label htmlFor="game-rating">Sua avaliação</Label>
									<span className={styles.ratingValue}>
										{Math.round(rating)}/10
									</span>
								</div>
								<Controller
									control={control}
									name="rating"
									render={({ field }) => (
										<input
											id="game-rating"
											type="range"
											min={0}
											max={10}
											step={1}
											value={Math.round(field.value)}
											onChange={(event) =>
												field.onChange(Number.parseInt(event.target.value, 10))
											}
											className={styles.range}
										/>
									)}
								/>
								<div className={styles.ratingScale}>
									{[0, 2, 4, 6, 8, 10].map((value) => (
										<span key={value}>{value}</span>
									))}
								</div>
							</div>
						)}
						{!whereILeftOff && (
							<NotesField
								register={register}
								label="Notas"
								placeholder="O que você quer lembrar sobre este jogo?"
							/>
						)}
						{status === "COMPLETED" && (
							<div className={styles.field}>
								<Label htmlFor="completed-at">Data de conclusão</Label>
								<div className={styles.date}>
									<Input
										id="completed-at"
										type="date"
										{...register("completedAt")}
									/>
									<Calendar />
								</div>
							</div>
						)}
					</div>
				</div>
				<DetailInfoPanel game={game} />
			</div>
		</section>
	);
}
