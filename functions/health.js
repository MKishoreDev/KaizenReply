export async function onRequest(context) {
  const targetUrl = "https://kaizenreply.vercel.app/health";
  const reqHeaders = new Headers(context.request.headers);
  reqHeaders.set("Host", "kaizenreply.vercel.app");

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: reqHeaders
  });

  const resHeaders = new Headers(response.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: resHeaders
  });
}
