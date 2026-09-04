const NYXECLIPSE_API = 'https://api.example.com/guildnexus';
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
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const sessionToken = hash.get('session');
  if (sessionToken) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionToken, authenticated:true }));
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
  const stored = getStoredSession();
  const headers = { Accept:'application/json' };
  if (stored?.sessionToken) headers.Authorization = `Bearer ${stored.sessionToken}`;
  const response = await fetch(`${NYXECLIPSE_API}/api/auth/session`, { credentials:'include', headers });
  if (!response.ok) { clearSession(); return null; }
  const data = await response.json();
  const session = { ...stored, user:data.user, authenticated:true };
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
  const headers = { Accept:'application/json' };
  if (session?.sessionToken) headers.Authorization = `Bearer ${session.sessionToken}`;
  const response = await fetch(`${NYXECLIPSE_API}/api/dashboard/guilds`, { credentials:'include', headers });
  if (!response.ok) throw new Error('Unable to retrieve Discord servers.');
  return (await response.json()).guilds || [];
}

export async function logoutFromDiscord() {
  await fetch(`${NYXECLIPSE_API}/api/auth/logout`, { method:'POST', credentials:'include' }).catch(()=>{});
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
