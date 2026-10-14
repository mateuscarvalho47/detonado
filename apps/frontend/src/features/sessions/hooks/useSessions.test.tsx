import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLibraryEntry } from "@/features/detail/service/detailService";
import type { LibraryEntry } from "@/types/api";
import {
	createSession,
	deleteSession,
	fetchSessions,
	type PlaySession,
	updateSession,
} from "../service/sessionService";
import { useSessions } from "./useSessions";

vi.mock("../service/sessionService", () => ({
	fetchSessions: vi.fn(),
	createSession: vi.fn(),
	updateSession: vi.fn(),
	deleteSession: vi.fn(),
}));
vi.mock("@/features/detail/service/detailService", () => ({
	fetchLibraryEntry: vi.fn(),
}));
const game: LibraryEntry = {
	id: "game",
	igdbId: 1,
	name: "Game",
	status: "PLAYING",
	genres: [],
	platforms: [],
	hoursPlayed: 5,
	baseHours: 5,
	hltbMain: null,
	hltbMainExtra: null,
	hltbCompletionist: null,
	createdAt: "",
	updatedAt: "",
};
const session: PlaySession = {
	id: "session",
	entryId: "game",
	clientId: "uuid",
	playedAt: "2026-10-13T15:00:00.000Z",
	durationMinutes: 60,
	notes: "Castelo",
	createdAt: "",
	updatedAt: "",
};
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchSessions).mockResolvedValue({ sessions: [session] });
	vi.mocked(fetchLibraryEntry).mockResolvedValue({
		...game,
		hoursPlayed: 6,
		lastSessionAt: session.playedAt,
	});
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	qc.setQueryData(["library"], [game]);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return { ...renderHook(() => useSessions(game), { wrapper }), qc };
}
describe("sessions", () => {
	it("preserves client UUID and entered values across failed retries, then refreshes totals", async () => {
		const { result, qc } = setup();
		vi.mocked(createSession)
			.mockRejectedValueOnce(new Error("Sem conexão"))
			.mockResolvedValueOnce(session);
		act(() => result.current.form.setValue("notes", "Minha sessão"));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isError).toBe(true));
		const first = vi.mocked(createSession).mock.calls[0]?.[1];
		expect(result.current.form.getValues("notes")).toBe("Minha sessão");
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(vi.mocked(createSession).mock.calls[1]?.[1]).toEqual(first);
		expect(first?.clientId).toMatch(/^[0-9a-f-]{36}$/);
		expect(qc.getQueryData(["library", 1])).toMatchObject({
			hoursPlayed: 6,
			baseHours: 5,
		});
		expect(qc.getQueryData(["library"])).toEqual([
			expect.objectContaining({ hoursPlayed: 6 }),
		]);
	});
	it("edits dates and duration, and deletes a selected session", async () => {
		const { result } = setup();
		vi.mocked(updateSession).mockResolvedValue(session);
		act(() => result.current.edit(session));
		act(() => result.current.form.setValue("durationMinutes", 90));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(updateSession).toHaveBeenCalledWith("game", "session", {
			playedAt: session.playedAt,
			durationMinutes: 90,
			notes: "Castelo",
		});
		act(() => result.current.setDeleteId("session"));
		act(() => result.current.confirmDelete());
		await waitFor(() => expect(result.current.deleteId).toBeNull());
		expect(deleteSession).toHaveBeenCalledWith("game", "session");
	});
	it("binds a new session attempt to its active campaign", async () => {
		const qc = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={qc}>{children}</QueryClientProvider>
		);
		const { result, rerender } = renderHook(
			({ campaignId }) =>
				useSessions({ ...game, activeCampaignId: campaignId }),
			{ wrapper, initialProps: { campaignId: "old" } },
		);
		vi.mocked(createSession).mockRejectedValue(new Error("Campanha mudou"));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isError).toBe(true));
		const first = vi.mocked(createSession).mock.calls[0]?.[1];
		expect(first?.campaignId).toBe("old");
		rerender({ campaignId: "new" });
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() =>
			expect(vi.mocked(createSession).mock.calls).toHaveLength(2),
		);
		const second = vi.mocked(createSession).mock.calls[1]?.[1];
		expect(second?.campaignId).toBe("new");
		expect(second?.clientId).not.toBe(first?.clientId);
	});
});
