// src/disc_oath.js

// Replace with your actual Client ID from the Discord Developer Portal
const CLIENT_ID = '1528261975438524517';

/**
 * Dynamically gets your current page URL (works on GitHub Pages)
 */
function getRedirectUri() {
  const url = new URL(window.location.href);
  return `${url.origin}${url.pathname}`;
}

/**
 * Redirects user to Discord OAuth login
 */
export function loginWithDiscord() {
  const scope = encodeURIComponent('identify email');
  const redirectUri = encodeURIComponent(getRedirectUri());
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;

  window.location.href = authUrl;
}

/**
 * Parses access token from URL fragment after Discord redirects back
 */
export function getAccessTokenFromUrl() {
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');

  if (accessToken) {
    // Clear the token hash from the browser URL bar cleanly
    window.history.replaceState(null, '', window.location.pathname);
    return accessToken;
  }
  return null;
}

/**
 * Fetches Discord user profile
 */
export async function fetchDiscordUser(token) {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Token invalid or expired');
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch Discord user:', err);
    return null;
  }
}
