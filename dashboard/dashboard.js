import { dashboardApi, getSelectedGuildId, setSelectedGuildId } from '/assets/js/dashboardApi.js';
import { getStoredSession, logoutFromDiscord } from '/assets/js/DiscordOAuth.js';

const $ = (selector, root = document) => root.querySelector(selector);
const content = $('#content');
const state = {
  guilds: [], guild: null, resources: { channels: [], roles: [] }, user: null,
  view: new URLSearchParams(location.search).get('view') || 'overview',
};

const titles = {
  overview: 'Overview', moderation: 'Moderation', security: 'Security & Antinuke', members: 'Members', audit: 'Audit Log',
  welcome: 'Welcome & Roles', tickets: 'Tickets', leveling: 'Leveling', 'reaction-roles': 'Reaction Roles', giveaways: 'Giveaways',
  analytics: 'Analytics', embeds: 'Embed Builder', automation: 'Automation', ai: 'AI Assistant', integrations: 'Integrations',
  'server-config': 'Server Configuration', settings: 'Dashboard Settings',
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const cfg = () => state.guild?.config || {};

function toast(message) {
  const element = $('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2600);
}

function status(ok, text) {
  const element = $('#apiStatus');
  if (!element) return;
  element.textContent = text;
  element.className = `status-pill ${ok ? 'good' : 'bad'}`;
}

function iconUrl(guild) {
  return guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null;
}

function channelName(id) {
  return state.resources.channels.find(channel => channel.id === id)?.name || id;
}

function channelOptions(value = null, allowedTypes = [0, 5]) {
  return `<option value="">Not configured</option>${state.resources.channels.filter(channel => allowedTypes.includes(Number(channel.type))).map(channel => `<option value="${esc(channel.id)}" ${channel.id === value ? 'selected' : ''}># ${esc(channel.name)}</option>`).join('')}`;
}

function categoryOptions(value = null) {
  return `<option value="">Not configured</option>${state.resources.channels.filter(channel => Number(channel.type) === 4).map(channel => `<option value="${esc(channel.id)}" ${channel.id === value ? 'selected' : ''}>${esc(channel.name)}</option>`).join('')}`;
}

function roleOptions(value = null) {
  return `<option value="">Not configured</option>${state.resources.roles.filter(role => !role.managed).map(role => `<option value="${esc(role.id)}" ${role.id === value ? 'selected' : ''}>${esc(role.name)}</option>`).join('')}`;
}

function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function toggle(label, description, path, on) {
  return `<div class="row"><div class="row-main"><strong>${esc(label)}</strong><span>${esc(description)}</span></div><button class="switch ${on ? 'on' : ''}" data-toggle="${esc(path)}" aria-label="Toggle ${esc(label)}" aria-pressed="${on}"></button></div>`;
}

async function savePatch(patch, message = 'Saved') {
  try {
    state.guild.config = await dashboardApi.updateConfig(state.guild.id, patch);
    toast(message);
    render();
  } catch (error) {
    toast(error.message);
  }
}

async function savePath(path, value) {
  const keys = path.split('.');
  const patch = {};
  let cursor = patch;
  for (let index = 0; index < keys.length - 1; index += 1) {
    cursor[keys[index]] = {};
    cursor = cursor[keys[index]];
  }
  cursor[keys.at(-1)] = value;
  await savePatch(patch, 'Setting saved');
}

function readFieldValue(element) {
  if (element.type === 'number') {
    if (element.value === '') return null;
    const number = Number(element.value);
    return Number.isFinite(number) ? number : null;
  }
  return element.value === '' ? null : element.value;
}

function collect() {
  const patch = {};
  document.querySelectorAll('[data-config]').forEach(element => {
    const keys = element.dataset.config.split('.');
    let cursor = patch;
    for (let index = 0; index < keys.length - 1; index += 1) {
      cursor[keys[index]] = cursor[keys[index]] || {};
      cursor = cursor[keys[index]];
    }
    cursor[keys.at(-1)] = readFieldValue(element);
  });
  return patch;
}

function stat(label, value, subtitle = '') {
  return `<div class="card stat-card"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(subtitle)}</span></div>`;
}

function hero(kicker, title, description, actions = '') {
  return `<div class="hero"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="actions">${actions}</div></div>`;
}

function module(icon, title, description, view) {
  return `<button class="card module" data-nav="${esc(view)}"><div class="icon">${icon}</div><h3>${esc(title)}</h3><p>${esc(description)}</p><span class="tag">Open module →</span></button>`;
}

function overview() {
  const guild = state.guild;
  const config = cfg();
  const logging = guild.logging || {};
  return hero('Server control center', `Welcome back, ${state.user?.global_name || state.user?.username || 'admin'}`, `${guild.name} is connected to NyxEclipse. Configure the server from one control center.`, '<button class="btn primary" data-action="refresh">↻ Refresh data</button>') +
    `<div class="grid stats">${stat('Members', guild.memberCount, 'Server members')}${stat('Humans', guild.humanCount, 'Non-bot members')}${stat('Channels', guild.channels, 'Cached channels')}${stat('Roles', guild.roles, 'Server roles')}</div>` +
    `<div class="grid two" style="margin-top:14px"><div class="card"><div class="section-title"><h2>Module control</h2><span>${Object.keys(config).length} config groups</span></div><div class="list">${toggle('Moderation', 'Case history and enforcement', 'moderation.enabled', config.moderation?.enabled !== false)}${toggle('Security', 'Protection and anti-raid', 'security.enabled', config.security?.enabled !== false)}${toggle('Welcome', 'Welcome messages and autorole', 'welcome.enabled', config.welcome?.enabled !== false)}${toggle('Tickets', 'Support workflow', 'tickets.enabled', config.tickets?.enabled !== false)}${toggle('Leveling', 'XP and progression', 'leveling.enabled', config.leveling?.enabled !== false)}</div></div>` +
    `<div class="card"><div class="section-title"><h2>Logging</h2><span class="tag ${logging.enabled ? 'good' : ''}">${logging.enabled ? 'Enabled' : 'Disabled'}</span></div><p class="notice">Audit logging is wired to NyxEclipse. Configure destinations from Server Configuration.</p><div class="row"><div class="row-main"><strong>Audit channel</strong><span>${esc(logging.channels?.audit ? channelName(logging.channels.audit) : 'Not configured')}</span></div><span class="tag">${logging.channels?.audit ? 'configured' : 'setup needed'}</span></div></div></div>` +
    `<div class="card" style="margin-top:14px"><div class="section-title"><h2>Control surface</h2><span>GuildNexus</span></div><div class="grid module-grid">${module('⚖', 'Moderation', 'Warnings, cases, filters and enforcement', 'moderation')}${module('◈', 'Security', 'Anti-raid, lockdown and protection', 'security')}${module('▣', 'Tickets', 'Support queues and workflows', 'tickets')}${module('◒', 'Analytics', 'Server growth and activity', 'analytics')}${module('▧', 'Embeds', 'Build rich Discord messages', 'embeds')}${module('⚙', 'Automation', 'Scripts, aliases and scheduling', 'automation')}</div></div>`;
}

function moderation() {
  const config = cfg();
  return hero('Safety', 'Moderation', 'Manage moderation posture, case logging and staff roles.') +
    `<div class="grid two"><div class="card">${toggle('Moderation enabled', 'Allow moderation systems to operate', 'moderation.enabled', config.moderation?.enabled !== false)}${toggle('Auto moderation', 'Message and content filtering', 'moderation.automod', config.moderation?.automod === true)}${toggle('Case logging', 'Record enforcement actions', 'moderation.caseLogging', config.moderation?.caseLogging !== false)}</div><div class="card"><div class="field"><label>Moderator role</label><select data-config="modRole">${roleOptions(config.modRole)}</select></div><div class="field"><label>Admin role</label><select data-config="adminRole">${roleOptions(config.adminRole)}</select></div><button class="btn primary" data-action="save-fields">Save roles</button></div></div>` +
    `<div class="card" style="margin-top:14px"><div class="section-title"><h2>Recent cases</h2><span>Live from NyxEclipse</span></div><div id="caseTable" class="empty">Loading cases…</div></div>`;
}

function security() {
  const config = cfg();
  const action = config.security?.raidAction || 'notify';
  return hero('Protection', 'Security & Antinuke', 'Centralize raid protection and lockdown settings.') +
    `<div class="grid three"><div class="card">${toggle('Protection enabled', 'Global security module', 'security.enabled', config.security?.enabled !== false)}${toggle('Anti-raid', 'Detect abnormal join bursts', 'security.antiraid', config.security?.antiraid === true)}${toggle('Lockdown', 'Restrict server during incidents', 'security.lockdown', config.security?.lockdown === true)}</div><div class="card"><div class="field"><label>Join threshold</label><input type="number" min="1" value="${esc(config.security?.joinThreshold ?? 10)}" data-config="security.joinThreshold"></div><div class="field"><label>Raid action</label><select data-config="security.raidAction"><option value="notify" ${action === 'notify' ? 'selected' : ''}>notify</option><option value="kick" ${action === 'kick' ? 'selected' : ''}>kick</option><option value="lockdown" ${action === 'lockdown' ? 'selected' : ''}>lockdown</option></select></div><button class="btn primary" data-action="save-fields">Save protection</button></div><div class="card"><h3>Permission safety</h3><p class="notice">Dashboard access is limited to server owners and users Discord authorizes with Manage Server or Administrator.</p></div></div>`;
}

function members() {
  return hero('Community', 'Members', 'Inspect a member, account creation date, join date and roles.') +
    `<div class="card"><div class="form-grid"><div class="field"><label>Discord user ID</label><input id="memberId" inputmode="numeric" placeholder="123456789012345678"></div><div style="display:flex;align-items:end"><button class="btn primary" data-action="lookup-member">Look up member</button></div></div><div id="memberResult" class="empty">Enter a Discord user ID to inspect the member.</div></div>` +
    `<div class="card" style="margin-top:14px"><div class="section-title"><h2>Server resources</h2><span>${state.resources.roles.length} roles · ${state.resources.channels.length} channels</span></div><div class="grid two"><div><h3>Roles</h3><div class="list">${state.resources.roles.slice(0, 15).map(role => `<div class="row"><div class="row-main"><strong>${esc(role.name)}</strong><span>Position ${role.position}</span></div><span class="tag">${role.managed ? 'managed' : 'editable'}</span></div>`).join('')}</div></div><div><h3>Channels</h3><div class="list">${state.resources.channels.slice(0, 15).map(channel => `<div class="row"><div class="row-main"><strong># ${esc(channel.name)}</strong><span>ID ${esc(channel.id)}</span></div><span class="tag">type ${channel.type}</span></div>`).join('')}</div></div></div></div>`;
}

function audit() {
  return hero('Transparency', 'Audit Log', 'Review events captured in the configured audit channel.') +
    `<div class="card"><div class="section-title"><h2>Event stream</h2><button class="btn" data-action="load-audit">Refresh</button></div><div id="auditTable" class="empty">Loading audit events…</div></div>`;
}

function welcome() {
  const config = cfg();
  return hero('Onboarding', 'Welcome & Roles', 'Configure welcome messaging and automatic role assignment.') +
    `<div class="grid two"><div class="card">${toggle('Welcome messages', 'Send a welcome message for new members', 'welcome.enabled', config.welcome?.enabled !== false)}<div class="field"><label>Welcome channel</label><select data-config="welcomeChannel">${channelOptions(config.welcomeChannel)}</select></div><div class="field"><label>Automatic role</label><select data-config="autoRole">${roleOptions(config.autoRole)}</select></div></div><div class="card"><div class="field"><label>Welcome message</label><textarea data-config="welcomeMessage">${esc(config.welcomeMessage || 'Welcome {user} to {server}!')}</textarea></div><button class="btn primary" data-action="save-fields">Save welcome setup</button></div></div>`;
}

function tickets() {
  const config = cfg();
  return hero('Support', 'Tickets', 'Configure ticket workflow and notification destinations.') +
    `<div class="grid three"><div class="card">${toggle('Tickets enabled', 'Enable ticket workflows', 'tickets.enabled', config.tickets?.enabled !== false)}${toggle('Auto assign', 'Assign new tickets to staff', 'tickets.autoAssign', config.tickets?.autoAssign === true)}${toggle('Ratings', 'Collect close ratings', 'tickets.ratings', config.tickets?.ratings === true)}</div><div class="card"><div class="field"><label>Ticket category</label><select data-config="tickets.categoryId">${categoryOptions(config.tickets?.categoryId)}</select></div><div class="field"><label>Transcript channel</label><select data-config="tickets.transcriptChannelId">${channelOptions(config.tickets?.transcriptChannelId)}</select></div><button class="btn primary" data-action="save-fields">Save ticket settings</button></div><div class="card"><h3>Workflow</h3><p class="notice">The dashboard surface is prepared for claims, priorities, notes, saved replies, ratings and case attachment as the bot exposes those operations.</p></div></div>`;
}

function leveling() {
  const config = cfg();
  return hero('Engagement', 'Leveling', 'Control XP and level progression.') +
    `<div class="grid two"><div class="card">${toggle('Leveling enabled', 'Award XP for community activity', 'leveling.enabled', config.leveling?.enabled !== false)}${toggle('Announce levels', 'Post level-up notifications', 'leveling.announce', config.leveling?.announce !== false)}<div class="field"><label>XP per message</label><input type="number" min="0" value="${esc(config.leveling?.xpPerMessage ?? 10)}" data-config="leveling.xpPerMessage"></div><button class="btn primary" data-action="save-fields">Save leveling</button></div><div class="card"><h3>Level roles</h3><p class="notice">Available server roles are loaded live from Discord resources.</p>${state.resources.roles.slice(0, 8).map(role => `<div class="row"><div class="row-main"><strong>${esc(role.name)}</strong><span>Role ID ${esc(role.id)}</span></div><span class="tag">position ${role.position}</span></div>`).join('')}</div></div>`;
}

function reactionRoles() {
  const config = cfg();
  return hero('Interactions', 'Reaction Roles', 'Centralize self-assignable role configuration.') +
    `<div class="card">${toggle('Reaction roles enabled', 'Allow configured role panels', 'reactionRoles.enabled', config.reactionRoles?.enabled !== false)}<p class="notice">Existing reaction-role handlers remain the Discord-side source of truth. This page keeps the configuration surface centralized.</p></div><div class="card" style="margin-top:14px"><h3>Available roles</h3><div class="grid three">${state.resources.roles.filter(role => !role.managed).slice(0, 18).map(role => `<div class="card"><strong>${esc(role.name)}</strong><p style="color:var(--muted);font-size:10px">${esc(role.id)}</p></div>`).join('')}</div></div>`;
}

function giveaways() {
  return hero('Events', 'Giveaways', 'Monitor the existing giveaway engine and persistence requirements.') +
    `<div class="grid three"><div class="card"><h3>Giveaway engine</h3><p class="notice">NyxEclipse runs scheduled giveaway checks. Persistent dashboard management depends on PostgreSQL being available.</p><span class="tag">Database dependent</span></div><div class="card"><h3>Scheduling</h3><p class="notice">Creation remains available through the bot's existing giveaway commands until dashboard write endpoints are added.</p></div><div class="card"><h3>Persistence</h3><p class="notice">Without PostgreSQL, persistent state can be lost on restart.</p></div></div>`;
}

function analytics() {
  const guild = state.guild;
  return hero('Insights', 'Analytics', 'Current server telemetry without inventing historical data.') +
    `<div class="grid stats">${stat('Members', guild.memberCount, 'Current snapshot')}${stat('Humans', guild.humanCount, 'Current snapshot')}${stat('Bots', guild.botCount, 'Current snapshot')}${stat('Channels', guild.channels, 'Current snapshot')}</div><div class="card" style="margin-top:14px"><h2>Historical analytics</h2><p class="notice">Historical messages, reactions, voice and membership charts require persisted telemetry. The current API does not expose a historical series, so this page refuses to fabricate one.</p></div>`;
}

function embeds() {
  return hero('Builder', 'Embed Builder', 'Compose a rich Discord embed draft.') +
    `<div class="grid two"><div class="card"><div class="field"><label>Title</label><input id="embedTitle" placeholder="Announcement"></div><div class="field"><label>Description</label><textarea id="embedDesc" placeholder="Write your message…"></textarea></div><div class="form-grid"><div class="field"><label>Color</label><input id="embedColor" value="#8b5cf6"></div><div class="field"><label>Footer</label><input id="embedFooter" placeholder="GuildNexus"></div></div><button class="btn primary" data-action="preview-embed">Update preview</button></div><div class="card"><div class="section-title"><h2>Preview</h2><span>Draft</span></div><div id="embedPreview" class="notice">Your preview appears here.</div><button class="btn" style="margin-top:10px" data-action="copy-embed">Copy JSON</button></div></div>`;
}

function automation() {
  return hero('Automation', 'Automation & Scripts', 'Prepare reusable aliases, schedules and server-side scripts.') +
    `<div class="grid three"><div class="card">${toggle('Automation', 'Enable automation module', 'automation.enabled', cfg().automation?.enabled !== false)}<p class="notice">Browser code is never executed as an automation script.</p></div><div class="card"><h3>Command aliases</h3><p class="notice">Centralized alias workspace for future bot-side alias storage.</p></div><div class="card"><h3>Custom scripts</h3><p class="notice">Scripts should execute server-side with explicit permission checks, rate limits and sandboxing.</p></div></div>`;
}

function ai() {
  return hero('Assistant', 'AI Assistant', 'AI-ready server tooling with secrets kept server-side.') +
    `<div class="grid two"><div class="card"><h2>Ask GuildNexus</h2><div class="field"><label>Prompt</label><textarea id="aiPrompt" placeholder="Summarize the moderation posture for this server…"></textarea></div><button class="btn primary" data-action="ai-local">Generate draft</button></div><div class="card"><h2>Response</h2><div id="aiResult" class="notice">Configure a server-side AI provider before making live requests.</div></div></div>`;
}

function integrations() {
  return hero('Connections', 'Integrations', 'A central place for community-service connections and webhooks.') +
    `<div class="grid module-grid">${module('◉', 'Discord', 'OAuth and guild authorization', 'settings')}${module('▶', 'YouTube', 'Feed notification workspace', 'integrations')}${module('♪', 'Twitch', 'Stream notification workspace', 'integrations')}${module('◈', 'TikTok', 'Social notification workspace', 'integrations')}${module('⌂', 'GitHub', 'Repository notification workspace', 'integrations')}${module('◎', 'Webhooks', 'Event routing destinations', 'server-config')}</div>`;
}

function serverConfig() {
  const config = cfg();
  const logging = config.logging || {};
  return hero('System', 'Server Configuration', 'Edit the bot configuration shared by GuildNexus modules.') +
    `<div class="grid two"><div class="card"><div class="field"><label>Command prefix</label><input data-config="prefix" value="${esc(config.prefix || '!')}"></div><div class="field"><label>Birthday channel</label><select data-config="birthdayChannelId">${channelOptions(config.birthdayChannelId)}</select></div><div class="field"><label>Welcome channel</label><select data-config="welcomeChannel">${channelOptions(config.welcomeChannel)}</select></div><div class="field"><label>Auto role</label><select data-config="autoRole">${roleOptions(config.autoRole)}</select></div><button class="btn primary" data-action="save-fields">Save server configuration</button></div><div class="card"><div class="section-title"><h2>Logging</h2><span>${logging.enabled ? 'enabled' : 'disabled'}</span></div>${toggle('Logging enabled', 'Write configured events to audit destinations', 'logging.enabled', logging.enabled === true)}<div class="field"><label>Audit channel</label><select data-config="logging.channels.audit">${channelOptions(logging.channels?.audit)}</select></div><div class="field"><label>Application channel</label><select data-config="logging.channels.applications">${channelOptions(logging.channels?.applications)}</select></div><div class="field"><label>Reports channel</label><select data-config="logging.channels.reports">${channelOptions(logging.channels?.reports)}</select></div><button class="btn primary" data-action="save-fields">Save logging</button></div></div>`;
}

function settings() {
  return hero('Preferences', 'Dashboard Settings', 'Local preferences for the GuildNexus control center.') +
    `<div class="grid two"><div class="card">${toggle('Compact navigation', 'Tighter dashboard spacing', 'ui.compact', localStorage.getItem('gn_compact') === '1')}${toggle('Remember server', 'Keep selected server between visits', 'ui.remember', localStorage.getItem('gn_remember') !== '0')}${toggle('Reduce motion', 'Disable most transitions', 'ui.motion', localStorage.getItem('gn_motion') === '1')}</div><div class="card"><h3>Account</h3><div class="row"><div class="row-main"><strong>${esc(state.user?.global_name || state.user?.username || 'Discord user')}</strong><span>${esc(state.user?.id || '')}</span></div><span class="tag good">authenticated</span></div><button class="btn" data-action="logout" style="margin-top:12px">Sign out</button></div></div>`;
}

const renderers = { overview, moderation, security, members, audit, welcome, tickets, leveling, 'reaction-roles': reactionRoles, giveaways, analytics, embeds, automation, ai, integrations, 'server-config': serverConfig, settings };

function render() {
  const view = renderers[state.view] ? state.view : 'overview';
  state.view = view;
  $('#viewTitle').textContent = titles[view] || 'Overview';
  document.querySelectorAll('.nav a').forEach(link => link.classList.toggle('active', link.dataset.view === view));
  content.innerHTML = renderers[view]();
  loadViewData(view);
}

async function loadViewData(view) {
  if (view === 'moderation') await loadCases();
  if (view === 'audit') await loadAudit();
}

async function actions(action) {
  if (action === 'refresh') {
    await selectGuild(state.guild.id);
    toast('Server data refreshed');
    return;
  }
  if (action === 'save-fields') {
    await savePatch(collect(), 'Configuration saved');
    return;
  }
  if (action === 'lookup-member') {
    const id = $('#memberId')?.value.trim();
    if (!id) return toast('Enter a Discord user ID.');
    try {
      const result = await dashboardApi.member(state.guild.id, id);
      const member = result.member;
      $('#memberResult').innerHTML = `<div class="row"><div class="row-main"><strong>${esc(member.globalName || member.username)}</strong><span>@${esc(member.username)} · ${member.bot ? 'Bot' : 'User'}</span></div><span class="tag">${esc(member.id)}</span></div><div class="grid three" style="margin-top:10px">${stat('Joined', new Date(member.joinedAt).toLocaleDateString(), 'Server join')}${stat('Account', new Date(member.accountCreatedAt).toLocaleDateString(), 'Account creation')}${stat('Roles', member.roles.length, 'Assigned roles')}</div><div class="notice" style="margin-top:12px">Roles: ${member.roles.map(role => esc(role.name)).join(', ') || '@everyone'}</div>`;
    } catch (error) {
      $('#memberResult').textContent = error.message;
    }
    return;
  }
  if (action === 'load-audit') return loadAudit();
  if (action === 'preview-embed') {
    const title = $('#embedTitle').value;
    const description = $('#embedDesc').value;
    const footer = $('#embedFooter').value;
    const color = $('#embedColor').value;
    $('#embedPreview').style.borderLeft = `4px solid ${color}`;
    $('#embedPreview').innerHTML = `<strong>${esc(title || 'Untitled')}</strong><p>${esc(description || 'No description')}</p><small>${esc(footer)}</small>`;
    return;
  }
  if (action === 'copy-embed') {
    const data = { title: $('#embedTitle')?.value || '', description: $('#embedDesc')?.value || '', color: $('#embedColor')?.value || '', footer: $('#embedFooter')?.value || '' };
    try {
      await navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
      toast('Embed JSON copied');
    } catch {
      toast('Clipboard access is unavailable.');
    }
    return;
  }
  if (action === 'ai-local') {
    const prompt = $('#aiPrompt').value.trim();
    $('#aiResult').textContent = prompt ? `Draft prepared for: ${prompt}\n\nA live AI provider must be configured server-side.` : 'Enter a prompt first';
    return;
  }
  if (action === 'logout') {
    await logoutFromDiscord();
    location.href = '/';
  }
}

async function loadCases() {
  try {
    const data = await dashboardApi.cases(state.guild.id, { limit: 25 });
    const cases = data.cases || data;
    $('#caseTable').innerHTML = cases.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Action</th><th>User</th><th>Moderator</th><th>Created</th></tr></thead><tbody>${cases.map(item => `<tr><td><span class="tag">${esc(item.action || item.type || 'case')}</span></td><td>${esc(item.userId || item.targetId || 'unknown')}</td><td>${esc(item.moderatorId || 'unknown')}</td><td>${esc(item.createdAt ? new Date(item.createdAt).toLocaleString() : '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No moderation cases found.</div>';
  } catch (error) {
    $('#caseTable').textContent = error.message;
  }
}

async function loadAudit() {
  try {
    const data = await dashboardApi.auditLog(state.guild.id, { limit: 50 });
    const events = data.events || [];
    $('#auditTable').innerHTML = events.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Event</th><th>Source</th></tr></thead><tbody>${events.map(event => `<tr><td>${esc(new Date(event.createdAt).toLocaleString())}</td><td>${esc(event.embed?.title || event.content || 'Audit event')}</td><td>${event.url ? `<a href="${esc(event.url)}" target="_blank" rel="noreferrer">Open message</a>` : 'Unavailable'}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${data.enabled ? 'No events found.' : 'Audit logging is not configured.'}</div>`;
  } catch (error) {
    $('#auditTable').textContent = error.message;
  }
}

async function selectGuild(id, rerender = true) {
  const [guildData, resources] = await Promise.all([dashboardApi.guild(id), dashboardApi.resources(id)]);
  state.guild = guildData.guild;
  setSelectedGuildId(id);
  state.resources = resources;
  $('#serverName').textContent = state.guild.name;
  $('#profileName').textContent = state.user?.global_name || state.user?.username || 'Account';
  const avatar = state.user?.avatar;
  if (avatar) $('#avatarFallback').innerHTML = `<img src="https://cdn.discordapp.com/avatars/${state.user.id}/${avatar}.png?size=64" style="width:100%;height:100%;border-radius:50%" alt="">`;
  if (rerender) render();
}

function navigate(view) {
  state.view = renderers[view] ? view : 'overview';
  history.pushState({}, '', `?view=${encodeURIComponent(state.view)}`);
  render();
  $('#sidebar')?.classList.remove('open');
}

function openServerMenu() {
  $('#serverModal').classList.remove('hidden');
  $('#serverList').innerHTML = state.guilds.map(guild => `<button class="server-option" data-server="${esc(guild.id)}"><span class="server-icon">${iconUrl(guild) ? `<img src="${iconUrl(guild)}" alt="">` : 'N'}</span><span><strong>${esc(guild.name)}</strong><br><small style="color:var(--muted)">${guild.botPresent ? 'NyxEclipse installed' : 'Bot not installed'}</small></span></button>`).join('');
}

function bindStaticEvents() {
  $('#serverMenuBtn')?.addEventListener('click', openServerMenu);
  $('#mobileMenu')?.addEventListener('click', () => $('#sidebar')?.classList.toggle('open'));
  $('#refreshBtn')?.addEventListener('click', () => actions('refresh'));
  $('#logoutBtn')?.addEventListener('click', () => actions('logout'));
  $('#serverModal')?.addEventListener('click', event => {
    if (event.target === $('#serverModal') || event.target.closest('[data-close]')) $('#serverModal').classList.add('hidden');
  });
  $('#serverList')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-server]');
    if (!button) return;
    try {
      await selectGuild(button.dataset.server);
      $('#serverModal').classList.add('hidden');
    } catch (error) {
      toast(error.message);
    }
  });
  content.addEventListener('click', event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) return navigate(nav.dataset.nav);
    const toggleButton = event.target.closest('[data-toggle]');
    if (toggleButton) return handleToggle(toggleButton);
    const action = event.target.closest('[data-action]');
    if (action) actions(action.dataset.action);
  });
  $('#mainNav')?.addEventListener('click', event => {
    const link = event.target.closest('[data-view]');
    if (!link) return;
    event.preventDefault();
    navigate(link.dataset.view);
  });
  window.addEventListener('popstate', () => {
    state.view = new URLSearchParams(location.search).get('view') || 'overview';
    render();
  });
}

async function handleToggle(button) {
  const path = button.dataset.toggle;
  const source = path.startsWith('ui.') ? {
    compact: localStorage.getItem('gn_compact') === '1',
    remember: localStorage.getItem('gn_remember') !== '0',
    motion: localStorage.getItem('gn_motion') === '1',
  } : cfg();
  const lookupPath = path.startsWith('ui.') ? path.slice(3) : path;
  const next = !Boolean(getPath(source, lookupPath));
  if (path.startsWith('ui.')) {
    const key = path === 'ui.compact' ? 'gn_compact' : path === 'ui.remember' ? 'gn_remember' : 'gn_motion';
    localStorage.setItem(key, next ? '1' : '0');
    render();
    return;
  }
  await savePath(path, next);
}

async function boot() {
  const session = getStoredSession();
  if (!session?.authenticated || !session.sessionToken) {
    location.href = '/';
    return;
  }
  try {
    bindStaticEvents();
    state.user = (await dashboardApi.me()).user;
    state.guilds = (await dashboardApi.guilds()).guilds || [];
    const selectedId = getSelectedGuildId();
    const guild = state.guilds.find(item => item.id === selectedId && item.botPresent) || state.guilds.find(item => item.botPresent);
    if (!guild) {
      status(false, 'No managed server');
      content.innerHTML = `<div class="card empty"><h2>NyxEclipse is not installed in a server you can manage.</h2><p>Install the bot, then return here.</p><a class="btn primary" href="/invite/">Invite NyxEclipse</a></div>`;
      return;
    }
    await selectGuild(guild.id, false);
    status(true, 'API connected');
    render();
  } catch (error) {
    status(false, 'API error');
    content.innerHTML = `<div class="card"><h2>Dashboard could not load</h2><p>${esc(error.message)}</p><button class="btn primary" data-action="retry-dashboard">Retry</button></div>`;
    content.onclick = event => {
      if (event.target.closest('[data-action="retry-dashboard"]')) boot();
    };
  }
}

boot();
