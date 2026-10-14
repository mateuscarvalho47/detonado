import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { createSessionId } from "./sessionId";

afterEach(() => vi.unstubAllGlobals());

it("creates valid distinct session identifiers without randomUUID", () => {
	const source = globalThis.crypto;
	vi.stubGlobal("crypto", {
		getRandomValues: source.getRandomValues.bind(source),
	});
	const first = createSessionId();
	expect(z.uuid().safeParse(first).success).toBe(true);
	expect(createSessionId()).not.toBe(first);
});
