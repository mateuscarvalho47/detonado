export class ApiError extends Error {
	readonly code: string;
	readonly details: unknown;
	readonly status: number | undefined;

	constructor(
		code: string,
		message: string,
		details?: unknown,
		status?: number,
	) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.details = details;
		this.status = status;
	}
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfToken: string | null = null;
let csrfInflight: Promise<string> | null = null;
let csrfGeneration = 0;

export function clearCsrfToken() {
	csrfToken = null;
	csrfInflight = null;
	csrfGeneration += 1;
}

async function readCsrfToken(): Promise<string> {
	if (csrfToken) return csrfToken;
	if (csrfInflight) return csrfInflight;

	const generation = csrfGeneration;
	csrfInflight = request<{ token: string }>("/auth/csrf")
		.then((body) => {
			if (typeof body.token !== "string" || body.token.length === 0) {
				throw new ApiError(
					"UNKNOWN_ERROR",
					"Não foi possível iniciar a sessão.",
					undefined,
					500,
				);
			}
			if (generation === csrfGeneration) csrfToken = body.token;
			return body.token;
		})
		.finally(() => {
			if (generation === csrfGeneration) csrfInflight = null;
		});

	return csrfInflight;
}

async function request<T>(
	path: string,
	init: RequestInit = {},
	attempt = 0,
): Promise<T> {
	const method = (init.method ?? "GET").toUpperCase();
	const needsCsrf = MUTATING.has(method);
	const hasBody = init.body !== undefined && init.body !== null;
	const headers = new Headers(init.headers);
	if (hasBody && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	if (needsCsrf) {
		headers.set("x-csrf-token", await readCsrfToken());
	}

	const base = import.meta.env.VITE_API_URL ?? "";
	const res = await fetch(`${base}/api${path}`, {
		...init,
		credentials: "include",
		headers,
	});

	if (needsCsrf && res.status === 403 && attempt === 0) {
		const body = await res.json().catch(() => ({}));
		if (body?.error?.code === "CSRF_INVALID") {
			clearCsrfToken();
			return request<T>(path, init, attempt + 1);
		}
		const err = body?.error;
		throw new ApiError(
			err?.code ?? "UNKNOWN_ERROR",
			err?.message ?? "An unexpected error occurred",
			err?.details,
			res.status,
		);
	}

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		const err = body?.error;
		throw new ApiError(
			err?.code ?? "UNKNOWN_ERROR",
			err?.message ?? "An unexpected error occurred",
			err?.details,
			res.status,
		);
	}

	if (res.status === 204) return undefined as T;

	return res.json() as Promise<T>;
}

export const api = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, body?: unknown) =>
		request<T>(path, { method: "POST", body: JSON.stringify(body) }),
	patch: <T>(path: string, body?: unknown) =>
		request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
	delete: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "DELETE",
			body: body !== undefined ? JSON.stringify(body) : undefined,
		}),
};
