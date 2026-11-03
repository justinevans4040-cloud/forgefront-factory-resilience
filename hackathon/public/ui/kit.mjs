/* Shared shell, router, API client and component builders for every screen.
   Screens are loaded by the router and receive this kit; they do not edit it. */

window.__errs = Array.isArray(window.__errs) ? window.__errs : [];

export const SCREEN_FLOW = [
  { id: 'incident', label: 'Incident' },
  { id: 'findings', label: 'Findings' },
  { id: 'decision', label: 'Decision' },
  { id: 'britt-replan', label: 'The Britt plan' },
  { id: 'disrupt', label: 'Disrupt' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'shop', label: 'Shop' },
  { id: 'settings', label: 'Settings' }
];

const appRoot = document.getElementById('app');
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const iconPaths = {
  mark: '<path d="M12 3l1.9 5.4 5.6 1.6-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.6z"/><path d="M19 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/>',
  arrow: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  check: '<path d="M4.5 12.5l5 5L19.5 6.5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  reset: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 3v5h-5"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'
};

function icon(name, large = false) {
  return `<svg class="icon${large ? ' icon-lg' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ''}</svg>`;
}

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const fmtInt = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0);
const fmtHours = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'time pending';
  return `${Number.isInteger(n) ? n : n.toFixed(1)}h`;
};
const fmtMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n))}`;
};
function friendlyName(raw, fallback = 'Plant item') {
  if (raw === null || raw === undefined || String(raw).trim() === '') return fallback;
  const text = String(raw).trim();
  const coded = /^[A-Za-z0-9]+(?:[-_/][A-Za-z0-9]+)+$/.test(text) || /^[A-Z][A-Z0-9\s-]*$/.test(text);
  if (coded) return text.replace(/[-_/]+/g, ' ').toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase()).replace(/\s+/g, ' ').trim();
  return text;
}

/* Shared workflow state: raw API payloads live here so every screen reads the
   same snapshot, analysis, plant and session instead of refetching its own. */
const state = {
  currentScreen: 'incident',
  connection: 'checking',
  csrf: '',
  operator: null,
  scenario: null,
  workflow: null,
  analysis: null,
  plant: null,
  tools: null,
  pageCommands: [],
  visited: ['incident']
};
const listeners = new Set();
function notify() {
  for (const listener of Array.from(listeners)) {
    try { listener(state); } catch (error) { window.__errs.push(String(error && error.message ? error.message : error)); }
  }
  syncShellState();
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let sessionPromise = null;
async function ensureSession(force = false) {
  if (state.csrf && !force) return state.csrf;
  if (!sessionPromise || force) {
    sessionPromise = fetch('/api/meta/demo-entry', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}'
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Session failed with ${response.status}`);
      const data = await response.json();
      state.csrf = data.csrf || '';
      state.operator = data.operator || null;
      return state.csrf;
    }).catch((error) => {
      sessionPromise = null;
      state.csrf = '';
      throw error;
    });
  }
  return sessionPromise;
}

