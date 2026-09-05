const NYXECLIPSE_API='https://nyxeclipse.apps.bot-hosting.cloud';
const DISCORD_CLIENT_ID='1528261975438524517';
const DASHBOARD_REDIRECT_URI='https://guildnexus.brittanyburwell19.workers.dev/';
const BOT_INSTALL_REDIRECT_URI='https://guildnexus.brittanyburwell19.workers.dev/pages/invite';
const SESSION_KEY='guildnexus_discord_session';

// Authentication is initiated by NyxEclypse so it can create and validate the
// OAuth state value before Discord redirects back to the bot API.
export function loginWithDiscord(){ window.location.assign(`${NYXECLIPSE_API}/api/auth/discord`); }
export function getStoredSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{localStorage.removeItem(SESSION_KEY);return null}}
export function clearSession(){localStorage.removeItem(SESSION_KEY)}

export async function handleOAuthCallback(){
  const url=new URL(window.location.href), code=url.searchParams.get('code'), error=url.searchParams.get('error');
  if(error)throw new Error(`Discord authorization was not completed (${error}).`);
  // NyxEclypse exchanges the code server-side and returns a short-lived session
  // identifier in the URL fragment. Fragments never reach the server.
  const hash=new URLSearchParams(url.hash.replace(/^#/,'')||'');
  const fragmentSession=hash.get('session');
  if(fragmentSession){
    localStorage.setItem(SESSION_KEY,JSON.stringify({sessionToken:fragmentSession,authenticated:true}));
    url.hash=''; history.replaceState(null,document.title,url.pathname+url.search);
  }else if(code){
    // Compatibility path for a Worker or alternate callback that forwards the
    // Discord code directly to this page. The bot endpoint remains the only
    // component allowed to exchange the secret-backed code.
    const response=await fetch(`${NYXECLIPSE_API}/api/auth/discord/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(url.searchParams.get('state')||'')}`,{credentials:'include',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Discord authorization could not be completed.');
    url.searchParams.delete('code');url.searchParams.delete('state');history.replaceState(null,document.title,url.pathname+url.search);
  }
  const stored=getStoredSession();if(!stored?.sessionToken)return null;
  const response=await fetch(`${NYXECLIPSE_API}/api/auth/session`,{credentials:'include',headers:{Accept:'application/json',Authorization:`Bearer ${stored.sessionToken}`} });
  if(!response.ok){clearSession();return null}
  const data=await response.json(),session={...stored,user:data.user,authenticated:true};localStorage.setItem(SESSION_KEY,JSON.stringify(session));return session;
}
export async function refreshDashboardSession(){return handleOAuthCallback()}
export async function fetchDiscordUser(){return getStoredSession()?.user||null}
export async function fetchManageableGuilds(){const s=getStoredSession();if(!s?.sessionToken)throw new Error('Connect Discord before loading servers.');const r=await fetch(`${NYXECLIPSE_API}/api/dashboard/guilds`,{credentials:'include',headers:{Accept:'application/json',Authorization:`Bearer ${s.sessionToken}`}});if(!r.ok)throw new Error('Unable to retrieve Discord servers.');return(await r.json()).guilds||[]}
export async function logoutFromDiscord(){const s=getStoredSession();await fetch(`${NYXECLIPSE_API}/api/auth/logout`,{method:'POST',credentials:'include',headers:s?.sessionToken?{Authorization:`Bearer ${s.sessionToken}`}:{}}).catch(()=>{});clearSession()}

// Installation is deliberately separate from user authentication.
export function getBotInviteUrl(){const p=new URLSearchParams({client_id:DISCORD_CLIENT_ID,permissions:'8',response_type:'code',redirect_uri:BOT_INSTALL_REDIRECT_URI,integration_type:'0',scope:'applications.commands bot'});return `https://discord.com/oauth2/authorize?${p.toString()}`}
export{NYXECLIPSE_API};
