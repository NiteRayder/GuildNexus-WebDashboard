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
    const config = guild.config || {};
    
    const section = document.createElement('section');
    section.className = 'fade-in';
    section.innerHTML = '<h2>' + escapeHtml(guild.name) + ' Integrations</h2>' +
      '<form id="integrations-form" class="card">' +
      '<h3>Webhook Integration</h3>' +
      '<p>Send server events to external HTTP endpoints.</p>' +
      '<label>Webhook URL<br><input id="webhookUrl" type="url" value="' + escapeAttr(config.webhookUrl || '') + '" placeholder="https://example.com/webhook" style="width:100%;"></label>' +
      '<br><br>' +
      '<h3>GitHub Integration</h3>' +
      '<p>Receive commit and release notifications in Discord.</p>' +
      '<label>GitHub Repository<br><input id="githubRepo" type="text" value="' + escapeAttr(config.githubRepo || '') + '" placeholder="owner/repo" style="width:100%;"></label>' +
      '<br><label>Notifications Channel<br><select id="notificationChannel" style="width:100%;"><option value="">Disabled</option></select></label>' +
      '<br><br>' +
      '<button class="button" type="submit">Save Integrations</button><span id="integration-status" style="margin-left:12px;"></span>' +
      '</form>';
    
    main.appendChild(section);
    
    section.querySelector('#integrations-form').addEventListener('submit', async e => {
      e.preventDefault();
      const status = section.querySelector('#integration-status');
      status.textContent = 'Saving…';
      
      try {
        await dashboardApi.updateConfig(guildId, {
          webhookUrl: section.querySelector('#webhookUrl').value || null,
          githubRepo: section.querySelector('#githubRepo').value || null
        });
        status.textContent = '✓ Saved';
      } catch (err) {
        status.textContent = err.message;
      }
    });
  } catch (err) {
    main.insertAdjacentHTML('beforeend', '<section class="fade-in"><div class="card"><h3>Unable to load integrations</h3><p>' + escapeHtml(err.message) + '</p></div></section>');
  }
});

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#096;'); }
