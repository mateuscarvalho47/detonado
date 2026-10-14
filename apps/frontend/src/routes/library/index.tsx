import { createFileRoute } from "@tanstack/react-router";
import { LibraryScreen } from "@/features/library/components/LibraryScreen";
import { validateLibrarySearch } from "@/features/library/schema/librarySearch";

export const Route = createFileRoute("/library/")({
	validateSearch: validateLibrarySearch,
	component: LibraryScreen,
});
