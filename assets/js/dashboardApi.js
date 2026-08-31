import { getStoredSession } from './DiscordOAuth.js';

export const NYXECLIPSE_API = 'https://discord.com/oauth2/authorize?client_id=1528261975438524517&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fniterayder.github.io%2FGuildNexus-WebDashboard%2Fpages%2Finvite.html&integration_type=0&scope=guilds+messages.read+guilds.join+bot+guilds.members.read+applications.commands+role_connections.write';

async function request(path, options = {}) {
  const session = getStoredSession();
  if (!session?.authenticated) throw new Error('Connect Discord before using GuildNexus.');

  const response = await fetch(`${NYXECLIPSE_API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      ...(session?.sessionToken ? { Authorization: `Bearer ${session.sessionToken}` } : {}),
    },
    credentials: 'include',
    },
  });

  let data = null;
  try { data = await response.json(); } catch {}

  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem('guildnexus_discord_session');
    throw new Error(data?.error || `GuildNexus API request failed (${response.status}).`);
  }
  return data;
}

export const dashboardApi = {
  me: () => request('/api/dashboard/me'),
  guilds: () => request('/api/dashboard/guilds'),
  guild: (guildId) => request(`/api/dashboard/guilds/${encodeURIComponent(guildId)}`),
  resources: (guildId) => request(`/api/dashboard/guilds/${encodeURIComponent(guildId)}/resources`),
  member: (guildId, userId) => request(`/api/dashboard/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(userId)}`),
  auditLog: (guildId, params = {}) => request(`/api/dashboard/guilds/${encodeURIComponent(guildId)}/audit-log?${new URLSearchParams(params)}`),
  updateLogging: (guildId, patch) => request(`/api/dashboard/guilds/${encodeURIComponent(guildId)}/logging`, { method:'PATCH', body:JSON.stringify(patch) }),
  cases: (guildId, params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/api/dashboard/guilds/${encodeURIComponent(guildId)}/cases?${query}`);
  },
  updateConfig: (guildId, patch) => request(`/api/dashboard/guilds/${encodeURIComponent(guildId)}/config`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }),
};

export function getSelectedGuildId() {
  return localStorage.getItem('guildnexus_selected_guild');
}

export function setSelectedGuildId(guildId) {
  if (guildId) localStorage.setItem('guildnexus_selected_guild', guildId);
  else localStorage.removeItem('guildnexus_selected_guild');
}
