import { createHash } from "node:crypto";
import type { Plugin } from "vite";

export function offlineWorker(): Plugin {
	return {
		name: "detonado-offline-worker",
		apply: "build",
		generateBundle: {
			order: "post",
			handler(_options, bundle) {
				const files = Object.keys(bundle).filter(
					(file) => !file.endsWith(".map"),
				);
				const hash = createHash("sha256");
				for (const file of files.sort()) {
					const output = bundle[file];
					hash.update(file);
					if (output)
						hash.update(output.type === "chunk" ? output.code : output.source);
				}
				const version = hash.digest("hex").slice(0, 16);
				const assets = [
					...new Set([
						"/index.html",
						"/logo.svg",
						"/favicon.svg",
						...files.map((file) => `/${file}`),
					]),
				];
				this.emitFile({
					type: "asset",
					fileName: "sw.js",
					source: `const CACHE = ${JSON.stringify(`detonado-shell-v1-${version}`)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("detonado-shell-v1-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await (await caches.open(CACHE)).match("/index.html");
      return cached || Response.error();
    }));
    return;
  }
  if (url.pathname.startsWith("/assets/") || ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});`,
				});
			},
		},
	};
}
