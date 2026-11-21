export async function onRequest() {
  try {
    const response = await fetch("https://kaizenreply.vercel.app/health", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ status: "unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}
