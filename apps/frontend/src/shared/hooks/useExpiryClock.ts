import { useEffect, useState } from "react";
export function useExpiryClock(
	expirations: (string | null)[],
	enabled: boolean,
) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!enabled) return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		function tick() {
			const current = Date.now();
			setNow(current);

			let next = Number.POSITIVE_INFINITY;
			for (const date of expirations) {
				const timestamp = date
					? new Date(date).getTime()
					: Number.POSITIVE_INFINITY;
				if (timestamp > current && timestamp < next) next = timestamp;
			}
			if (Number.isFinite(next))
				timer = setTimeout(tick, Math.min(60000, Math.max(1, next - current)));
		}
		tick();
		return () => {
			if (timer !== undefined) clearTimeout(timer);
		};
	}, [enabled, expirations]);
	return now;
}
