import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { LibraryGrid } from "./LibraryGrid";
import { LibraryList } from "./LibraryList";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
const game = {
	id: "one",
	igdbId: 1,
	name: "Game",
	status: "BACKLOG",
	genres: [],
	platforms: ["PC"],
	createdAt: "2026-10-14T10:00:00Z",
} as unknown as LibraryEntry;
it.each([
	LibraryGrid,
	LibraryList,
])("provides a checkbox outside navigation buttons in %s", (Component) => {
	const toggle = vi.fn();
	render(
		<Component
			games={[game]}
			selection={{ selectedIds: new Set(), toggle, locked: false }}
		/>,
	);
	const checkbox = screen.getByRole("checkbox", { name: "Selecionar Game" });
	expect(checkbox.closest("button")).toBeNull();
	expect(checkbox.closest("a")).toBeNull();
	fireEvent.click(checkbox);
	expect(toggle).toHaveBeenCalledWith("one");
	expect(navigate).not.toHaveBeenCalled();
});
