import { useEffect, useMemo, useState } from "react";
import type { LibraryEntry } from "@/types/api";
export interface SelectionControls {
	selectedIds: Set<string>;
	toggle: (id: string) => void;
	locked: boolean;
}
export function useBulkSelection(visible: LibraryEntry[]) {
	const [active, setActive] = useState(false);
	const [ids, setIds] = useState<string[]>([]);
	const [locked, setLocked] = useState(false);
	const visibleIds = useMemo(
		() => new Set(visible.map((game) => game.id)),
		[visible],
	);
	useEffect(() => {
		setIds((current) => {
			const next = current.filter((id) => visibleIds.has(id));
			return next.length === current.length ? current : next;
		});
	}, [visibleIds]);
	const selected = useMemo(
		() => visible.filter((game) => ids.includes(game.id)),
		[visible, ids],
	);
	const selectedIds = useMemo(
		() => new Set(selected.map((game) => game.id)),
		[selected],
	);
	function toggle(id: string) {
		if (locked || !visibleIds.has(id)) return;

		setIds((current) => {
			const retained = current.filter((value) => visibleIds.has(value));
			if (retained.includes(id))
				return retained.filter((value) => value !== id);
			if (retained.length >= 100) return retained;
			return [...retained, id];
		});
	}
	return {
		active,
		selected,
		selectedIds,
		toggle,
		locked,
		setLocked,
		begin: () => setActive(true),
		clear: () => {
			if (!locked) setIds([]);
		},
		cancel: () => {
			if (!locked) {
				setIds([]);
				setActive(false);
			}
		},
		selectAll: () => {
			if (!locked) setIds(visible.slice(0, 100).map((game) => game.id));
		},
	};
}
