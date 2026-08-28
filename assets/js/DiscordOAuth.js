const NYXECLIPSE_API = 'https://nyxeclipse.apps.bot-hosting.cloud';
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
  const response = await fetch(`${NYXECLIPSE_API}/api/auth/session`, { credentials:'include', headers:{Accept:'application/json'} });
  if (!response.ok) { clearSession(); return null; }
  const data = await response.json();
  const session = { user:data.user, authenticated:true };
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
  const response = await fetch(`${NYXECLIPSE_API}/api/dashboard/guilds`, { credentials:'include', headers:{Accept:'application/json'} });
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
    scope: 'bot applications.commands',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export { NYXECLIPSE_API };
