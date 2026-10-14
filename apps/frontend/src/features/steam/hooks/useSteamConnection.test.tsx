import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren, StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	disconnectSteam,
	fetchSteamStatus,
	verifySteam,
} from "../service/steamService";
import { useSteamConnection } from "./useSteamConnection";

vi.mock("../service/steamService", () => ({
	connectSteam: vi.fn(),
	disconnectSteam: vi.fn(),
	fetchSteamStatus: vi.fn(),
	verifySteam: vi.fn(),
}));
beforeEach(() => {
	vi.resetAllMocks();
	window.history.replaceState(null, "", "/account");
	vi.mocked(fetchSteamStatus).mockResolvedValue({
		configured: true,
		steamId: null,
	});
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<StrictMode>
			<QueryClientProvider client={qc}>{children}</QueryClientProvider>
		</StrictMode>
	);
	return { ...renderHook(() => useSteamConnection(), { wrapper }), qc };
}
describe("Steam verified connection", () => {
	it("verifies a callback once in Strict Mode, then cleans its query", async () => {
		window.history.replaceState(
			null,
			"",
			"/account?keep=1&steamState=test&openid.mode=id_res&openid.sig=test-signature",
		);
		const callbackUrl = window.location.href;
		vi.mocked(verifySteam).mockImplementation(async () => {
			vi.mocked(fetchSteamStatus).mockResolvedValue({
				configured: true,
				steamId: "76561198000000000",
			});
			return { steamId: "76561198000000000" };
		});
		const { result, qc } = setup();
		await waitFor(() => expect(result.current.verify.isSuccess).toBe(true));
		expect(verifySteam).toHaveBeenCalledTimes(1);
		expect(verifySteam).toHaveBeenCalledWith(
			{
				steamState: "test",
				"openid.mode": "id_res",
				"openid.sig": "test-signature",
			},
			callbackUrl,
		);
		expect(window.location.search).toBe("?keep=1");
		await waitFor(() =>
			expect(qc.getQueryData(["steam-status"])).toMatchObject({
				steamId: "76561198000000000",
			}),
		);
	});
	it("rejects duplicated parameters before calling the backend and cleans the URL", async () => {
		window.history.replaceState(
			null,
			"",
			"/account?steamState=test&openid.sig=first&openid.sig=second",
		);
		const { result } = setup();
		await waitFor(() =>
			expect(result.current.callbackError).toContain("repetidos"),
		);
		expect(verifySteam).not.toHaveBeenCalled();
		expect(window.location.search).toBe("");
	});
	it("disconnects the session without touching library data", async () => {
		vi.mocked(fetchSteamStatus).mockResolvedValue({
			configured: true,
			steamId: "76561198000000000",
		});
		vi.mocked(disconnectSteam).mockResolvedValue(undefined);
		const { result, qc } = setup();
		qc.setQueryData(["library"], [{ id: "game" }]);
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
		act(() => result.current.disconnect.mutate());
		await waitFor(() => expect(result.current.disconnect.isSuccess).toBe(true));
		expect(qc.getQueryData(["steam-status"])).toMatchObject({ steamId: null });
		expect(qc.getQueryData(["library"])).toEqual([{ id: "game" }]);
	});
});
