import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useImportBatch } from "@/features/import/hooks/useImportBatch";
import {
	type ImportRow,
	previewImport,
} from "@/features/import/service/importService";
import type { GameSearchResult } from "@/types/api";
import { steamImportRows } from "../lib/steamImportRows";
import { fetchSteamPreview, type SteamPreview } from "../service/steamService";
import { useSteamStatus } from "./useSteamConnection";
export function useSteamImport() {
	const status = useSteamStatus();
	const batch = useImportBatch();
	const [source, setSource] = useState<SteamPreview | null>(null);
	const [overrides, setOverrides] = useState<Record<number, GameSearchResult>>(
		{},
	);
	const [excluded, setExcluded] = useState<Set<number>>(new Set());
	const preview = useMutation({ mutationFn: previewImport, retry: false });
	const page = useMutation({
		mutationFn: fetchSteamPreview,
		retry: false,
		onSuccess: async (data) => {
			setSource(data);
			setOverrides({});
			setExcluded(new Set());
			batch.reset();
			if (data.rows.length)
				await preview.mutateAsync(steamImportRows(data.rows, {}));
			else preview.reset();
		},
	});

	const sourceCurrent =
		!!source &&
		!!status.data?.configured &&
		source.steamId === status.data.steamId;
	useEffect(() => {
		if (!source || !status.isSuccess || sourceCurrent) return;
		setSource(null);
		setOverrides({});
		setExcluded(new Set());
		preview.reset();
		page.reset();
		batch.reset();
	}, [
		source,
		status.isSuccess,
		sourceCurrent,
		preview.reset,
		page.reset,
		batch.reset,
	]);
	const busy = page.isPending || preview.isPending || batch.commit.isPending;
	function load(offset: number) {
		if (!busy && status.data?.configured && status.data.steamId)
			page.mutate({ offset, limit: 50 });
	}
	function resolve(appId: number, match: GameSearchResult) {
		if (!source || !sourceCurrent || busy || batch.commit.isSuccess) return;
		const next = { ...overrides, [appId]: match };
		setOverrides(next);
		preview.mutate(steamImportRows(source.rows, next));
	}
	const ready =
		sourceCurrent && preview.isSuccess && !page.isPending
			? preview.data.rows
					.filter(
						(row) =>
							row.state === "READY" &&
							row.input?.igdbId &&
							!excluded.has(row.index),
					)
					.map((row) => ({
						row: { ...row.input, duplicateAction: "SKIP" } as ImportRow,
						index: (source?.offset ?? 0) + row.index,
					}))
			: [];
	return {
		status,
		source: sourceCurrent ? source : null,
		overrides,
		preview,
		page,
		batch,
		ready,
		busy,
		load,
		resolve,
		excluded,
		toggle: (index: number) => {
			if (!busy && !batch.commit.isSuccess)
				setExcluded((current) => {
					const next = new Set(current);
					if (next.has(index)) next.delete(index);
					else next.add(index);
					return next;
				});
		},
		retryPreview: () => {
			if (source && sourceCurrent && !busy)
				preview.mutate(steamImportRows(source.rows, overrides));
		},
		start: () => {
			if (sourceCurrent && ready.length && !busy && !batch.commit.isSuccess)
				batch.commit.mutate(ready);
		},
	};
}
