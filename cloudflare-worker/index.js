const NYXECLIPSE_ORIGIN = 'http://nyxeclipse.apps.bot-hosting.cloud';
const DASHBOARD_ORIGIN = 'https://guildnexus.brittanyburwell19.workers.dev';

function buildOriginRequest(request) {
  const incoming = new URL(request.url);
  const target = new URL(`${NYXECLIPSE_ORIGIN}${incoming.pathname}${incoming.search}`);

  const headers = new Headers(request.headers);
  // The bot API should see the public dashboard origin rather than an internal
  // Worker hostname. Keep the original Host header out of the upstream request.
  headers.delete('host');
  headers.set('X-Forwarded-Host', incoming.host);
  headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''));

  return new Request(target.toString(), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
}

function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', DASHBOARD_ORIGIN);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only proxy the NyxEclypse API. All non-API traffic continues through the
    // existing dashboard/static Worker behavior.
    if (!url.pathname.startsWith('/api/')) {
      return fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': DASHBOARD_ORIGIN,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        },
      });
    }

    try {
      const upstream = await fetch(buildOriginRequest(request));

      // redirect: manual is important for OAuth. The bot's /api/auth/discord
      // endpoint redirects to Discord, and the callback redirects back to the
      // dashboard. Following either redirect inside the Worker would break the
      // browser's OAuth flow.
      return addCorsHeaders(upstream);
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'NyxEclypse API upstream unavailable',
        detail: error instanceof Error ? error.message : String(error),
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': DASHBOARD_ORIGIN,
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
  },
};
