export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = "https://kaizenreply.vercel.app" + url.pathname + url.search;

  const reqHeaders = new Headers(context.request.headers);
  reqHeaders.set("Host", "kaizenreply.vercel.app");

  if (context.env && context.env.GROQ_API_KEY) {
    reqHeaders.set("X-Groq-Api-Key", context.env.GROQ_API_KEY);
  }

  const init = {
    method: context.request.method,
    headers: reqHeaders,
    redirect: "follow"
  };

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = context.request.body;
  }

  const response = await fetch(targetUrl, init);

  const resHeaders = new Headers(response.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: resHeaders
  });
}
