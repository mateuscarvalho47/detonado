import type { LibraryStats } from "@/types/api";

interface HistogramProps {
	distribution: LibraryStats["ratingDistribution"];
}

export function Histogram({ distribution }: HistogramProps) {
	const maxCount = Math.max(...distribution.map((d) => d.count), 1);
	const ratings = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

	return (
		<div
			className="grid gap-2 h-50 items-end"
			style={{ gridTemplateColumns: "repeat(11, 1fr)" }}
		>
			{ratings.map((rating) => {
				const entry = distribution.find((d) => d.rating === rating);
				const count = entry?.count ?? 0;
				const heightPct = (count / maxCount) * 100;
				const isMode = count === maxCount && count > 0;
				return (
					<div key={rating} className="flex flex-col gap-1.5 h-full">
						<div className="flex-1 flex items-end justify-center">
							<div
								className="w-full min-h-1 rounded-t-sm flex items-start justify-center pt-1 transition-[height] duration-700 ease-out"
								style={{
									height: `${heightPct}%`,
									background: isMode
										? "oklch(0.92 0.012 80)"
										: count > 0
											? "oklch(0.55 0.012 70)"
											: "oklch(0.22 0.009 28)",
								}}
							>
								{count > 0 && (
									<span
										className="text-caption font-semibold"
										style={{
											color: isMode
												? "oklch(0.2 0.012 50)"
												: "var(--color-text-hi)",
										}}
									>
										{count}
									</span>
								)}
							</div>
						</div>
						<div className="text-center text-[11.5px] text-text-lo">
							{rating}
						</div>
					</div>
				);
			})}
		</div>
	);
}
