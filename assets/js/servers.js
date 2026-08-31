import { dashboardApi, setSelectedGuildId } from './dashboardApi.js';
import { getStoredSession, loginWithDiscord } from './DiscordOAuth.js';

function iconUrl(guild) {
  return guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;
}

const FETCH_COOLDOWN_MS = 5000;
let fetching = false;

async function fetchServers(force = false) {
  const list = document.getElementById('server-list');
  const error = document.getElementById('server-error');
  const refresh = document.getElementById('refresh-servers');
  if (!list || fetching) return;
  
  const last = Number(sessionStorage.getItem('guildnexus_last_server_fetch') || 0);
  const remaining = FETCH_COOLDOWN_MS - (Date.now() - last);
  if (force && remaining > 0) { 
    showCooldown(remaining); 
    return; 
  }
  
  fetching = true;
  if (refresh) refresh.disabled = true;
  
  try {
    sessionStorage.setItem('guildnexus_last_server_fetch', String(Date.now()));
    const { guilds } = await dashboardApi.guilds();
    renderServers(guilds, list);
    if (error) error.style.display = 'none';
  } catch (err) {
    error.style.display = 'block';
    error.innerHTML = '<h3>Unable to load servers</h3><p>' + escapeHtml(err.message) + '</p>';
  } finally {
    fetching = false;
    if (refresh) refresh.disabled = false;
  }
}

function showCooldown(ms) {
  const status = document.getElementById('server-fetch-status');
  if (!status) return;
  status.textContent = 'Refresh available in ' + Math.ceil(ms / 1000) + 's';
  setTimeout(() => {
    if (status.textContent.startsWith('Refresh available')) status.textContent = '';
  }, Math.max(ms, 100));
}

function renderServers(guilds, list) {
  if (!guilds.length) {
    list.innerHTML = '<div class="card"><h3>No manageable servers</h3><p>Discord did not return any servers where you have Manage Server or Administrator access.</p></div>';
    return;
  }
  
  list.innerHTML = guilds.map((guild, index) => {
    const icon = iconUrl(guild);
    const status = guild.botPresent ? 'active' : 'paused';
    const text = guild.botPresent ? 'NyxEclipse Online' : 'NyxEclipse Not Installed';
    
    return '<div class="card" style="display:flex;align-items:center;gap:15px;">' +
      (icon ? '<img src="' + icon + '" style="width:48px;height:48px;border-radius:50%;">' : '<div style="width:48px;height:48px;border-radius:50%;background:var(--accent);"></div>') +
      '<div style="flex:1;"><h3>' + escapeHtml(guild.name) + '</h3><p style="color:var(--text-muted);margin:0;">' + guild.memberCount + ' members</p><span class="status ' + status + '">' + text + '</span></div>' +
      '<button class="button btn-small manage-server" data-index="' + index + '">Manage</button>' +
      '</div>';
  }).join('');
  
  list.querySelectorAll('.manage-server').forEach(button => {
    button.addEventListener('click', () => {
      const guild = guilds[Number(button.dataset.index)];
      setSelectedGuildId(guild.id);
      window.location.href = './settings.html';
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('server-list');
  const error = document.getElementById('server-error');
  if (!list) return;

  const session = getStoredSession();
  if (!session?.sessionToken) {
    list.innerHTML = '<div class="card"><h3>Discord authentication required</h3><p>Connect your Discord account to see servers you can manage.</p><button class="button" id="connect-discord">Connect with Discord</button></div>';
    document.getElementById('connect-discord')?.addEventListener('click', loginWithDiscord);
    return;
  }

  const refresh = document.getElementById('refresh-servers');
  refresh?.addEventListener('click', () => fetchServers(true));
  fetchServers();
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
