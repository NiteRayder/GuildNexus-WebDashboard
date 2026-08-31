import { dashboardApi, getSelectedGuildId } from './dashboardApi.js';
import { getStoredSession, logoutFromDiscord } from './DiscordOAuth.js';

const guildId = getSelectedGuildId();

document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('main');
  if (!main) return;

  if (!guildId) {
    main.insertAdjacentHTML('beforeend', '<section class="fade-in"><div class="card"><h3>Select a server first</h3><p>Open the Servers page and choose a NyxEclipse-enabled server.</p><a class="button btn-small" href="servers.html">Go to Servers</a></div></section>');
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
      '<label>Audit Logging<br><select id="auditChannel" style="width:100%;"><option value="">Disabled</option>' + channels.map(c => '<option value="' + c.id + '" ' + (c.id === config.logging?.channel ? 'selected' : '') + '>#' + escapeHtml(c.name) + '</option>').join('') + '</select></label><br>' +
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
        logging: { ...(config.logging || {}), enabled: section.querySelector('#loggingEnabled').checked, channel: section.querySelector('#auditChannel').value || null }
      };
      try { 
        await dashboardApi.updateConfig(guildId, patch); 
        status.textContent = '✓ Saved'; 
      }
      catch (error) { 
        status.textContent = error.message; 
      }
    });
  } catch (error) {
    main.insertAdjacentHTML('beforeend', '<section class="fade-in"><div class="card"><h3>Unable to load server settings</h3><p>' + escapeHtml(error.message) + '</p></div></section>');
  }
});

const THEME_KEY = 'guildnexus_themes';
function getThemes() { try { return JSON.parse(localStorage.getItem(THEME_KEY) || '[]'); } catch { return []; } }
function saveThemes(v) { localStorage.setItem(THEME_KEY, JSON.stringify(v)); }

function renderAccountAndThemes() {
  const main = document.querySelector('main');
  if (!main) return;
  
  const s = document.createElement('section');
  s.className = 'fade-in';
  s.innerHTML = '<div class="cards"><div class="card"><h3>Authentication</h3><p id="auth-status">Checking Discord session…</p><button class="button btn-small" id="logout-discord">Logout</button></div></div><div class="card"><h3>Theme Customization</h3><div style="display:flex;gap:10px;margin-bottom:15px;"><input type="text" id="theme-name" placeholder="Theme name" style="flex:1;"><input type="color" id="theme-accent" value="#9b5cff"><button class="button btn-small" id="add-theme">Add Theme</button></div><div id="theme-list"></div></div>';
  main.appendChild(s);
  
  const session = getStoredSession();
  s.querySelector('#auth-status').textContent = session?.sessionToken ? 'Discord connected' : 'Not connected';
  s.querySelector('#logout-discord')?.addEventListener('click', async () => {
    await logoutFromDiscord();
    location.reload();
  });
  
  const list = s.querySelector('#theme-list');
  const render = () => {
    const themes = getThemes();
    list.innerHTML = themes.length ? themes.map((t, i) => '<div style="display:flex;gap:8px;align-items:center;margin:6px 0;padding:8px;background:rgba(155,92,255,0.1);border-radius:8px;"><div style="flex:1;"><strong>' + escapeHtml(t.name) + '</strong><br><small style="color:var(--text-muted);">Color: ' + t.accent + '</small></div><button class="button btn-small" onclick="this.parentElement.remove(); const themes=getThemes(); themes.splice(' + i + ',1); saveThemes(themes); render();">Remove</button></div>').join('') : '<p style="color:var(--text-muted);">No custom themes yet.</p>';
  };
  render();
  
  s.querySelector('#add-theme').onclick = () => {
    const name = s.querySelector('#theme-name').value.trim();
    if (!name) { showToast('Please enter a theme name.', 'error'); return; }
    const themes = getThemes();
    themes.push({ name, accent: s.querySelector('#theme-accent').value });
    saveThemes(themes);
    s.querySelector('#theme-name').value = '';
    render();
    showToast('Theme added!', 'success');
  };
}

document.addEventListener('DOMContentLoaded', renderAccountAndThemes);

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#096;'); }
