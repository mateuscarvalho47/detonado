import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "@/features/auth/hooks/useAuth";
import { AgoraScreen } from "@/features/dashboard/components/AgoraScreen";
import { LandingScreen } from "@/features/landing/components/LandingScreen";

export const Route = createFileRoute("/")({
	component: IndexPage,
});

function IndexPage() {
	const { data: me, isLoading } = useMe();
	if (isLoading) return null;
	return me ? <AgoraScreen /> : <LandingScreen />;
}
