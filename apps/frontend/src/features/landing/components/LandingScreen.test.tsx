import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingScreen } from "./LandingScreen";

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

describe("LandingScreen", () => {
	it("presents a library, not a feature grid", () => {
		render(<LandingScreen />);
		expect(
			screen.getByRole("heading", { name: "Sua biblioteca de jogos." }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Criar conta" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Criar conta grátis")).not.toBeInTheDocument();
		expect(screen.queryByText("📚")).not.toBeInTheDocument();
		expect(screen.getAllByText(/HowLongToBeat/).length).toBeGreaterThan(0);
		expect(screen.getByText(/quero jogar/)).toBeInTheDocument();
	});
});
