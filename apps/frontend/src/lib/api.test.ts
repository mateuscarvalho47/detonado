import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, clearCsrfToken } from "./api";

function jsonResponse(status: number, body: unknown) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: () => Promise.resolve(body),
	} as Response;
}

function mockFetch(status: number, body: unknown) {
	return vi
		.spyOn(globalThis, "fetch")
		.mockResolvedValue(jsonResponse(status, body));
}

function csrfThen(status: number, body: unknown) {
	return vi
		.spyOn(globalThis, "fetch")
		.mockResolvedValueOnce(jsonResponse(200, { token: "csrf-token" }))
		.mockResolvedValueOnce(jsonResponse(status, body));
}

afterEach(() => {
	clearCsrfToken();
	vi.restoreAllMocks();
});

describe("ApiError", () => {
	it("sets name, code, message, details and status", () => {
		const err = new ApiError("NOT_FOUND", "Not found", { id: 1 }, 404);
		expect(err.name).toBe("ApiError");
		expect(err.code).toBe("NOT_FOUND");
		expect(err.message).toBe("Not found");
		expect(err.details).toEqual({ id: 1 });
		expect(err.status).toBe(404);
		expect(err).toBeInstanceOf(Error);
	});

	it("allows undefined details and status", () => {
		const err = new ApiError("ERR", "oops");
		expect(err.details).toBeUndefined();
		expect(err.status).toBeUndefined();
	});
});

describe("api.get", () => {
	it("returns parsed JSON on success", async () => {
		const spy = mockFetch(200, { id: "1" });
		const result = await api.get<{ id: string }>("/games");
		expect(result).toEqual({ id: "1" });
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("throws ApiError with server error payload on failure", async () => {
		mockFetch(404, { error: { code: "NOT_FOUND", message: "Game not found" } });
		await expect(api.get("/games/999")).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Game not found",
			status: 404,
		});
	});

	it("throws ApiError with UNKNOWN_ERROR when response has no error body", async () => {
		mockFetch(500, {});
		await expect(api.get("/broken")).rejects.toMatchObject({
			code: "UNKNOWN_ERROR",
		});
	});
});

describe("api.post", () => {
	it("sends the csrf header and the JSON body", async () => {
		const spy = csrfThen(201, { id: "42" });
		const result = await api.post<{ id: string }>("/library", {
			igdbId: 1,
			status: "PLAYING",
		});
		expect(result).toEqual({ id: "42" });
		expect(spy).toHaveBeenNthCalledWith(
			1,
			"/api/auth/csrf",
			expect.objectContaining({ credentials: "include" }),
		);
		const init = spy.mock.calls[1]?.[1] as RequestInit;
		expect(init.method).toBe("POST");
		expect(init.body).toBe(JSON.stringify({ igdbId: 1, status: "PLAYING" }));
		expect(new Headers(init.headers).get("x-csrf-token")).toBe("csrf-token");
		expect(new Headers(init.headers).get("content-type")).toBe(
			"application/json",
		);
	});

	it("reuses the csrf token for the next mutation", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(jsonResponse(200, { token: "csrf-token" }))
			.mockResolvedValueOnce(jsonResponse(204, null))
			.mockResolvedValueOnce(jsonResponse(204, null));
		await api.post("/auth/consent");
		await api.post("/auth/consent");
		expect(spy).toHaveBeenCalledTimes(3);
	});

	it("fetches a new csrf token after a csrf rejection and retries once", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(jsonResponse(200, { token: "stale" }))
			.mockResolvedValueOnce(
				jsonResponse(403, {
					error: { code: "CSRF_INVALID", message: "nope" },
				}),
			)
			.mockResolvedValueOnce(jsonResponse(200, { token: "fresh" }))
			.mockResolvedValueOnce(jsonResponse(201, { id: "42" }));
		const result = await api.post("/library", { igdbId: 1 });
		expect(result).toEqual({ id: "42" });
		const retry = spy.mock.calls[3]?.[1] as RequestInit;
		expect(new Headers(retry.headers).get("x-csrf-token")).toBe("fresh");
	});

	it("throws when the retried mutation is still rejected", async () => {
		vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(jsonResponse(200, { token: "a" }))
			.mockResolvedValueOnce(
				jsonResponse(403, {
					error: { code: "CSRF_INVALID", message: "nope" },
				}),
			)
			.mockResolvedValueOnce(jsonResponse(200, { token: "b" }))
			.mockResolvedValueOnce(
				jsonResponse(403, {
					error: { code: "CSRF_INVALID", message: "nope" },
				}),
			);
		await expect(
			api.post("/auth/login", { email: "a@b.com", password: "12345678" }),
		).rejects.toMatchObject({ code: "CSRF_INVALID", status: 403 });
	});

	it("does not retry a business 403", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(jsonResponse(200, { token: "csrf-token" }))
			.mockResolvedValueOnce(
				jsonResponse(403, {
					error: {
						code: "EMAIL_NOT_VERIFIED",
						message: "Email não verificado. Verifique sua caixa de entrada.",
					},
				}),
			);
		await expect(
			api.post("/auth/login", { email: "a@b.com", password: "12345678" }),
		).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED", status: 403 });
		expect(spy).toHaveBeenCalledTimes(2);
	});
});

describe("api.delete", () => {
	it("returns undefined for 204 No Content", async () => {
		csrfThen(204, null);
		const result = await api.delete("/library/1");
		expect(result).toBeUndefined();
	});
});