async function request(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const retried = options.retried === true;
  if (!path.endsWith('/api/meta/demo-entry')) await ensureSession();
  const headers = { Accept: 'application/json', ...(state.csrf ? { 'x-csrf-token': state.csrf } : {}), ...(options.headers || {}) };
  let body = options.body;
  if (method === 'POST') {
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (body === undefined || body === null) body = '{}';
    else if (typeof body !== 'string') body = JSON.stringify(body);
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(path, { method, credentials: 'same-origin', headers, body: method === 'GET' ? undefined : body, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
  if (response.status === 403 && !retried && !path.endsWith('/api/meta/demo-entry')) {
    state.csrf = '';
    sessionPromise = null;
    await ensureSession(true);
    return request(path, { ...options, retried: true });
  }
  if (!response.ok) {
    let detail = '';
    try {
      const payload = await response.clone().json();
      detail = payload && (payload.error || payload.message) ? String(payload.error || payload.message) : '';
    } catch { detail = ''; }
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

const api = {
  request,
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  demoEntry: () => ensureSession(true),
  workflowStatus: () => request('/api/workflow/status', { method: 'POST', body: {} }),
  resetDemo: () => request('/api/scenario/reset-demo', { method: 'POST', body: {} })
};

function setConnection(next) {
  if (state.connection === next) { syncShellState(); return; }
  state.connection = next;
  notify();
}

/* Loads the four shared reads in parallel under one session. A failure keeps
   the last good payloads and surfaces a retry the operator can see and use. */
async function refreshData(options = {}) {
  const notifyOnError = options.notifyOnError !== false;
  setConnection('checking');
  const results = await Promise.allSettled([
    api.get('/api/scenario'),
    api.workflowStatus(),
    api.get('/api/plant'),
    api.get('/api/analysis')
  ]);
  const keys = ['scenario', 'workflow', 'plant', 'analysis'];
  let ok = false;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      state[keys[index]] = result.value;
      ok = true;
    }
  });
  setConnection(ok ? 'connected' : 'offline');
  if (!ok && notifyOnError) {
    toast('Plant records could not be reached', {
      text: 'The current screen has not changed. Check the connection, then try again.',
      actionLabel: 'Retry',
      onAction: () => refreshData(options)
    });
  }
  notify();
  return { ok, scenario: state.scenario, workflow: state.workflow, plant: state.plant, analysis: state.analysis };
}

async function loadTools() {
  const payload = await api.get('/api/tools');
  state.tools = payload;
  notify();
  return payload;
}

/* Toasts: every failure that needs another attempt carries its own retry. */
function toast(title, options = {}) {
  const region = document.getElementById('toastRegion');
  if (!region) return null;
  const element = document.createElement('div');
  element.className = 'toast';
  element.setAttribute('role', 'status');
  element.innerHTML = `
    <div class="toast-main">
      <span class="toast-title">${esc(title)}</span>
      ${options.text ? `<span class="toast-text">${esc(options.text)}</span>` : ''}
    </div>
    <div class="toast-actions">
      ${options.actionLabel ? `<button class="btn btn-secondary btn-small" type="button" data-toast-action>${esc(options.actionLabel)}</button>` : ''}
      <button class="icon-button" type="button" data-toast-close aria-label="Dismiss">${icon('close')}</button>
    </div>`;
  region.appendChild(element);
  const dismiss = () => element.remove();
  element.querySelector('[data-toast-close]').addEventListener('click', dismiss);
  const actionButton = element.querySelector('[data-toast-action]');
  if (actionButton && typeof options.onAction === 'function') {
    actionButton.addEventListener('click', async () => {
      actionButton.disabled = true;
      try { await options.onAction(); dismiss(); }
      catch { actionButton.disabled = false; }
    });
  } else {
    window.setTimeout(dismiss, 6000);
  }
  return element;
}

/* Dialogs and the one-click authorize wall shared by decision-style screens. */
let dialogActions = [];
function openDialog(options = {}) {
  const dialog = document.getElementById('kitDialog');
  if (!dialog) return null;
  dialogActions = Array.isArray(options.actions) ? options.actions : [];
  const titleId = 'kitDialogTitle';
  dialog.innerHTML = `
    <div class="dialog-card${options.wide ? ' is-wide' : ''}" role="document">
      <div class="dialog-head">
        <div>
          <h2 class="dialog-title" id="${titleId}">${esc(options.title || 'Details')}</h2>
          ${options.subtitle ? `<p class="dialog-sub">${esc(options.subtitle)}</p>` : ''}
        </div>
        <button class="icon-button" type="button" data-dialog-close aria-label="Close">${icon('close')}</button>
      </div>
      <div class="dialog-body">
        ${options.bodyHtml || ''}
        <p class="dialog-error" data-dialog-error role="alert" hidden></p>
      </div>
      ${dialogActions.length ? `<div class="dialog-actions">${dialogActions.map((action, index) => `
        <button class="btn ${esc(action.variant || 'btn-secondary')} btn-small" type="button" data-dialog-action="${index}">${esc(action.label || 'Continue')}</button>`).join('')}
      </div>` : ''}
    </div>`;
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('[data-dialog-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = dialogActions[Number(button.dataset.dialogAction)];
      if (!action || typeof action.onClick !== 'function') { dialog.close(); return; }
      const errorBox = dialog.querySelector('[data-dialog-error]');
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
      button.disabled = true;
      try {
        const keepOpen = await action.onClick();
        if (keepOpen === false) button.disabled = false;
        else dialog.close();
      } catch (error) {
        button.disabled = false;
        if (errorBox) {
          errorBox.hidden = false;
          errorBox.textContent = `${String(error && error.message ? error.message : error)} Nothing was changed. You can try again.`;
        }
      }
    });
  });
  if (!dialog.open) dialog.showModal();
  const firstAction = dialog.querySelector('[data-dialog-action]');
  if (firstAction) firstAction.focus();
  return dialog;
}
function closeDialog() {
  const dialog = document.getElementById('kitDialog');
  if (dialog && dialog.open) dialog.close();
}
function detailRowsHtml(rows) {
  if (!Array.isArray(rows) || !rows.length) return '';
  return `<dl class="detail-rows">${rows.map((row) => `
    <div class="detail-row"><dt>${esc(row.label)}</dt><dd>${row.html ? row.value : esc(row.value)}</dd></div>`).join('')}</dl>`;
}
function openAuthorize(options = {}) {
  const confirmLabel = options.confirmLabel || 'Authorize';
  const rowsHtml = detailRowsHtml(options.rows || []);
  return openDialog({
    title: options.title || 'Authorize this decision',
    subtitle: options.subtitle || 'Read what will happen, then authorize with one click. Nothing moves before this step.',
    wide: options.wide === true,
    bodyHtml: `
      <div class="authorize-wall">
        ${options.summary ? `<p class="authorize-note">${options.summary}</p>` : ''}
        ${rowsHtml}
        ${options.bodyHtml || ''}
        <p class="authorize-note"><b>One click is enough.</b> The authorization is recorded against the current plant snapshot, and the numbers above come from plant records.</p>
      </div>`,
    actions: [
      { label: 'Back', variant: 'btn-secondary', onClick: () => true },
      {
        label: confirmLabel, variant: 'btn-primary',
        onClick: async () => {
          if (typeof options.onAuthorize === 'function') await options.onAuthorize();
          if (typeof options.onAuthorized === 'function') options.onAuthorized();
          return true;
        }
      }
    ]
  });
}

