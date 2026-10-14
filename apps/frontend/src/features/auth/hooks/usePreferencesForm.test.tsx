import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	fetchMe,
	fetchPlatforms,
	updatePreferences,
} from "../service/authService";
import { usePreferencesForm } from "./usePreferencesForm";

vi.mock("../service/authService", () => ({
	fetchMe: vi.fn(),
	fetchPlatforms: vi.fn(),
	updatePreferences: vi.fn(),
}));
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchMe).mockResolvedValue({
		id: "user",
		email: "a@b.com",
		consentedAt: null,
		createdAt: "",
		preferredPlatform: "PC",
	});
	vi.mocked(fetchPlatforms).mockResolvedValue({ platforms: ["PC", "PS5"] });
});
function setup() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return { ...renderHook(() => usePreferencesForm(), { wrapper }), client };
}
describe("preferences form", () => {
	it("saves and removes preference, updating authenticated user cache", async () => {
		const { result, client } = setup();
		await waitFor(() => expect(result.current.value).toBe("PC"));
		vi.mocked(updatePreferences).mockResolvedValue({
			preferredPlatform: "PS5",
		});
		act(() => result.current.selectPlatform("PS5"));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(client.getQueryData(["me"])).toMatchObject({
			preferredPlatform: "PS5",
		});
		vi.mocked(updatePreferences).mockResolvedValue({ preferredPlatform: null });
		act(() => result.current.selectPlatform(""));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() =>
			expect(client.getQueryData(["me"])).toMatchObject({
				preferredPlatform: null,
			}),
		);
		expect(updatePreferences).toHaveBeenLastCalledWith(
			{ preferredPlatform: null },
			expect.anything(),
		);
	});
	it("preserves server preference on error", async () => {
		const { result, client } = setup();
		await waitFor(() => expect(result.current.value).toBe("PC"));
		vi.mocked(updatePreferences).mockRejectedValue(
			new Error("Falha ao salvar"),
		);
		act(() => result.current.selectPlatform("PS5"));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() =>
			expect(result.current.mutation.error?.message).toBe("Falha ao salvar"),
		);
		expect(client.getQueryData(["me"])).toMatchObject({
			preferredPlatform: "PC",
		});
	});
});
