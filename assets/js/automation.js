import { dashboardApi, getSelectedGuildId } from './dashboardApi.js';
const guildId = getSelectedGuildId();
document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('main');
  if (!main || !guildId) { if (main) main.insertAdjacentHTML('beforeend','<section><div class="card"><h3>Select a server first</h3><a class="button btn-small" href="servers.html">Choose Server</a></div></section>'); return; }
  try {
    const [{ guild }, resources] = await Promise.all([dashboardApi.guild(guildId), dashboardApi.resources(guildId)]);
    const channels = resources.channels.filter(c => [0,5].includes(c.type));
    const roles = resources.roles.filter(r => !r.managed && r.id !== guild.id);
    const cfg = guild.config || {};
    const section = document.createElement('section'); section.className='fade-in';
    section.innerHTML = '<h2>'+escapeHtml(guild.name)+' Automation</h2>' +
      '<form id="automation-form" class="card">' +
      '<h3>Auto-Roles</h3><p>Automatically assign a role when a member joins.</p>' +
      '<select id="autoRole" style="width:100%;"><option value="">Disabled</option>'+roles.map(r=>'<option value="'+r.id+'" '+(r.id===cfg.autoRole?'selected':'')+'>'+escapeHtml(r.name)+'</option>').join('')+'</select>' +
      '<br><br><h3>Welcome Messages</h3><p>Choose where NyxEclipse sends join messages.</p>' +
      '<select id="welcomeChannel" style="width:100%;"><option value="">Disabled</option>'+channels.map(c=>'<option value="'+c.id+'" '+(c.id===cfg.welcomeChannel?'selected':'')+'>#'+escapeHtml(c.name)+'</option>').join('')+'</select>' +
      '<br><br><textarea id="welcomeMessage" maxlength="2000" rows="4" style="width:100%;" placeholder="Welcome {user} to {server}!">'+escapeHtml(cfg.welcomeMessage || 'Welcome {user} to {server}!')+'</textarea>' +
      '<br><br><button class="button" type="submit">Save Automation</button><span id="automation-status" style="margin-left:12px"></span></form>';
    main.appendChild(section);
    section.querySelector('#automation-form').addEventListener('submit', async e => {
      e.preventDefault(); const status=section.querySelector('#automation-status'); status.textContent='Saving…';
      try { await dashboardApi.updateConfig(guildId,{autoRole:section.querySelector('#autoRole').value||null,welcomeChannel:section.querySelector('#welcomeChannel').value||null,welcomeMessage:section.querySelector('#welcomeMessage').value}); status.textContent='✓ Saved'; }
      catch(err){ status.textContent=err.message; }
    });
  } catch(err){ main.insertAdjacentHTML('beforeend','<section><div class="card"><h3>Unable to load automation</h3><p>'+escapeHtml(err.message)+'</p></div></section>'); }
});
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}