import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingScreen } from "./LandingScreen";

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

describe("LandingScreen", () => {
	it("explains the core job and shows real product context", () => {
		render(<LandingScreen />);
		expect(
			screen.getByRole("heading", {
				name: /Lembre onde parou\.Escolha o próximo\./,
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Montar minha biblioteca/ }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Conta gratuita · leva menos de um minuto/),
		).toBeInTheDocument();
		expect(screen.getByText("Jogando agora")).toBeInTheDocument();
		expect(screen.getByText("Parei no Banco.")).toBeInTheDocument();
		expect(screen.getByText("Dê uma ordem à fila")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Privacidade" })).toHaveAttribute(
			"href",
			"/privacy",
		);
		expect(screen.getByRole("link", { name: "Termos" })).toHaveAttribute(
			"href",
			"/terms",
		);
		expect(screen.getByRole("link", { name: "Contato" })).toHaveAttribute(
			"href",
			"mailto:sac@carvalholabs.com.br",
		);
	});
});
