import { dashboardApi, getSelectedGuildId } from './dashboardApi.js';
import { getStoredSession, loginWithDiscord } from './DiscordOAuth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const section = document.getElementById('audit-log-section');
  const body = document.getElementById('log-table-body');
  const viewButton = document.getElementById('view-logs-btn');
  const guildId = getSelectedGuildId();

  if (!guildId) {
    showMissingServer();
    return;
  }

  try {
    const [{ guild }, { cases }] = await Promise.all([
      dashboardApi.guild(guildId),
      dashboardApi.cases(guildId, { limit: 50 }),
    ]);

    const loggingEnabled = Boolean(guild.logging?.enabled);
    setStatus('spam-status-badge', loggingEnabled);
    setStatus('link-status-badge', loggingEnabled);

    const spamToggle = document.getElementById('spam-toggle');
    const linkToggle = document.getElementById('link-toggle');
    if (spamToggle) spamToggle.checked = loggingEnabled;
    if (linkToggle) linkToggle.checked = loggingEnabled;

    document.getElementById('spam-desc').textContent =
      loggingEnabled ? 'Connected to NyxEclipse logging. Configure anti-spam from the server settings.' : 'NyxEclipse logging is disabled for this server.';
    document.getElementById('link-desc').textContent =
      loggingEnabled ? 'Connected to NyxEclipse moderation logging.' : 'NyxEclipse moderation logging is disabled.';

    body.innerHTML = cases.length
      ? cases.map(renderCase).join('')
      : '<tr><td colspan="4" style="padding:10px;">No moderation cases have been recorded yet.</td></tr>';

    viewButton?.addEventListener('click', () => {
      section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('configure-spam-btn')?.addEventListener('click', () =>
      showToast('Anti-spam settings are controlled by NyxEclipse server configuration.', 'success')
    );
    document.getElementById('configure-link-btn')?.addEventListener('click', () =>
      showToast('Link validation settings are controlled by NyxEclipse server configuration.', 'success')
    );
  } catch (error) {
    body.innerHTML = `<tr><td colspan="4" style="padding:10px;">${escapeHtml(error.message)}</td></tr>`;
    section.style.display = 'block';
  }
});

function renderCase(caseItem) {
  return `<tr style="border-bottom:1px solid var(--border-color);">
    <td style="padding:10px;">${escapeHtml(formatDate(caseItem.createdAt))}</td>
    <td style="padding:10px;">${escapeHtml(caseItem.action || 'Unknown')}</td>
    <td style="padding:10px;">${escapeHtml(caseItem.target || caseItem.targetUserId || 'Unknown')}</td>
    <td style="padding:10px;">${escapeHtml(caseItem.reason || 'No reason provided')}</td>
  </tr>`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

function setStatus(id, active) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.classList.toggle('active', active);
  badge.classList.toggle('paused', !active);
  badge.textContent = active ? 'Active' : 'Disabled';
}

function showMissingServer() {
  const body = document.getElementById('log-table-body');
  const section = document.getElementById('audit-log-section');
  if (body) body.innerHTML = '<tr><td colspan="4" style="padding:10px;">Select a server from the Servers page first.</td></tr>';
  if (section) section.style.display = 'block';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
}
