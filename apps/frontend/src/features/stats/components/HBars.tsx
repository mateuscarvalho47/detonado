interface HBarsProps {
	items: { label: string; count: number }[];
	color?: string;
}

export function HBars({ items, color = "oklch(0.78 0.012 80)" }: HBarsProps) {
	const max = Math.max(...items.map((i) => i.count), 1);
	return (
		<div className="flex flex-col gap-1.5">
			{items.map((item) => (
				<div
					key={item.label}
					className="grid gap-3 items-center text-body"
					style={{ gridTemplateColumns: "130px 1fr 32px" }}
				>
					<span className="text-text-md truncate">{item.label}</span>
					<div className="h-2.5 bg-bg-2 overflow-hidden">
						<div
							className="h-full transition-[width] duration-700 ease-out"
							style={{
								width: `${(item.count / max) * 100}%`,
								background: color,
							}}
						/>
					</div>
					<span className="text-text-hi text-right font-medium">
						{item.count}
					</span>
				</div>
			))}
		</div>
	);
}
