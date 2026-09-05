const DEFAULT_NYXECLIPSE_ORIGIN = 'http://fi15.bot-hosting.net:26116';
const DEFAULT_DASHBOARD_ORIGIN = 'https://guildnexus.brittanyburwell19.workers.dev';

const PAGE_ROUTES = {
  '/dashboard/': '/dashboard/index.html',
  '/about/': '/pages/about.html',
  '/invite/': '/pages/invite.html',
  '/servers/': '/pages/servers.html',
  '/integrations/': '/pages/integrations.html',
  '/moderation/': '/pages/moderation.html',
  '/automation/': '/pages/automation.html',
  '/ai/': '/pages/AIassistant.html',
  '/terms/': '/pages/Terms%20of%20service.html',
  '/contact/': '/pages/contact.html',
  '/settings/': '/pages/settings.html',
  '/support/': '/pages/support-server.html',
  '/analytics/': '/pages/analytics.html',
  '/audit-log/': '/pages/audit-log.html',
};

const NAV_ROUTES = {
  '/index.html': '/',
  '../index.html': '/',
  'about.html': '/about/',
  '../about.html': '/about/',
  'invite.html': '/invite/',
  '../invite.html': '/invite/',
  'servers.html': '/servers/',
  '../servers.html': '/servers/',
  'integrations.html': '/integrations/',
  '../integrations.html': '/integrations/',
  'moderation.html': '/moderation/',
  '../moderation.html': '/moderation/',
  'automation.html': '/automation/',
  '../automation.html': '/automation/',
  'AIassistant.html': '/ai/',
  '../AIassistant.html': '/ai/',
  'Terms%20of%20service.html': '/terms/',
  '../Terms%20of%20service.html': '/terms/',
  'Terms of service.html': '/terms/',
  '../Terms of service.html': '/terms/',
  'contact.html': '/contact/',
  '../contact.html': '/contact/',
  'settings.html': '/settings/',
  '../settings.html': '/settings/',
  'support-server.html': '/support/',
  '../support-server.html': '/support/',
};

function buildOriginRequest(request, origin) {
  const incoming = new URL(request.url);
  const target = new URL(`${origin}${incoming.pathname}${incoming.search}`);
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

function addCorsHeaders(response, dashboardOrigin) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', dashboardOrigin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function rewriteNavigation(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  return new HTMLRewriter()
    .on('nav a[href]', {
      element(element) {
        const href = element.getAttribute('href');
        const replacement = href ? NAV_ROUTES[href] : null;
        if (replacement) {
          element.setAttribute('href', replacement);
        }
      },
    })
    .transform(response);
}

function isPageRequest(url) {
  return !url.pathname.startsWith('/api/') && !url.pathname.includes('.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const upstreamOrigin = env.NYXECLIPSE_ORIGIN || DEFAULT_NYXECLIPSE_ORIGIN;
    const dashboardOrigin = env.DASHBOARD_ORIGIN || DEFAULT_DASHBOARD_ORIGIN;

    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': dashboardOrigin,
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
        const upstream = await fetch(buildOriginRequest(request, upstreamOrigin));
        return addCorsHeaders(upstream, dashboardOrigin);
      } catch (error) {
        return new Response(JSON.stringify({
          error: 'NyxEclypse API upstream unavailable',
          detail: error instanceof Error ? error.message : String(error),
        }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': dashboardOrigin,
            'Access-Control-Allow-Credentials': 'true',
          },
        });
      }
    }

    if (env.ASSETS) {
      // Serve the requested clean route from its real HTML file.
      const mappedPath = PAGE_ROUTES[url.pathname];
      if (mappedPath) {
        const assetUrl = new URL(mappedPath, request.url);
        const response = await env.ASSETS.fetch(new Request(assetUrl, request));
        return rewriteNavigation(response);
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404 || !isPageRequest(url)) {
        return rewriteNavigation(assetResponse);
      }

      const indexUrl = new URL('/index.html', request.url);
      return rewriteNavigation(await env.ASSETS.fetch(new Request(indexUrl, request)));
    }

    return new Response('GuildNexus Worker is missing its ASSETS binding.', { status: 500 });
  },
};
