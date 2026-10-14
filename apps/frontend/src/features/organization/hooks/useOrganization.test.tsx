import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLibrary } from "@/features/library/service/libraryService";
import type { LibraryEntry } from "@/types/api";
import {
	createGroup,
	deleteGroup,
	fetchOrganization,
	renameGroup,
	updateMembership,
} from "../service/organizationService";
import { useGroupManager, useMembership } from "./useOrganization";

vi.mock("../service/organizationService", () => ({
	createGroup: vi.fn(),
	deleteGroup: vi.fn(),
	fetchOrganization: vi.fn(),
	renameGroup: vi.fn(),
	updateMembership: vi.fn(),
}));
vi.mock("@/features/library/service/libraryService", () => ({
	fetchLibrary: vi.fn(),
}));
const group = {
	id: "collection",
	name: "Curtos",
	createdAt: "",
	updatedAt: "",
};
const game: LibraryEntry = {
	id: "game",
	igdbId: 1,
	name: "Game",
	status: "PLAYING",
	genres: [],
	platforms: [],
	hltbMain: null,
	hltbMainExtra: null,
	hltbCompletionist: null,
	createdAt: "",
	updatedAt: "",
	collectionIds: ["collection"],
	tagIds: ["tag"],
};
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchOrganization).mockResolvedValue({
		collections: [group],
		tags: [{ ...group, id: "tag" }],
	});
	vi.mocked(fetchLibrary).mockResolvedValue([game]);
});
function wrapperSetup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	qc.setQueryData(["library"], [game]);
	qc.setQueryData(["library", 1], game);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return { wrapper, qc };
}
describe("personal organization", () => {
	it("creates, renames and deletes a grouping while preserving library entries", async () => {
		const { wrapper, qc } = wrapperSetup();
		const { result } = renderHook(() => useGroupManager(), { wrapper });
		act(() => result.current.form.setValue("name", " Nova coleção "));
		vi.mocked(createGroup).mockResolvedValue(group);
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(createGroup).toHaveBeenCalledWith("collections", {
			name: "Nova coleção",
		});
		act(() => result.current.edit("collections", group));
		act(() => result.current.form.setValue("name", "Outro nome"));
		vi.mocked(renameGroup).mockResolvedValue(group);
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(renameGroup).toHaveBeenCalledWith("collections", "collection", {
			name: "Outro nome",
		});
		act(() => result.current.setDeleting({ kind: "collections", group }));
		act(() => result.current.confirmDelete());
		await waitFor(() => expect(result.current.deleting).toBeNull());
		expect(deleteGroup).toHaveBeenCalledWith("collections", "collection");
		expect(qc.getQueryData(["library"])).toEqual([game]);
	});
	it("saves both membership arrays and updates entry caches; preserves selection on error", async () => {
		const { wrapper, qc } = wrapperSetup();
		const { result } = renderHook(() => useMembership(game), { wrapper });
		act(() =>
			result.current.form.setValue("collectionIds", [], { shouldDirty: true }),
		);
		vi.mocked(updateMembership)
			.mockRejectedValueOnce(new Error("Agrupamento inválido"))
			.mockResolvedValueOnce({ collectionIds: [], tagIds: ["tag"] });
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isError).toBe(true));
		expect(result.current.form.getValues()).toEqual({
			collectionIds: [],
			tagIds: ["tag"],
		});
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(updateMembership).toHaveBeenLastCalledWith("game", {
			collectionIds: [],
			tagIds: ["tag"],
		});
		expect(qc.getQueryData(["library", 1])).toMatchObject({
			collectionIds: [],
			tagIds: ["tag"],
		});
	});
});
