import { dashboardApi, setSelectedGuildId } from './dashboardApi.js';
import { getStoredSession, loginWithDiscord } from './DiscordOAuth.js';

function iconUrl(guild) {
  return guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('server-list');
  const error = document.getElementById('server-error');
  if (!list) return;

  const session = getStoredSession();
  if (!session?.accessToken) {
    list.innerHTML = `<div class="card"><h3>Discord authentication required</h3><p>Connect your Discord account to see servers you can manage.</p><button class="button" id="connect-discord">Connect Discord</button></div>`;
    document.getElementById('connect-discord')?.addEventListener('click', loginWithDiscord);
    return;
  }

  try {
    const { guilds } = await dashboardApi.guilds();
    if (!guilds.length) {
      list.innerHTML = '<div class="card"><h3>No manageable servers</h3><p>Discord did not return any servers where you have Manage Server or Administrator access.</p></div>';
      return;
    }

    list.innerHTML = guilds.map((guild) => {
      const icon = iconUrl(guild);
      const status = guild.botPresent ? 'active' : 'paused';
      const statusText = guild.botPresent ? 'NyxEclipse Online' : 'NyxEclipse Not Installed';
      return `<div class="card">
        ${icon ? `<img src="${icon}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:12px;">` : ''}
        <span class="status ${status}">${statusText}</span>
        <h3>${escapeHtml(guild.name)}</h3>
        <p>${guild.owner ? 'Server Owner' : 'Manage Server access'} · ${guild.botPresent ? 'Ready to configure' : 'Installation required'}</p>
        ${guild.botPresent
          ? '<button class="button btn-small manage-server">Manage Server</button>'
          : '<a class="button btn-small" href="invite.html">Add NyxEclipse</a>'}
        </div>`;
    }).join('');

    list.querySelectorAll('.manage-server').forEach((button, index) => {
      button.addEventListener('click', () => {
        const guild = guilds[index];
        setSelectedGuildId(guild.id);
        window.location.href = `../index.html?guild=${encodeURIComponent(guild.id)}`;
      });
    });
  } catch (err) {
    error.style.display = 'block';
    error.innerHTML = `<h3>Unable to load servers</h3><p>${escapeHtml(err.message)}</p>`;
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
}
