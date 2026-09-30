import { formatHours } from "@/shared/lib/formatHours";

interface HltbStatProps {
	label: string;
	hours: number | null | undefined;
}

export function HltbStat({ label, hours }: HltbStatProps) {
	return (
		<div className="flex flex-col gap-1 px-3 py-2 bg-bg-2 border border-border-soft">
			<div className="mono-label text-text-lo text-caption">{label}</div>
			<div className="text-body font-semibold text-text-hi tabular-nums">
				{formatHours(hours)}
			</div>
		</div>
	);
}

export function HltbStatSkeleton() {
	return (
		<div className="flex flex-col gap-1 px-3 py-2 bg-bg-2 border border-border-soft">
			<div className="h-3 w-12 rounded bg-bg-3 animate-pulse" />
			<div className="h-4 w-10 rounded bg-bg-3 animate-pulse mt-0.5" />
		</div>
	);
}
