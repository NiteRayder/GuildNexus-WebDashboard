import { dashboardApi, getSelectedGuildId } from './dashboardApi.js';

const guildId = getSelectedGuildId();

document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('main');
  if (!main) return;

  if (!guildId) {
    main.insertAdjacentHTML('beforeend', '<section class="fade-in"><div class="card"><h3>Select a server first</h3><p>Open the Servers page and choose a NyxEclipse-enabled server.</p><a class="button btn-small" href="servers.html">Choose Server</a></div></section>');
    return;
  }

  try {
    const [{ guild }, resources] = await Promise.all([dashboardApi.guild(guildId), dashboardApi.resources(guildId)]);
    const config = guild.config || {};
    const channels = resources.channels.filter((c) => [0, 5].includes(c.type));
    const roles = resources.roles.filter((r) => !r.managed && r.id !== guild.id);
    const section = document.createElement('section');
    section.className = 'fade-in';
    section.innerHTML = '<h2>' + escapeHtml(guild.name) + ' Configuration</h2>' +
      '<form id="guild-settings-form" class="card">' +
      '<label>Command Prefix<br><input id="prefix" maxlength="10" value="' + escapeAttr(config.prefix || '!') + '" style="width:100%;"></label><br>' +
      '<label>Welcome Channel<br><select id="welcomeChannel" style="width:100%;"><option value="">Disabled</option>' + channels.map(c => '<option value="' + c.id + '" ' + (c.id === config.welcomeChannel ? 'selected' : '') + '>#' + escapeHtml(c.name) + '</option>').join('') + '</select></label><br>' +
      '<label>Auto Role<br><select id="autoRole" style="width:100%;"><option value="">Disabled</option>' + roles.map(r => '<option value="' + r.id + '" ' + (r.id === config.autoRole ? 'selected' : '') + '>' + escapeHtml(r.name) + '</option>').join('') + '</select></label><br>' +
      '<label>Audit Logging<br><select id="auditChannel" style="width:100%;"><option value="">Disabled</option>' + channels.map(c => '<option value="' + c.id + '" ' + (c.id === config.logging?.channels?.audit ? 'selected' : '') + '>#' + escapeHtml(c.name) + '</option>').join('') + '</select></label><br>' +
      '<label><input type="checkbox" id="loggingEnabled" ' + (config.logging?.enabled ? 'checked' : '') + '> Enable logging</label><br><br>' +
      '<button class="button" type="submit">Save Changes</button><span id="save-status" style="margin-left:12px;"></span></form>';
    main.appendChild(section);
    section.querySelector('#guild-settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = section.querySelector('#save-status');
      status.textContent = 'Saving…';
      const patch = {
        prefix: section.querySelector('#prefix').value.trim() || '!',
        welcomeChannel: section.querySelector('#welcomeChannel').value || null,
        autoRole: section.querySelector('#autoRole').value || null,
        logging: { ...(config.logging || {}), enabled: section.querySelector('#loggingEnabled').checked, channels: { ...(config.logging?.channels || {}), audit: section.querySelector('#auditChannel').value || null } },
      };
      try { await dashboardApi.updateConfig(guildId, patch); status.textContent = '✓ Saved'; }
      catch (error) { status.textContent = error.message; }
    });
  } catch (error) {
    main.insertAdjacentHTML('beforeend', '<section class="fade-in"><div class="card"><h3>Unable to load server settings</h3><p>' + escapeHtml(error.message) + '</p></div></section>');
  }
});

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char])); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#096;'); }