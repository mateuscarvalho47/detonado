export function readSteamCallback(href: string) {
	const url = new URL(href);
	if (
		!url.searchParams.has("steamState") &&
		![...url.searchParams.keys()].some((key) => key.startsWith("openid."))
	)
		return null;
	const parameters: Record<string, string> = {};
	for (const [key, value] of url.searchParams) {
		if (key !== "steamState" && !key.startsWith("openid.")) continue;
		if (Object.hasOwn(parameters, key))
			throw new Error(
				"A resposta Steam contém parâmetros repetidos. Conecte novamente.",
			);
		parameters[key] = value;
	}
	return { parameters, callbackUrl: href };
}
export function cleanSteamCallback(href: string) {
	const url = new URL(href);
	for (const key of [...url.searchParams.keys()])
		if (key === "steamState" || key.startsWith("openid."))
			url.searchParams.delete(key);
	return `${url.pathname}${url.search}${url.hash}`;
}
export function officialSteamUrl(value: string) {
	const url = new URL(value);
	if (
		url.origin !== "https://steamcommunity.com" ||
		url.pathname !== "/openid/login" ||
		url.username ||
		url.password
	)
		throw new Error("Não foi possível abrir a conexão Steam. Tente novamente.");
	return url.href;
}
