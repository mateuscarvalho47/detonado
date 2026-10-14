import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { OfflineBanner } from "./OfflineBanner";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
		...props
	}: {
		children: React.ReactNode;
		params: { igdbId: string };
	}) => (
		<a href={`/library/${params.igdbId}`} {...props}>
			{children}
		</a>
	),
}));
vi.mock("../hooks/useOfflineSync", () => ({
	useOfflineSync: () => ({
		online: false,
		cached: true,
		busy: false,
		error: "",
		synchronize: vi.fn(),
		discard: vi.fn(),
		retry: vi.fn(),
		move: vi.fn(),
		gameForRow: () => ({ igdbId: 123, name: "Zelda" }),
		rows: [
			{
				ownerId: "alice",
				path: "/library/entry/sessions",
				createdAt: "",
				payload: {
					clientId: "one",
					playedAt: "2026-10-14T12:00:00Z",
					durationMinutes: 30,
				},
			},
		],
	}),
}));
it("identifies a pending game's record so the user can inspect its history before resolving conflicts", () => {
	render(<OfflineBanner authenticated />);
	fireEvent.click(screen.getByText("Ver registros pendentes"));
	expect(
		screen.getByRole("link", { name: "Abrir registro de Zelda" }),
	).toHaveAttribute("href", "/library/123");
});
