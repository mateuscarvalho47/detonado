import { describe, expect, it } from "vitest";
import {
	cleanSteamCallback,
	officialSteamUrl,
	readSteamCallback,
} from "./steamCallback";

describe("Steam callback handling", () => {
	it("forwards the original callback and rejects duplicate signed parameters", () => {
		const url =
			"https://detonado.test/account?steamState=test&openid.mode=id_res&openid.sig=test-signature";
		expect(readSteamCallback(url)).toEqual({
			parameters: {
				steamState: "test",
				"openid.mode": "id_res",
				"openid.sig": "test-signature",
			},
			callbackUrl: url,
		});
		expect(() => readSteamCallback(`${url}&openid.sig=repeated`)).toThrow(
			/repetidos/,
		);
		expect(readSteamCallback("https://detonado.test/account")).toBeNull();
	});
	it("cleans Steam verification data while preserving unrelated query and fragment", () => {
		expect(
			cleanSteamCallback(
				"https://detonado.test/account?keep=1&steamState=test&openid.sig=test#settings",
			),
		).toBe("/account?keep=1#settings");
	});
	it("allows only the official Steam sign-in endpoint", () => {
		expect(
			officialSteamUrl(
				"https://steamcommunity.com/openid/login?openid.mode=checkid_setup",
			),
		).toContain("https://steamcommunity.com/openid/login");
		expect(() =>
			officialSteamUrl("https://steamcommunity.com.evil.test/openid/login"),
		).toThrow();
		expect(() =>
			officialSteamUrl("http://steamcommunity.com/openid/login"),
		).toThrow();
		expect(() =>
			officialSteamUrl("https://user@steamcommunity.com/openid/login"),
		).toThrow();
	});
});
