const NYXECLIPSE_API = 'https://niterayder.github.io/GuildNexus-WebDashboard/pages/invite.html';
const SESSION_KEY = 'guildnexus_discord_session';

export async function loginWithDiscord() {
  window.location.assign(`${NYXECLIPSE_API}/api/auth/discord`);
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

export function getBotInviteUrl() {
  const params = new URLSearchParams({
    client_id: '1528261975438524517',
    permissions: '8',
    scope: 'guilds messages.read guilds.join bot guilds.members.read applications.commands roles_connections.write',
  });
  return `https://discord.com/oauth2/authorize?client_id=1528261975438524517&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fniterayder.github.io%2FGuildNexus-WebDashboard%2Fpages%2Finvite.html&integration_type=0&scope=guilds+messages.read+guilds.join+bot+guilds.members.read+applications.commands+role_connections.write`;
}

export { NYXECLIPSE_API };
