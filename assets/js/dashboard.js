import { dashboardApi, getSelectedGuildId } from './dashboardApi.js';
import { getStoredSession, loginWithDiscord } from './DiscordOAuth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const hero = document.querySelector('.hero');
  const session = getStoredSession();
  if (!session?.accessToken) {
    const button = document.getElementById('dashboard-connect');
    button?.addEventListener('click', loginWithDiscord);
    return;
  }

  try {
    const { user } = await dashboardApi.me();
    const { guilds } = await dashboardApi.guilds();
    const selectedId = getSelectedGuildId() || new URLSearchParams(location.search).get('guild');
    if (selectedId) localStorage.setItem('guildnexus_selected_guild', selectedId);

    const selected = guilds.find((guild) => guild.id === selectedId && guild.botPresent) || guilds.find((guild) => guild.botPresent);

    if (hero) {
      const welcome = document.createElement('p');
      welcome.className = 'dashboard-user';
      welcome.textContent = `Connected as ${user.global_name || user.username} · ${guilds.length} manageable server${guilds.length === 1 ? '' : 's'}`;
      hero.appendChild(welcome);
    }

    if (selected) {
      const data = (await dashboardApi.guild(selected.id)).guild;
      const section = document.querySelector('main');
      const panel = document.createElement('section');
      panel.className = 'fade-in';
      panel.innerHTML = `
        <h2>${escapeHtml(data.name)}</h2>
        <div class="cards">
          <div class="card"><h3>${data.memberCount}</h3><p>Members</p></div>
          <div class="card"><h3>${data.humanCount}</h3><p>Human Members</p></div>
          <div class="card"><h3>${data.botCount}</h3><p>Bots</p></div>
          <div class="card"><h3>${data.counters.length}</h3><p>Server Counters</p></div>
        </div>
        <div class="flex-center mt-30">
          <a class="button" href="pages/servers.html">Manage Server</a>
          <a class="button btn-outline" href="pages/moderation.html">Moderation</a>
        </div>`;
      section.appendChild(panel);
    }
  } catch (error) {
    const panel = document.createElement('section');
    panel.className = 'fade-in';
    panel.innerHTML = `<div class="card"><h3>Dashboard connection failed</h3><p>${escapeHtml(error.message)}</p></div>`;
    document.querySelector('main')?.appendChild(panel);
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
}
