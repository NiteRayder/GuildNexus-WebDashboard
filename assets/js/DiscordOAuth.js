const NYXECLIPSE_API='https://guildnexus.brittanyburwell19.workers.dev';
const DISCORD_CLIENT_ID='1528261975438524517';
const DASHBOARD_REDIRECT_URI='https://guildnexus.brittanyburwell19.workers.dev/';
const SESSION_KEY='guildnexus_discord_session';

// Authentication is initiated through the public GuildNexus HTTPS endpoint.
// The Cloudflare Worker proxies /api/* to NyxEclypse, while Discord redirects
// the authorization code back to this dashboard origin.
export function loginWithDiscord(){ window.location.assign(`${NYXECLIPSE_API}/api/auth/discord`); }
export function getStoredSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{localStorage.removeItem(SESSION_KEY);return null}}
export function clearSession(){localStorage.removeItem(SESSION_KEY)}

export async function handleOAuthCallback(){
  const url=new URL(window.location.href), code=url.searchParams.get('code'), error=url.searchParams.get('error');
  if(error)throw new Error(`Discord authorization was not completed (${error}).`);

  // Discord redirects to the dashboard origin with ?code=...&state=....
  // The authorization code is exchanged server-side by NyxEclypse through the
  // same-origin Worker API, so the client never handles the OAuth secret.
  if(code){
    const state=url.searchParams.get('state')||'';
    const response=await fetch(`${NYXECLIPSE_API}/api/auth/discord/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,{
      credentials:'include',
      headers:{Accept:'application/json'}
    });
    let data=null;
    try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data?.error||'Discord authorization could not be completed.');
    if(data?.session){
      localStorage.setItem(SESSION_KEY,JSON.stringify({sessionToken:data.session,authenticated:true,user:data.user||null}));
    }
    url.searchParams.delete('code');url.searchParams.delete('state');history.replaceState(null,document.title,url.pathname+url.search);
  }

  const stored=getStoredSession();
  if(!stored?.sessionToken)return null;
  const response=await fetch(`${NYXECLIPSE_API}/api/auth/session`,{credentials:'include',headers:{Accept:'application/json',Authorization:`Bearer ${stored.sessionToken}`} });
  if(!response.ok){clearSession();return null}
  const data=await response.json(),session={...stored,user:data.user,authenticated:true};localStorage.setItem(SESSION_KEY,JSON.stringify(session));return session;
}
export async function refreshDashboardSession(){return handleOAuthCallback()}
export async function fetchDiscordUser(){return getStoredSession()?.user||null}
export async function fetchManageableGuilds(){const s=getStoredSession();if(!s?.sessionToken)throw new Error('Connect Discord before loading servers.');const r=await fetch(`${NYXECLIPSE_API}/api/dashboard/guilds`,{credentials:'include',headers:{Accept:'application/json',Authorization:`Bearer ${s.sessionToken}`}});if(!r.ok)throw new Error('Unable to retrieve Discord servers.');return(await r.json()).guilds||[]}
export async function logoutFromDiscord(){const s=getStoredSession();await fetch(`${NYXECLIPSE_API}/api/auth/logout`,{method:'POST',credentials:'include',headers:s?.sessionToken?{Authorization:`Bearer ${s.sessionToken}`}:{}}).catch(()=>{});clearSession()}

// Installation is deliberately separate from user authentication.
// Discord's normal bot install flow is callback-less and does not need
// response_type or redirect_uri.
export function getBotInviteUrl(){const p=new URLSearchParams({client_id:DISCORD_CLIENT_ID,permissions:'8',scope:'bot'});return `https://discord.com/oauth2/authorize?${p.toString()}`}
export{NYXECLIPSE_API};
