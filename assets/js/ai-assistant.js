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
    section.innerHTML = '<h2>AI Assistant Configuration</h2>' +
      '<div class="card">' +
      '<h3>Response Sensitivity</h3>' +
      '<p>Adjust how aggressively the AI responds to messages.</p>' +
      '<input type="range" id="ai-sensitivity" min="0" max="100" value="' + (config.aiSensitivity || 50) + '" style="width:100%;">' +
      '<p>Current: <strong id="sensitivity-val">' + (config.aiSensitivity || 50) + '%</strong></p>' +
      '<br>' +
      '<h3>Moderation Filter</h3>' +
      '<label><input type="checkbox" id="ai-filter-enabled" ' + (config.aiFilter?.enabled ? 'checked' : '') + '> Enable automatic content filtering</label>' +
      '<br><br>' +
      '<button class="button" id="save-ai-settings">Save AI Settings</button><span id="ai-status" style="margin-left:12px;"></span>' +
      '</div>';
    
    main.appendChild(section);
    
    const sensitivitySlider = section.querySelector('#ai-sensitivity');
    const sensitivityDisplay = section.querySelector('#sensitivity-val');
    const saveAiBtn = section.querySelector('#save-ai-settings');
    const aiStatus = section.querySelector('#ai-status');

    if (sensitivitySlider && sensitivityDisplay) {
      sensitivitySlider.addEventListener('input', (e) => {
        sensitivityDisplay.textContent = `${e.target.value}%`;
      });
    }

    if (saveAiBtn) {
      saveAiBtn.addEventListener('click', async () => {
        aiStatus.textContent = 'Saving…';
        try {
          await dashboardApi.updateConfig(guildId, {
            aiSensitivity: parseInt(sensitivitySlider?.value || 50),
            aiFilter: { enabled: section.querySelector('#ai-filter-enabled')?.checked || false }
          });
          aiStatus.textContent = '✓ Saved';
        } catch (error) {
          aiStatus.textContent = error.message;
        }
      });
    }
  } catch (error) {
    main.insertAdjacentHTML('beforeend', '<section class="fade-in"><div class="card"><h3>Unable to load AI settings</h3><p>' + error.message + '</p></div></section>');
  }
});
