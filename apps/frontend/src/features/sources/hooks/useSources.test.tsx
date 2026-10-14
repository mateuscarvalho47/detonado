import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localDateTime } from "@/features/sessions/lib/sessionTime";
import type { GameSource, LibraryEntry } from "@/types/api";
import {
	createSource,
	deleteSource,
	fetchSources,
	updateSource,
} from "../service/sourceService";
import { useSources } from "./useSources";

vi.mock("../service/sourceService", () => ({
	createSource: vi.fn(),
	deleteSource: vi.fn(),
	fetchSources: vi.fn(),
	updateSource: vi.fn(),
}));
const source: GameSource = {
	id: "one",
	kind: "SUBSCRIPTION",
	label: "Game Pass",
	expiresAt: "2026-01-01T13:00:00.000Z",
	createdAt: "",
	updatedAt: "",
};
const game: LibraryEntry = {
	id: "game",
	igdbId: 1,
	name: "Game",
	status: "BACKLOG",
	userPlatform: "PC",
	sources: [source],
	genres: [],
	platforms: [],
	hltbMain: null,
	hltbMainExtra: null,
	hltbCompletionist: null,
	createdAt: "",
	updatedAt: "",
};
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchSources).mockResolvedValue({ sources: [source] });
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	qc.setQueryData(["library"], [game]);
	qc.setQueryData(["library", 1], game);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return { ...renderHook(() => useSources(game), { wrapper }), qc };
}
describe("game sources", () => {
	it("creates permanent access without changing platform and edits expiry in local time", async () => {
		const { result, qc } = setup();
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
		const added = {
			...source,
			id: "two",
			kind: "STORE" as const,
			label: "Steam",
			expiresAt: null,
		};
		vi.mocked(createSource).mockResolvedValue(added);
		act(() => result.current.form.setValue("label", " Steam "));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(createSource).toHaveBeenCalledWith("game", {
			kind: "STORE",
			label: "Steam",
			expiresAt: null,
		});
		expect(qc.getQueryData(["library", 1])).toMatchObject({
			userPlatform: "PC",
			sources: [source, added],
		});
		act(() => result.current.edit(source));
		expect(result.current.form.getValues("expiresAt")).toBe(
			localDateTime(source.expiresAt ?? undefined),
		);
		const changed = { ...source, expiresAt: null };
		vi.mocked(updateSource).mockResolvedValue(changed);
		act(() => result.current.form.setValue("expiresAt", ""));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.editing).toBeNull());
		expect(updateSource).toHaveBeenCalledWith("game", "one", {
			kind: "SUBSCRIPTION",
			label: "Game Pass",
			expiresAt: null,
		});
	});
	it("deletes one source while preserving the library entry", async () => {
		const { result, qc } = setup();
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
		vi.mocked(deleteSource).mockResolvedValue(undefined);
		act(() => result.current.setDeleting(source));
		act(() => result.current.confirmDelete());
		await waitFor(() => expect(result.current.deleting).toBeNull());
		expect(deleteSource).toHaveBeenCalledWith("game", "one");
		expect(qc.getQueryData(["library"])).toEqual([{ ...game, sources: [] }]);
	});
	it("converts local expiration to UTC and preserves edits on request failure", async () => {
		const { result } = setup();
		vi.mocked(createSource).mockRejectedValue(new Error("Falha"));
		act(() => {
			result.current.form.setValue("label", "Empréstimo");
			result.current.form.setValue("expiresAt", "2026-10-20T10:30");
		});
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isError).toBe(true));
		expect(createSource).toHaveBeenCalledWith(
			"game",
			expect.objectContaining({
				expiresAt: new Date("2026-10-20T10:30").toISOString(),
			}),
		);
		expect(result.current.form.getValues("label")).toBe("Empréstimo");
	});
});