/* Shared component builders. Each returns markup using theme classes only;
   screens wire behaviour by querying the data attributes they asked for. */
const ui = {
  icon,
  button({ label, variant = 'btn-secondary', size = '', iconName = '', attrs = '', disabled = false }) {
    return `<button class="btn ${esc(variant)}${size ? ` ${esc(size)}` : ''}" type="button" ${attrs}${disabled ? ' disabled' : ''}>${iconName ? icon(iconName) : ''}<span>${esc(label)}</span></button>`;
  },
  panel({ title = '', desc = '', body = '', className = '', headExtra = '' }) {
    return `<section class="panel ${esc(className)}">
      ${title ? `<div class="card-head"><div><h2 class="card-title">${esc(title)}</h2>${desc ? `<p class="card-desc">${esc(desc)}</p>` : ''}</div>${headExtra}</div>` : ''}
      ${body}
    </section>`;
  },
  sideCard({ title = '', body = '', grow = false, className = '' }) {
    return `<section class="side-card${grow ? ' is-grow' : ''} ${esc(className)}">${title ? `<h2 class="side-title">${esc(title)}</h2>` : ''}${body}</section>`;
  },
  pill(text, tone = 'is-neutral', dot = true) {
    return `<span class="pill ${esc(tone)}">${dot ? '<span class="pill-dot" aria-hidden="true"></span>' : ''}${esc(text)}</span>`;
  },
  tag(text, tone = 'is-estimate') {
    return `<span class="tag ${esc(tone)}">${esc(text)}</span>`;
  },
  stat(value, label, suffix = '') {
    return `<div class="stat"><span class="stat-value">${esc(value)}${suffix ? `<small> ${esc(suffix)}</small>` : ''}</span><span class="stat-label">${esc(label)}</span></div>`;
  },
  stats(items) {
    return `<div class="stats">${items.map((item) => ui.stat(item.value, item.label, item.suffix || '')).join('')}</div>`;
  },
  statRows(items) {
    return items.map((item) => `<div class="stat-row"><span>${esc(item.label)}</span><b>${esc(item.value)}</b></div>`).join('');
  },
  metricBar({ label, value, displayValue, tone = 'is-recv', attrs = '', ariaLabel = '' }) {
    return `<button class="metric bar-row" type="button" ${attrs} aria-label="${esc(ariaLabel || label)}">
      <span class="metric-label bar-label">${esc(label)}</span>
      <span class="metric-track bar-track"><span class="metric-fill bar-fill ${esc(tone)}" data-metric-value="${esc(value)}"></span></span>
      <span class="metric-value bar-value">${esc(displayValue)}</span>
      <span class="metric-chevron bar-chevron">${icon('chevron')}</span>
    </button>`;
  },
  applyMetrics(root) {
    root.querySelectorAll('[data-metric-value]').forEach((element) => {
      const numeric = Number(element.getAttribute('data-metric-value'));
      const clamped = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
      element.style.setProperty('--metric-value', String(clamped));
    });
  },
  station({ name, detail, status, tone = 'is-ok', selected = false, linked = false, dimmed = false, attrs = '' }) {
    return `<button class="station plant-node${selected ? ' is-selected' : ''}${linked ? ' is-linked' : ''}${dimmed ? ' is-dimmed' : ''}" type="button" ${attrs} aria-pressed="${selected}">
      <span class="station-top plant-node-top"><span class="station-name plant-node-name">${esc(name)}</span>${ui.pill(status, tone)}</span>
      <span class="station-detail plant-node-detail">${esc(detail)}</span>
    </button>`;
  },
  connector(tone = '') {
    return `<div class="connector${tone ? ` ${esc(tone)}` : ''}" aria-hidden="true"><div class="connector-line"></div><span class="flow-dot"></span></div>`;
  },
  optionCard({ name, meaning, meta = [], assumes = '', recommended = false, chosen = false, selected = false, feasible = true, attrs = '', actionLabel = 'Preview impact', actionAttrs = '' }) {
    return `<article class="option-card${selected ? ' is-selected' : ''}${chosen ? ' is-chosen' : ''}${feasible ? '' : ' is-infeasible'}">
      <div class="option-top"><span class="option-name">${esc(name)}</span>${recommended ? '<span class="pill is-rec">Recommended</span>' : ''}${chosen ? ui.pill('Chosen', 'is-ok') : ''}</div>
      <p class="option-meaning">${esc(meaning)}</p>
      ${meta.length ? `<div class="meta-grid">${meta.map((cell) => `<span class="meta-cell"><span class="meta-label">${esc(cell.label)}</span><span class="meta-value">${esc(cell.value)}</span></span>`).join('')}</div>` : ''}
      <div class="option-footer">
        ${assumes ? `<span class="option-assump"><b>Assumes:</b> ${esc(assumes)}</span>` : ''}
        <button class="btn btn-ghost" type="button" ${actionAttrs} ${attrs}>${esc(actionLabel)}</button>
      </div>
    </article>`;
  },
  evidenceCard({ title, sub, attrs = '', linked = false }) {
    return `<button class="evidence evidence-card${linked ? ' is-linked' : ''}" type="button" ${attrs}>
      <span class="ev-main"><span class="ev-title">${esc(title)}</span><span class="ev-sub">${esc(sub)}</span></span>
      <span class="ev-chevron">${icon('chevron')}</span>
    </button>`;
  },
  agentRow(tagText, tagTone, html) {
    return `<div class="agent-row">${ui.tag(tagText, tagTone)}<span class="agent-text">${html}</span></div>`;
  },
  table({ columns = [], rows = [] }) {
    return `<table class="table"><thead><tr>${columns.map((col) => `<th${col.numeric ? ' class="is-num"' : ''}>${esc(col.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell, index) => `<td${columns[index] && columns[index].numeric ? ' class="is-num"' : ''}>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  },
  listRows(items) {
    return `<div class="list">${items.map((item) => `<div class="list-row"><span class="list-row-main">${item.html ? item.text : esc(item.text)}</span>${item.value ? `<b>${esc(item.value)}</b>` : ''}</div>`).join('')}</div>`;
  },
  stepList(items) {
    return `<ol class="step-list">${items.map((item, index) => `
      <li><button class="step-list-item${item.active ? ' is-active' : ''}${item.done ? ' is-done' : ''}" type="button" ${item.attrs || ''}>
        <span class="step-list-num">${item.done ? icon('check') : esc(String(index + 1))}</span>
        <span class="step-list-main"><span class="step-list-title">${esc(item.title)}</span>${item.sub ? `<span class="step-list-sub">${esc(item.sub)}</span>` : ''}</span>
        ${item.state ? ui.pill(item.state, item.tone || 'is-neutral') : ''}
      </button></li>`).join('')}</ol>`;
  },
  tabs(items, activeId) {
    return `<div class="tabs" role="tablist">${items.map((item) => `<button class="tab${item.id === activeId ? ' is-active' : ''}" type="button" role="tab" aria-selected="${item.id === activeId}" data-tab="${esc(item.id)}">${esc(item.label)}</button>`).join('')}</div>`;
  },
  field({ label, help = '', control }) {
    return `<label class="field"><span class="field-label">${esc(label)}</span>${control}${help ? `<span class="field-help">${esc(help)}</span>` : ''}</label>`;
  },
  emptyState({ title, text = '', actionLabel = '', actionAttrs = '', compact = false }) {
    return `<div class="empty-state${compact ? ' is-compact' : ''}">
      <span class="empty-title">${esc(title)}</span>
      ${text ? `<span class="empty-text">${esc(text)}</span>` : ''}
      ${actionLabel ? `<button class="btn btn-secondary btn-small" type="button" ${actionAttrs}>${esc(actionLabel)}</button>` : ''}
    </div>`;
  },
  skeletonCards(count) {
    return Array.from({ length: count }, () => '<span class="skeleton skeleton-card" aria-hidden="true"></span>').join('');
  },
  loadingRow(text) {
    return `<div class="loading-row"><span class="spinner" aria-hidden="true"></span><span>${esc(text)}</span></div>`;
  }
};

/* Shell */
function shellHtml() {
  return `
  <div class="shell">
    <header class="topbar">
      <div class="brand" aria-label="ForgeFront Factory Resilience">
        <div class="brand-mark">${icon('mark', true)}</div>
        <div class="brand-text">
          <span class="brand-name">ForgeFront</span>
          <span class="brand-sub">Factory Resilience</span>
        </div>
      </div>
      <button class="search-trigger" id="searchTrigger" type="button" aria-label="Open command bar">
        ${icon('search')}<span>Search or run a command</span><span class="kbd">Ctrl K</span>
      </button>
      <div class="top-actions">
        <div class="presence-wrap">
          <button class="presence-button" id="presenceButton" type="button" aria-expanded="false" aria-haspopup="dialog">
            <span class="agent-avatar">${icon('mark')}<span class="presence-dot" aria-hidden="true"></span></span>
            <span class="presence-text"><span class="presence-name">The Britt</span><span class="presence-status" id="agentTopStatus">Ready now</span></span>
          </button>
          <div class="presence-pop" id="presencePop" hidden role="dialog" aria-label="Who is active">
            <h2>The Britt is ready</h2>
            <p>The Britt uses Meta models to explain verified plant facts. The numbers always come from plant records, not from a guess.</p>
            <div class="presence-list">
              <div class="presence-row"><span class="mini-avatar">Op</span><span id="operatorRow">Signing in to the session</span></div>
              <div class="presence-row"><span class="mini-avatar">Pl</span><span id="presenceConnection">Plant records are being checked</span></div>
            </div>
          </div>
        </div>
        <button class="icon-button" id="resetButton" type="button" aria-label="Restore the opening state" title="Restore the opening state">${icon('reset')}</button>
      </div>
    </header>
    <div class="steps-bar">
      <nav class="steps" aria-label="Recovery steps" id="stepsNav"></nav>
    </div>
    <main class="screen-root" id="screenRoot" data-screen="incident"></main>
  </div>
  <div class="toast-region" id="toastRegion" aria-live="polite"></div>
  <dialog id="kitDialog"></dialog>
  <dialog id="paletteDialog" aria-label="Command bar"></dialog>`;
}

function syncShellState() {
  const presenceConnection = document.getElementById('presenceConnection');
  if (presenceConnection) {
    presenceConnection.textContent = state.connection === 'connected'
      ? 'Plant records connected'
      : state.connection === 'offline' ? 'Plant records could not be reached' : 'Plant records are being checked';
  }
  const operatorRow = document.getElementById('operatorRow');
  if (operatorRow && state.operator) {
    operatorRow.innerHTML = `<b>Signed in</b> · ${esc(state.operator.id || 'operator')}${state.operator.role ? ` · ${esc(state.operator.role)}` : ''}`;
  }
  renderSteps();
}

function renderSteps() {
  const nav = document.getElementById('stepsNav');
  if (!nav) return;
  const activeIndex = SCREEN_FLOW.findIndex((step) => step.id === state.currentScreen);
  nav.innerHTML = SCREEN_FLOW.map((step, index) => `
    <button class="step ${step.id === state.currentScreen ? 'is-active' : ''} ${index < activeIndex && state.visited.includes(step.id) ? 'is-complete' : ''}" type="button" data-step="${esc(step.id)}" ${step.id === state.currentScreen ? 'aria-current="page"' : ''}>
      <span class="step-num">${index + 1}</span><span class="step-label">${esc(step.label)}</span>
      ${step.id === state.currentScreen ? '<span class="step-state">Now</span>' : ''}
    </button>`).join('');
  nav.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.step));
  });
}

function setAgentStatus(text) {
  const element = document.getElementById('agentTopStatus');
  if (element) element.textContent = text;
}

function setPageCommands(commands) {
  state.pageCommands = Array.isArray(commands) ? commands : [];
}
function clearPageCommands() {
  state.pageCommands = [];
}

/* Router: hash "#screen=<id>", incident by default. Loading a missing screen
   file is a designed empty state, never an uncaught error. */
let currentCleanup = null;
let routeSerial = 0;

function parseRoute() {
  const hash = window.location.hash || '';
  const match = hash.match(/screen=([a-z0-9-]+)/i);
  const id = match ? match[1].toLowerCase() : 'incident';
  return SCREEN_FLOW.some((step) => step.id === id) ? id : 'incident';
}

function go(id) {
  if (!SCREEN_FLOW.some((step) => step.id === id)) return;
  const target = `#screen=${id}`;
  if (window.location.hash === target) {
    route();
  } else {
    window.location.hash = target;
  }
}

function loadScreenCss(id) {
  document.querySelectorAll('link[data-screen-css]').forEach((link) => link.remove());
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/ui/screen-${id}.css`;
    link.setAttribute('data-screen-css', id);
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    link.addEventListener('load', done);
    link.addEventListener('error', () => { link.remove(); done(); });
    window.setTimeout(done, 1500);
    document.head.appendChild(link);
  });
}

async function route() {
  const serial = ++routeSerial;
  const id = parseRoute();
  const root = document.getElementById('screenRoot');
  if (!root) return;
  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch { /* a leaving screen must not block navigation */ }
    currentCleanup = null;
  }
  clearPageCommands();
  state.currentScreen = id;
  if (!state.visited.includes(id)) state.visited.push(id);
  root.setAttribute('data-screen', id);
  const step = SCREEN_FLOW.find((entry) => entry.id === id);
  document.title = `ForgeFront Factory Resilience — ${step ? step.label : 'Incident'}`;
  renderSteps();
  root.innerHTML = ui.panel({
    title: step ? step.label : 'Loading',
    body: ui.loadingRow('Loading this step from the current plant snapshot.')
  });
  await loadScreenCss(id);
  if (serial !== routeSerial) return;
  let cleanup = null;
  try {
    const module = await import(`/ui/screen-${id}.mjs`);
    if (serial !== routeSerial) return;
    if (!module || typeof module.render !== 'function') throw new Error('Screen module has no render function');
    cleanup = await module.render(root, kit);
  } catch (error) {
    if (serial !== routeSerial) return;
    root.innerHTML = ui.panel({
      title: `${step ? step.label : 'This step'} is not loaded`,
      body: `
        ${ui.emptyState({
          title: 'This screen file was not found in this build',
          text: 'The step stays in the flow above. You can try loading it again, or return to the incident and keep working from verified records.',
          actionLabel: 'Try again',
          actionAttrs: 'data-missing-retry'
        })}
        <div class="row">
          <button class="btn btn-secondary btn-small" type="button" data-missing-back>Back to incident</button>
        </div>`
    });
    const retryButton = root.querySelector('[data-missing-retry]');
    if (retryButton) retryButton.addEventListener('click', () => route());
    const backButton = root.querySelector('[data-missing-back]');
    if (backButton) backButton.addEventListener('click', () => go('incident'));
    return;
  }
  if (typeof cleanup === 'function') currentCleanup = cleanup;
  else if (cleanup && typeof cleanup.cleanup === 'function') currentCleanup = cleanup.cleanup;
}

/* Command palette: navigate, act and search in one surface. */
function paletteCommands() {
  const navigation = SCREEN_FLOW.map((step, index) => ({
    title: `Open ${step.label}`,
    hint: `Step ${index + 1} of ${SCREEN_FLOW.length} in the recovery flow`,
    run: () => go(step.id)
  }));
  const global = [
    { title: 'Check plant records again', hint: 'Reload the scenario, snapshot, plant and analysis', run: async () => { const result = await refreshData(); if (result.ok) toast('Plant records are up to date', { text: 'Every number on screen comes from the newest snapshot.' }); } },
    { title: 'Open the full plant view', hint: 'Departments, machines and waiting orders', run: () => go('shop') },
    { title: 'Restore the opening state', hint: 'Return the incident to its opening state', run: resetDemo }
  ];
  return [...state.pageCommands, ...navigation, ...global];
}
function renderPalette(filterText = '') {
  const dialog = document.getElementById('paletteDialog');
  if (!dialog) return;
  const query = filterText.trim().toLowerCase();
  const commands = paletteCommands().filter((command) => !query || `${command.title} ${command.hint}`.toLowerCase().includes(query));
  dialog.innerHTML = `
    <div class="palette-card">
      <div class="palette-input-row">${icon('search')}<input class="palette-input" id="paletteInput" type="text" aria-label="Search or run a command" autocomplete="off"><span class="kbd">Esc</span></div>
      <div class="palette-list">
        ${commands.length ? commands.map((command, index) => `
          <button class="palette-item ${index === 0 ? 'is-first' : ''}" type="button" data-command-index="${paletteCommands().indexOf(command)}">
            <span class="palette-item-main"><span class="palette-item-title">${esc(command.title)}</span><span class="palette-item-hint">${esc(command.hint)}</span></span>${icon('arrow')}
          </button>`).join('') : `<div class="palette-item"><span class="palette-item-main"><span class="palette-item-title">No matching command</span><span class="palette-item-hint">Try a step name, evidence, or plant records.</span></span></div>`}
      </div>
    </div>`;
  const input = dialog.querySelector('#paletteInput');
  input.value = filterText;
  input.addEventListener('input', () => renderPalette(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && commands[0]) {
      dialog.close();
      commands[0].run();
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const first = dialog.querySelector('.palette-item[data-command-index]');
      if (first) first.focus();
    }
  });
  dialog.querySelectorAll('[data-command-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const command = paletteCommands()[Number(button.dataset.commandIndex)];
      dialog.close();
      if (command) command.run();
    });
  });
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
function openPalette() {
  const dialog = document.getElementById('paletteDialog');
  if (!dialog) return;
  renderPalette('');
  if (!dialog.open) dialog.showModal();
}

async function resetDemo() {
  try {
    await api.resetDemo();
    state.scenario = null;
    state.workflow = null;
    state.analysis = null;
    state.plant = null;
    await refreshData({ notifyOnError: false });
    toast('Opening state restored', { text: 'The incident is back to its opening state.' });
    if (state.currentScreen !== 'incident') go('incident');
    else route();
  } catch {
    toast('The opening state could not be restored', {
      text: 'The plant records have not changed.',
      actionLabel: 'Retry',
      onAction: resetDemo
    });
  }
}

function bindShell() {
  renderSteps();
  syncShellState();
  document.getElementById('searchTrigger').addEventListener('click', openPalette);
  document.getElementById('resetButton').addEventListener('click', resetDemo);
  const pop = document.getElementById('presencePop');
  const presenceButton = document.getElementById('presenceButton');
  presenceButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const nextHidden = !pop.hidden;
    pop.hidden = nextHidden;
    presenceButton.setAttribute('aria-expanded', String(!nextHidden));
  });
  document.addEventListener('click', (event) => {
    if (!pop.hidden && !event.target.closest('.presence-wrap')) {
      pop.hidden = true;
      presenceButton.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openPalette();
    }
    if (event.key === 'Escape' && !pop.hidden) {
      pop.hidden = true;
      presenceButton.setAttribute('aria-expanded', 'false');
    }
  });
  window.addEventListener('hashchange', route);
}

export const kit = {
  SCREEN_FLOW,
  state,
  api,
  ui,
  esc,
  clone,
  fmtInt,
  fmtHours,
  fmtMoney,
  friendlyName,
  prefersReduced,
  go,
  route,
  refreshData,
  loadTools,
  ensureSession,
  subscribe,
  toast,
  openDialog,
  closeDialog,
  openAuthorize,
  detailRowsHtml,
  setAgentStatus,
  setConnection,
  setPageCommands,
  clearPageCommands,
  resetDemo,
  openPalette,
  nextId(id) {
    const index = SCREEN_FLOW.findIndex((step) => step.id === id);
    return index >= 0 && index < SCREEN_FLOW.length - 1 ? SCREEN_FLOW[index + 1].id : null;
  },
  async advance(fromId) {
    const next = kit.nextId(fromId);
    if (next) go(next);
    return next;
  }
};

function init() {
  appRoot.innerHTML = shellHtml();
  bindShell();
  route();
  ensureSession().then(() => notify()).catch(() => setConnection('offline'));
}

try {
  init();
} catch (error) {
  window.__errs.push(String(error && error.message ? error.message : error));
  appRoot.innerHTML = '<main class="screen-root" data-screen="incident"><section class="panel"><h1 class="page-title">The screen could not be drawn</h1><p class="page-sub">Please reload the page. The plant records have not been changed.</p></section></main>';
}