const NYXECLIPSE_API = 'https://nyxeclipse.apps.bot-hosting.cloud';
const DISCORD_CLIENT_ID = '1528261975438524517';
const DASHBOARD_REDIRECT_URI = 'https://niterayder.github.io/GuildNexus-WebDashboard/pages/invite.html';
const SESSION_KEY = 'guildnexus_discord_session';

// User authorization for the dashboard. This MUST NOT include the `bot` scope
// or bot permissions, otherwise Discord treats the flow as a bot installation.
export async function loginWithDiscord() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: DASHBOARD_REDIRECT_URI,
    scope: 'identify guilds',
  });

  window.location.assign(`https://discord.com/oauth2/authorize?${params.toString()}`);
}

export function getStoredSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { localStorage.removeItem(SESSION_KEY); return null; }
}

export function clearSession() { localStorage.removeItem(SESSION_KEY); }

export async function handleOAuthCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    throw new Error(`Discord authorization was not completed (${error}).`);
  }

  // Discord returns an authorization code in the query string. Exchange it
  // through NyxEclipse so the Discord client secret never reaches the browser.
  if (code) {
    const response = await fetch(`${NYXECLIPSE_API}/api/auth/discord/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include',
    });

    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok || !data?.sessionToken) {
      throw new Error(data?.error || 'Discord authorization could not be completed.');
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      sessionToken: data.sessionToken,
      user: data.user,
      authenticated: true,
    }));

    // Remove the one-time OAuth code from the visible URL.
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    history.replaceState(null, document.title, url.pathname + url.search);
  }

  const stored = getStoredSession();
  if (!stored?.sessionToken) return null;

  const response = await fetch(`${NYXECLIPSE_API}/api/auth/session`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${stored.sessionToken}`,
    },
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const data = await response.json();
  const session = { ...stored, user: data.user, authenticated: true };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function refreshDashboardSession() {
  return handleOAuthCallback();
}

export async function fetchDiscordUser() {
  return getStoredSession()?.user || null;
}

export async function fetchManageableGuilds() {
  const session = getStoredSession();
  if (!session?.sessionToken) throw new Error('Connect Discord before loading servers.');

  const response = await fetch(`${NYXECLIPSE_API}/api/dashboard/guilds`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
  });

  if (!response.ok) throw new Error('Unable to retrieve Discord servers.');
  return (await response.json()).guilds || [];
}

export async function logoutFromDiscord() {
  const session = getStoredSession();
  await fetch(`${NYXECLIPSE_API}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: session?.sessionToken ? { Authorization: `Bearer ${session.sessionToken}` } : {},
  }).catch(() => {});
  clearSession();
}

// Bot installation only. This MUST NOT use the dashboard's user OAuth scopes,
// response_type, or redirect URI.
export function getBotInviteUrl() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    permissions: '8',
    scope: 'bot applications.commands',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export { NYXECLIPSE_API };
