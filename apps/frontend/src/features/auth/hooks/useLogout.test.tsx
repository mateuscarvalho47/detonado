import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import {
	queuedSessions,
	synchronizeOfflineSessions,
} from "@/features/offline/service/offlineService";
import { login, logout } from "../service/authService";
import { useLogin, useLogout } from "./useAuth";

vi.mock("@/features/offline/service/offlineService", () => ({
	queuedSessions: vi.fn(),
	synchronizeOfflineSessions: vi.fn(),
}));
vi.mock("../service/authService", () => ({ logout: vi.fn(), login: vi.fn() }));
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(synchronizeOfflineSessions).mockRejectedValue(
		new TypeError("offline"),
	);
	vi.mocked(queuedSessions).mockResolvedValue([
		{} as Awaited<ReturnType<typeof queuedSessions>>[number],
	]);
});
it("preserves authentication and pending sessions when logout is cancelled", async () => {
	vi.spyOn(window, "confirm").mockReturnValue(false);
	const client = new QueryClient();
	client.setQueryData(["me"], { id: "alice" });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useLogout(), { wrapper });
	await act(() => result.current.mutateAsync());
	expect(logout).not.toHaveBeenCalled();
	expect(client.getQueryData(["me"])).toEqual({ id: "alice" });
});
it("logs out and clears the account query cache only after explicit discard confirmation", async () => {
	vi.spyOn(window, "confirm").mockReturnValue(true);
	vi.mocked(logout).mockResolvedValue(undefined);
	const client = new QueryClient();
	client.setQueryData(["me"], { id: "alice" });
	client.setQueryData(["library"], [{ id: "private" }]);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useLogout(), { wrapper });
	await act(() => result.current.mutateAsync());
	expect(logout).toHaveBeenCalledOnce();
	expect(client.getQueryData(["library"])).toBeUndefined();
});

it("clears the previous account's query data before accepting a successful login", async () => {
	const client = new QueryClient();
	client.setQueryData(["me"], { id: "alice" });
	client.setQueryData(["library"], [{ id: "alice-private" }]);
	client.setQueryData(["journal", "alice-entry"], {
		entries: [{ text: "private" }],
	});
	vi.mocked(login).mockResolvedValue({
		id: "bob",
		email: "bob@example.com",
		consentedAt: null,
		createdAt: "",
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useLogin(), { wrapper });
	await act(() =>
		result.current.mutateAsync({
			email: "bob@example.com",
			password: "password",
		}),
	);
	expect(client.getQueryData(["me"])).toMatchObject({ id: "bob" });
	expect(client.getQueryData(["library"])).toBeUndefined();
	expect(client.getQueryData(["journal", "alice-entry"])).toBeUndefined();
});
