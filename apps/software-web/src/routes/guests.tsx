import { createFileRoute } from "@tanstack/react-router";
import GuestsPage from "../components/GuestsPage";
import { getWebGuestsPage } from "../features/guests/guests.functions";
import { GUESTS_PAGE_CACHE_HEADERS } from "../features/guests/guests-cache";

export const Route = createFileRoute("/guests")({
	loader: () => getWebGuestsPage({ data: { cursor: null } }),
	headers: () => GUESTS_PAGE_CACHE_HEADERS,
	component: GuestsRoute,
});

function GuestsRoute() {
	const initialPage = Route.useLoaderData();

	return <GuestsPage initialPage={initialPage} />;
}
