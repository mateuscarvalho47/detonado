import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import {
	fetchMe,
	login,
	logout,
	register,
	resendVerification,
	verifyEmail,
} from "./authService";

vi.mock("@/lib/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/api")>();
	return {
		...actual,
		clearCsrfToken: vi.fn(),
		api: {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		},
	};
});

import { api, clearCsrfToken } from "@/lib/api";

afterEach(() => vi.clearAllMocks());

const USER = { id: 1, email: "a@b.com" };

describe("fetchMe", () => {
	it("returns user on success", async () => {
		vi.mocked(api.get).mockResolvedValue(USER);
		const result = await fetchMe();
		expect(result).toEqual(USER);
		expect(api.get).toHaveBeenCalledWith("/auth/me");
	});

	it("returns null on 401 ApiError", async () => {
		vi.mocked(api.get).mockRejectedValue(
			new ApiError("UNAUTHORIZED", "Unauthorized", undefined, 401),
		);
		const result = await fetchMe();
		expect(result).toBeNull();
	});

	it("rethrows non-401 ApiError", async () => {
		vi.mocked(api.get).mockRejectedValue(
			new ApiError("SERVER_ERROR", "Internal error", undefined, 500),
		);
		await expect(fetchMe()).rejects.toBeInstanceOf(ApiError);
	});
});

describe("login", () => {
	it("calls api.post with credentials and returns user", async () => {
		vi.mocked(api.post).mockResolvedValue(USER);
		const data = { email: "a@b.com", password: "pass123" };
		const result = await login(data);
		expect(result).toEqual(USER);
		expect(api.post).toHaveBeenCalledWith("/auth/login", data);
		expect(clearCsrfToken).toHaveBeenCalledOnce();
	});
});

describe("register", () => {
	it("calls api.post with credentials and returns message", async () => {
		vi.mocked(api.post).mockResolvedValue({ message: "Check your email" });
		const data = { email: "a@b.com", password: "pass123" };
		const result = await register(data);
		expect(result).toEqual({ message: "Check your email" });
		expect(api.post).toHaveBeenCalledWith("/auth/register", data);
	});
});

describe("verifyEmail", () => {
	it("calls api.get with token in query string", async () => {
		vi.mocked(api.get).mockResolvedValue({ message: "Email verified" });
		await verifyEmail("my-token");
		expect(api.get).toHaveBeenCalledWith("/auth/verify-email?token=my-token");
	});
});

describe("resendVerification", () => {
	it("calls api.post with email", async () => {
		vi.mocked(api.post).mockResolvedValue({ message: "Sent" });
		await resendVerification("a@b.com");
		expect(api.post).toHaveBeenCalledWith("/auth/resend-verification", {
			email: "a@b.com",
		});
	});
});

describe("logout", () => {
	it("calls api.post to /auth/logout", async () => {
		vi.mocked(api.post).mockResolvedValue(undefined);
		await logout();
		expect(api.post).toHaveBeenCalledWith("/auth/logout");
		expect(clearCsrfToken).toHaveBeenCalledOnce();
	});
});
