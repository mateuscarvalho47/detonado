import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSavedFilter,
	deleteSavedFilter,
	fetchSavedFilters,
	updateSavedFilter,
} from "../service/filterService";
import { useSavedFilters } from "./useSavedFilters";

vi.mock("../service/filterService", () => ({
	createSavedFilter: vi.fn(),
	updateSavedFilter: vi.fn(),
	deleteSavedFilter: vi.fn(),
	fetchSavedFilters: vi.fn(),
}));
const saved = {
	id: "one",
	name: "Curtos",
	filters: {
		statuses: ["BACKLOG" as const],
		platform: "PC",
		maxHours: 10,
		search: "zelda",
	},
	createdAt: "",
	updatedAt: "",
};
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchSavedFilters).mockResolvedValue({ filters: [saved] });
});
function setup() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const restore = vi.fn();
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return {
		...renderHook(
			() => useSavedFilters({ platform: "PS5", maxHours: 20 }, restore),
			{ wrapper },
		),
		restore,
	};
}
describe("saved filters", () => {
	it("restores all fields, renames and replaces criteria, then deletes without clearing current results", async () => {
		const { result, restore } = setup();
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
		act(() => result.current.select("one"));
		expect(restore).toHaveBeenCalledWith(saved.filters);
		act(() => result.current.form.setValue("name", "Renomeada"));
		vi.mocked(updateSavedFilter).mockResolvedValue(saved);
		await act(async () => {
			await result.current.update();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(updateSavedFilter).toHaveBeenCalledWith({
			id: "one",
			name: "Renomeada",
			filters: { platform: "PS5", maxHours: 20 },
		});
		act(() => result.current.remove());
		await waitFor(() => expect(result.current.selectedId).toBe(""));
		expect(deleteSavedFilter).toHaveBeenCalledWith("one");
		expect(restore).toHaveBeenCalledTimes(1);
	});
	it("validates a name and reports failure without losing criteria", async () => {
		const { result } = setup();
		await act(async () => {
			await result.current.save();
		});
		expect(createSavedFilter).not.toHaveBeenCalled();
		act(() => result.current.form.setValue("name", "Nova busca"));
		vi.mocked(createSavedFilter).mockRejectedValue(new Error("Falha"));
		await act(async () => {
			await result.current.save();
		});
		await waitFor(() =>
			expect(result.current.mutation.error?.message).toBe("Falha"),
		);
		expect(result.current.form.getValues()).toEqual({
			name: "Nova busca",
			filters: { platform: "PS5", maxHours: 20 },
		});
	});
});
