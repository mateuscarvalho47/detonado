import { beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { fetchSessions } from "./sessionService";

vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
it("requests sessions of the specified campaign instead of active sessions", () => {
	fetchSessions("game", "old-campaign");
	expect(api.get).toHaveBeenCalledWith(
		"/library/game/sessions?campaignId=old-campaign",
	);
	fetchSessions("game");
	expect(api.get).toHaveBeenLastCalledWith("/library/game/sessions");
});
