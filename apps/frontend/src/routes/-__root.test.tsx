import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "./__root";

const state = vi.hoisted(() => ({
	pathname: "/library",
	me: undefined as unknown,
	isError: false,
	isFetching: true,
	navigate: vi.fn(),
	refetch: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
	createRootRouteWithContext: () => (options: unknown) => ({ options }),
	useNavigate: () => state.navigate,
	useBlocker: vi.fn(),
	useLocation: () => ({ pathname: state.pathname }),
	Outlet: () => <div>Conteúdo da página</div>,
	Link: () => null,
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
	useMe: () => ({
		data: state.me,
		isError: state.isError,
		isFetching: state.isFetching,
		refetch: state.refetch,
	}),
}));
vi.mock("@/features/library/hooks/useLibrary", () => ({
	useLibrary: () => ({ data: [] }),
}));
vi.mock("@/shared/components/Sidebar", () => ({ Sidebar: () => null }));
vi.mock("@/shared/components/BottomNav", () => ({ BottomNav: () => null }));
vi.mock("@/features/search/components/SearchModal", () => ({
	SearchModal: () => null,
}));
vi.mock("@/features/auth/components/ConsentModal", () => ({
	ConsentModal: () => null,
}));
vi.mock("@/features/offline/components/OfflineBanner", () => ({
	OfflineBanner: () => null,
}));

const Layout = Route.options.component;
if (!Layout) throw new Error("Missing root component");
beforeEach(() => {
	vi.clearAllMocks();
	state.pathname = "/library";
	state.me = undefined;
	state.isError = false;
	state.isFetching = true;
});

describe("session gate", () => {
	it("keeps the protected route loading while the service wakes up", () => {
		render(<Layout />);
		expect(screen.getByRole("status")).toHaveTextContent("Conectando");
		expect(state.navigate).not.toHaveBeenCalled();
		expect(screen.queryByText("Conteúdo da página")).not.toBeInTheDocument();
	});
	it("offers recovery after a temporary failure without redirecting", () => {
		state.isError = true;
		state.isFetching = false;
		const view = render(<Layout />);
		fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
		expect(state.refetch).toHaveBeenCalledOnce();
		expect(state.navigate).not.toHaveBeenCalled();
		state.me = {
			id: "user",
			consentedAt: "today",
			onboardingCompletedAt: "today",
		};
		state.isError = false;
		view.rerender(<Layout />);
		expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
	});
	it("does not render the public home before identity is known", () => {
		state.pathname = "/";
		state.isError = true;
		state.isFetching = false;
		render(<Layout />);
		expect(
			screen.getByRole("button", { name: "Tentar novamente" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Conteúdo da página")).not.toBeInTheDocument();
	});
	it("redirects when the server confirms an invalid session", () => {
		state.me = null;
		state.isFetching = false;
		render(<Layout />);
		expect(state.navigate).toHaveBeenCalledWith({ to: "/" });
	});
	it("keeps cached authenticated content after a background failure", () => {
		state.me = {
			id: "user",
			consentedAt: "today",
			onboardingCompletedAt: "today",
		};
		state.isError = true;
		state.isFetching = false;
		render(<Layout />);
		expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
		expect(state.navigate).not.toHaveBeenCalled();
	});
});
