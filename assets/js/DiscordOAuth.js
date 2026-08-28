const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_CLIENT_ID = '1528261975438524517';
const REDIRECT_URI = 'https://niterayder.github.io/GuildNexus-WebDashboard/pages/invite.html';
const SESSION_KEY = 'guildnexus_discord_session';
const PKCE_VERIFIER_KEY = 'guildnexus_pkce_verifier';
const STATE_KEY = 'guildnexus_oauth_state';

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Base64Url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function loginWithDiscord() {
  const verifier = randomString(64);
  const state = randomString(32);
  const challenge = await sha256Base64Url(verifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'identify guilds guilds.members.read bot applications.commands webhook.incoming',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.assign(`https://discord.com/oauth2/authorize?${params.toString()}`);
}

export function getBotInviteUrl() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    permissions: '8',
    scope: 'bot applications.commands',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function exchangeCode(code) {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) throw new Error('OAuth session expired. Please connect Discord again.');

  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) throw new Error('Discord OAuth token exchange failed.');
  return response.json();
}

export async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const error = params.get('error');

  if (error) throw new Error(params.get('error_description') || `Discord OAuth failed: ${error}`);
  if (!code) return getStoredSession();

  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (!expectedState || returnedState !== expectedState) {
    throw new Error('OAuth state validation failed.');
  }

  const token = await exchangeCode(code);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);

  const user = await fetchDiscordUser(token.access_token);
  const session = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + ((token.expires_in || 604800) * 1000),
    user,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.history.replaceState({}, document.title, window.location.pathname);
  return session;
}

export async function fetchDiscordUser(accessToken = getStoredSession()?.accessToken) {
  if (!accessToken) return null;
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  return response.json();
}

export async function fetchManageableGuilds(accessToken = getStoredSession()?.accessToken) {
  if (!accessToken) return [];

  const response = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error('Unable to retrieve Discord servers.');

  const guilds = await response.json();
  return guilds.filter((guild) => {
    const permissions = BigInt(guild.permissions || '0');
    return guild.owner === true || (permissions & 0x20n) === 0x20n;
  });
}

export function logoutFromDiscord() {
  clearSession();
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
}

export { DISCORD_API, DISCORD_CLIENT_ID, REDIRECT_URI };
