export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Permanently redirect all traffic from kaizenreply.pages.dev to official domain kaizenreply.us.ci
  if (url.hostname === "kaizenreply.pages.dev") {
    return Response.redirect(`https://kaizenreply.us.ci${url.pathname}${url.search}`, 301);
  }

  return context.next();
}
