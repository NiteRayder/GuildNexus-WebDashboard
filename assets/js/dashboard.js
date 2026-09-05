import { getStoredSession, loginWithDiscord, handleOAuthCallback } from './DiscordOAuth.js';

document.addEventListener('DOMContentLoaded', async () => {
  let session = getStoredSession();
  try {
    const callbackSession = await handleOAuthCallback();
    if (callbackSession) session = callbackSession;
  } catch (error) {
    const panel=document.createElement('section'); panel.className='fade-in';
    panel.innerHTML=`<div class="card"><h3>Discord connection failed</h3><p>${escapeHtml(error.message||'Unable to complete Discord authentication.')}</p></div>`;
    document.querySelector('main')?.appendChild(panel); return;
  }
  if(session?.sessionToken){
    // Keep the public home page public, but send an authenticated user straight
    // to the real control center. The previous page was effectively a brochure.
    if(!location.pathname.endsWith('/dashboard/') && !location.pathname.endsWith('/dashboard')) location.assign('/dashboard/');
    return;
  }
  const button=document.getElementById('dashboard-connect'); button?.addEventListener('click',loginWithDiscord);
});
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
