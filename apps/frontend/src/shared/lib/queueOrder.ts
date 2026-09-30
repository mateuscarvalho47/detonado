import { formatBacklogHours } from "./backlogHours";

export function compareQueue(
	a: { queuePosition?: number | null; createdAt: string },
	b: { queuePosition?: number | null; createdAt: string },
) {
	const left = a.queuePosition ?? Number.POSITIVE_INFINITY;
	const right = b.queuePosition ?? Number.POSITIVE_INFINITY;
	if (left !== right) return left - right;
	return a.createdAt.localeCompare(b.createdAt);
}

export function queueCaption(entry: {
	hltbMain?: number | null;
	userPlatform?: string;
	platforms: string[];
}) {
	const platform = entry.userPlatform ?? entry.platforms[0];
	const time =
		entry.hltbMain == null
			? "sem estimativa"
			: `${formatBacklogHours(entry.hltbMain)}h`;
	return platform ? `${platform} · ${time}` : time;
}
