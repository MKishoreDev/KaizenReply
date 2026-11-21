// Proxies /api/* from Cloudflare Pages to the FastAPI backend on Vercel.
const UPSTREAM = "https://kaizenreply.vercel.app";
const ALLOWED_METHODS = new Set(["GET", "POST", "OPTIONS", "HEAD"]);
// Only forward what the API actually needs; never cookies or auth from the browser.
const FORWARD_HEADERS = ["content-type", "accept", "accept-language", "user-agent"];

export async function onRequest(context) {
  const { request, env } = context;

  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, OPTIONS, HEAD" } });
  }

  const url = new URL(request.url);
  const targetUrl = UPSTREAM + url.pathname + url.search;

  const reqHeaders = new Headers();
  for (const name of FORWARD_HEADERS) {
    const v = request.headers.get(name);
    if (v) reqHeaders.set(name, v);
  }

  // Real client IP (set by Cloudflare, not spoofable) so the backend rate-limits per user,
  // authenticated with a shared secret so clients can't forge it by calling Vercel directly.
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) reqHeaders.set("X-Real-IP", clientIp);
  if (env && env.PROXY_SHARED_SECRET) reqHeaders.set("X-Proxy-Secret", env.PROXY_SHARED_SECRET);

  if (env && env.GROQ_API_KEY) {
    reqHeaders.set("X-Groq-Api-Key", env.GROQ_API_KEY);
  }

  const init = { method: request.method, headers: reqHeaders, redirect: "follow" };
  if (request.method === "POST") {
    init.body = request.body;
  }

  let response;
  try {
    response = await fetch(targetUrl, init);
  } catch (err) {
    return new Response(JSON.stringify({ detail: "The Kaizen service is temporarily unreachable." }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const resHeaders = new Headers(response.headers);
  // Same-origin page calls this, so no wildcard CORS is needed
  resHeaders.delete("Access-Control-Allow-Origin");
  resHeaders.delete("Set-Cookie");
  resHeaders.set("X-Content-Type-Options", "nosniff");
  resHeaders.set("Cache-Control", "no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: resHeaders,
  });
}
