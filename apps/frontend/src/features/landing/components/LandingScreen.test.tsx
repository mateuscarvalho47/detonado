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
		expect(
			screen.getByText(
				"Não é um guia. A estante não aparece para mais ninguém.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Exemplo")).toBeInTheDocument();
		expect(screen.getByText("Próximos na fila")).toBeInTheDocument();
		expect(screen.getByText("Jogando agora")).toBeInTheDocument();
		expect(screen.getByText("PC · sem estimativa")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Política de Privacidade" }),
		).toHaveAttribute("href", "/privacy");
		expect(screen.getByRole("link", { name: "Termos" })).toHaveAttribute(
			"href",
			"/terms",
		);
		expect(
			screen.getByRole("link", { name: "sac@carvalholabs.com.br" }),
		).toHaveAttribute("href", "mailto:sac@carvalholabs.com.br");
	});
});
