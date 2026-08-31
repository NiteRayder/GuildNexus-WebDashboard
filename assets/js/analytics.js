import { dashboardApi, getSelectedGuildId } from './dashboardApi.js';

const guildId = getSelectedGuildId();

document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('main');
  if (!main || !guildId) {
    if (main) main.insertAdjacentHTML('beforeend', '<section class="fade-in"><div class="card"><h3>Select a server first</h3><p>Open the Servers page and choose a NyxEclipse-enabled server.</p><a class="button btn-small" href="servers.html">Go to Servers</a></div></section>');
    return;
  }

  try {
    const { guild } = await dashboardApi.guild(guildId);
    
    const section = document.createElement('section');
    section.className = 'fade-in';
    section.innerHTML = '<h2>' + escapeHtml(guild.name) + ' Live Overview</h2>' +
      '<div class="cards">' +
      '<div class="card">' +
      '<h3>Server Stats</h3>' +
      '<p><strong>Members:</strong> ' + (guild.memberCount || 0) + '</p>' +
      '<p><strong>Channels:</strong> ' + (guild.channels?.length || 0) + '</p>' +
      '<p><strong>Roles:</strong> ' + (guild.roles?.length || 0) + '</p>' +
      '</div>' +
      '<div class="card">' +
      '<h3>Moderation Activity</h3>' +
      '<p><strong>Cases:</strong> Loading...</p>' +
      '<p><strong>Last Action:</strong> —</p>' +
      '</div>' +
      '<div class="card">' +
      '<h3>AI Assistant Status</h3>' +
      '<p><strong>Status:</strong> ' + (guild.config?.aiFilter?.enabled ? 'Enabled' : 'Disabled') + '</p>' +
      '<p><strong>Sensitivity:</strong> ' + (guild.config?.aiSensitivity || 50) + '%</p>' +
      '</div>' +
      '</div>';
    
    main.appendChild(section);
  } catch (err) {
    main.insertAdjacentHTML('beforeend', '<section class="fade-in"><div class="card"><h3>Unable to load analytics</h3><p>' + escapeHtml(err.message) + '</p></div></section>');
  }
});

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
