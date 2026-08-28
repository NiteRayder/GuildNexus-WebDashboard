const NYXECLIPSE_API = 'https://nyxeclipse.apps.bot-hosting.cloud';
const DISCORD_CLIENT_ID = '1528261975438524517';
const SESSION_KEY = 'guildnexus_session';

export function getBotInviteUrl() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    permissions: '534723959808',
    scope: 'bot applications.commands',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function loginWithDiscord() {
  window.location.href = `${NYXECLIPSE_API}/api/oauth/discord`;
}

export function getSessionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const session = params.get('session');
  if (!session) return getStoredSession();
  localStorage.setItem(SESSION_KEY, session);
  window.history.replaceState({}, document.title, window.location.pathname);
  return session;
}

export function getStoredSession() {
  return localStorage.getItem(SESSION_KEY);
}

export async function fetchDiscordUser(sessionToken = getSessionFromUrl()) {
  if (!sessionToken) return null;
  const response = await fetch(`${NYXECLIPSE_API}/api/oauth/me`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const data = await response.json();
  return data.user ?? null;
}

export async function fetchManageableGuilds(sessionToken = getStoredSession()) {
  if (!sessionToken) return [];
  const response = await fetch(`${NYXECLIPSE_API}/api/oauth/guilds`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem(SESSION_KEY);
    throw new Error('Unable to retrieve Discord servers.');
  }
  const data = await response.json();
  return data.guilds ?? [];
}

export async function logoutFromDiscord(sessionToken = getStoredSession()) {
  try {
    if (sessionToken) {
      await fetch(`${NYXECLIPSE_API}/api/oauth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
    }
  } finally {
    localStorage.removeItem(SESSION_KEY);
  }
}

export { NYXECLIPSE_API };
