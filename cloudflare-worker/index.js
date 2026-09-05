const NYXECLIPSE_ORIGIN = 'http://nyxeclipse.apps.bot-hosting.cloud';
const DASHBOARD_ORIGIN = 'https://guildnexus.brittanyburwell19.workers.dev';

function buildOriginRequest(request) {
  const incoming = new URL(request.url);
  const target = new URL(`${NYXECLIPSE_ORIGIN}${incoming.pathname}${incoming.search}`);
  const headers = new Headers(request.headers);
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

function isPageRequest(url) {
  return !url.pathname.startsWith('/api/') && !url.pathname.includes('.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
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
        // Do not follow upstream redirects. OAuth depends on the browser
        // receiving Discord's Location header and later receiving the callback
        // redirect back to GuildNexus.
        const upstream = await fetch(buildOriginRequest(request));
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
    }

    // Keep the existing static dashboard on the same workers.dev origin.
    // Extensionless paths are treated as dashboard pages and fall back to
    // index.html when no exact asset exists.
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404 || !isPageRequest(url)) {
        return assetResponse;
      }

      const indexUrl = new URL('/index.html', request.url);
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return new Response('GuildNexus Worker is missing its ASSETS binding.', { status: 500 });
  },
};
