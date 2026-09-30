import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { LibraryCard } from "./LibraryCard";

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

const game: LibraryEntry = {
	id: "1",
	igdbId: 10,
	name: "Titanfall 2",
	coverUrl: "https://example.com/titanfall.jpg",
	genres: ["Shooter"],
	platforms: ["PC"],
	status: "PLAYING",
	hltbMain: 6,
	hltbMainExtra: 8,
	hltbCompletionist: 14,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("LibraryCard", () => {
	it("puts the status on a dark plate over the cover", () => {
		render(<LibraryCard game={game} />);
		const plate = screen.getByText("Jogando").closest(".bg-bg-0");
		expect(plate).not.toBeNull();
		expect(plate).toHaveClass("border-border-strong");
	});
});
