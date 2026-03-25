import { LayoutResult, Widget } from './model';

type DemoUI = {
  update: (result: LayoutResult, width: number, height: number) => void;
};

type AppState = {
  theme: 'light' | 'dark';
  query: string;
};

const state: AppState = {
  theme: 'light',
  query: '',
};

function ensureChild(parent: HTMLElement, selector: string, className: string, tag = 'div'): HTMLElement {
  const found = parent.querySelector<HTMLElement>(selector);
  if (found) {
    return found;
  }

  const element = document.createElement(tag);
  element.className = className;
  parent.appendChild(element);
  return element;
}

function setBaseClasses(element: HTMLElement, widget: Widget): void {
  element.className = `widget widget--${widget.kind}`;

  const compactIds = new Set(['title', 'search', 'filter', 'export', 'share']);
  const controlIds = new Set(['ctrlA', 'ctrlB', 'ctrlC']);
  const actionIds = new Set(['filter', 'export', 'share']);

  if (compactIds.has(widget.id)) {
    element.classList.add('widget--compact');
  }

  if (controlIds.has(widget.id)) {
    element.classList.add('widget--control-card');
  }

  if (actionIds.has(widget.id)) {
    element.classList.add('widget--action');
  }

  if (widget.computed.width < 150) {
    element.classList.add('widget--narrow');
  }
}

function matchesQuery(text: string): boolean {
  if (!state.query.trim()) {
    return true;
  }

  return text.toLowerCase().includes(state.query.trim().toLowerCase());
}

function renderCompactWidget(widget: Widget, element: HTMLElement): void {
  if (widget.id === 'title') {
    const subtitle =
      widget.computed.width < 240
        ? 'Adaptive arrangements'
        : 'One specification, many possible arrangements';

    element.innerHTML = `
      <div class="widget__compactTitle">Adaptive Editor</div>
      <div class="widget__compactSub">${subtitle}</div>
    `;
    return;
  }

  if (widget.id === 'search') {
  const placeholder =
    widget.computed.width < 230
      ? 'Search...'
      : widget.computed.width < 300
        ? 'Search tools...'
        : 'Search panels, tools, layers...';

  element.innerHTML = `
    <div class="widget__compactTitle">Search</div>
    <div class="search-box-shell">
      <span class="search-icon">⌕</span>
      <input
        id="demo-search-input"
        class="search-input"
        type="text"
        placeholder="${placeholder}"
        value="${state.query.replace(/"/g, '&quot;')}"
      />
    </div>
  `;
  return;
}

  if (widget.id === 'filter') {
  element.innerHTML = `<div class="widget__actionLabel">Filter</div>`;
  return;
}

  if (widget.id === 'export') {
  element.innerHTML = `<div class="widget__actionLabel">Export</div>`;
  return;
}

  if (widget.id === 'share') {
  element.innerHTML = `<div class="widget__actionLabel">Share</div>`;
  return;
}
}

function renderStandardWidget(widget: Widget, element: HTMLElement): void {
  const title = ensureChild(element, '.widget__title', 'widget__title');
  const body = ensureChild(element, '.widget__body', 'widget__body');

  if (widget.id === 'content') {
    const fullText =
      'Resizable work area. This panel should stay dominant and receive most of the free space.';
    const shortText = 'Resizable work area that stays dominant.';
    const show = matchesQuery('main content editor canvas workspace');

    title.textContent = 'Main content';
    body.textContent = widget.computed.width < 520 ? shortText : fullText;

    element.classList.toggle('widget--muted', !show);
    return;
  }

  if (widget.id === 'sidebar') {
    const fullText =
      'Adaptive panel. It moves right or below depending on the chosen OR-constraint branch.';
    const shortText = 'Adaptive panel that moves right or below.';
    const show = matchesQuery('controls panel sidebar settings layers contrast brightness');

    title.textContent = 'Controls panel';
    body.textContent = widget.computed.width < 320 ? shortText : fullText;

    element.classList.toggle('widget--muted', !show);
    return;
  }

  if (widget.id === 'ctrlA') {
    title.textContent = 'Brightness';
    body.textContent = 'Auto';
    element.classList.toggle('widget--muted', !matchesQuery('brightness auto control'));
    return;
  }

  if (widget.id === 'ctrlB') {
    title.textContent = 'Contrast';
    body.textContent = 'Medium';
    element.classList.toggle('widget--muted', !matchesQuery('contrast medium control'));
    return;
  }

  if (widget.id === 'ctrlC') {
    title.textContent = 'Layers';
    body.textContent = widget.computed.width < 120 ? '4' : '4 layers';
    element.classList.toggle('widget--muted', !matchesQuery('layers layer stack control'));
    return;
  }

  if (widget.id === 'footer') {
    title.textContent = 'Status footer';

    if (state.query.trim()) {
      body.textContent = `Search active: "${state.query}"`;
    } else {
      body.textContent =
        widget.computed.width < 500
          ? 'Resize to trigger a new layout.'
          : 'Resize the window to trigger a new layout solution.';
    }

    return;
  }
}

function bindInteractiveControls(onStateChange: () => void): void {
  const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
  const searchInput = document.querySelector<HTMLInputElement>('#demo-search-input');
  const clearSearch = document.querySelector<HTMLButtonElement>('#clear-search');
  const filterButton = document.querySelector<HTMLButtonElement>('#fake-filter-toggle');

  if (themeToggle) {
    themeToggle.onclick = () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = state.theme;
      themeToggle.textContent = state.theme === 'light' ? '🌙 Dark' : '☀ Light';
    };
  }

  if (searchInput) {
    searchInput.oninput = () => {
      state.query = searchInput.value;
      onStateChange();
    };
  }

  if (clearSearch) {
    clearSearch.onclick = () => {
      state.query = '';
      onStateChange();
    };
  }

  if (filterButton) {
    filterButton.onclick = () => {
      const next = state.query.trim() ? '' : 'layers';
      state.query = next;
      onStateChange();
    };
  }
}

function renderWidget(widget: Widget, host: HTMLElement): void {
  const element = ensureChild(host, `[data-widget-id="${widget.id}"]`, `widget widget--${widget.kind}`);
  element.dataset.widgetId = widget.id;
  element.style.left = `${widget.computed.x}px`;
  element.style.top = `${widget.computed.y}px`;
  element.style.width = `${widget.computed.width}px`;
  element.style.height = `${widget.computed.height}px`;

  setBaseClasses(element, widget);

  if (element.classList.contains('widget--compact')) {
    renderCompactWidget(widget, element);
  } else {
    element.innerHTML = '';
    renderStandardWidget(widget, element);
  }
}

export function renderApp(app: HTMLElement): DemoUI {
  let lastResult: LayoutResult | null = null;
  let lastWidth = 0;
  let lastHeight = 0;

  function rerender(): void {
    if (!lastResult) {
      return;
    }
    ui.update(lastResult, lastWidth, lastHeight);
  }

  app.innerHTML = `
    <div class="topbar">
      <div class="topbar__title">
        <strong>ORC Layout Prototype</strong>
        <span>Adaptive GUI with OR-constraints</span>
      </div>

      <div class="topbar__actions">
        <button id="theme-toggle" class="topbar-btn">🌙 Dark</button>
        <button id="fake-filter-toggle" class="topbar-btn">Quick filter</button>
        <button id="clear-search" class="topbar-btn">Clear search</button>
      </div>
    </div>

    <div class="page">
      <aside class="sidebar-info">
        <h1>ORC Layout Prototype</h1>
        <p>
          A student-level replication of the core OR-constraint idea:
          one layout specification, multiple alternative arrangements, runtime selection.
        </p>

        <div class="badge-list">
          <span class="badge">TypeScript</span>
          <span class="badge">Vanilla DOM</span>
          <span class="badge">Penalty-based selection</span>
        </div>

        <div class="panel">
          <h2>Selected alternatives</h2>
          <div id="choices"></div>
          <div class="or-badge-row" id="or-badges"></div>
        </div>

        <div class="panel">
          <h2>Solver status</h2>
          <div id="solver-meta"></div>
        </div>

        <div class="panel">
          <h2>How to demo</h2>
          <p>Resize the browser from wide to medium to narrow widths.</p>
          <p>Watch the toolbar wrap, the sidebar move below, and the control cards switch orientation.</p>
          <div class="resize-hint">Tip: use the theme toggle and search field during the demo to make the prototype feel interactive.</div>
        </div>
      </aside>

      <main class="demo-shell">
        <div class="demo-stage">
          <div id="demo-container" class="demo-container"></div>
        </div>
      </main>
    </div>
  `;

  const container = app.querySelector<HTMLElement>('#demo-container');
  const choices = app.querySelector<HTMLElement>('#choices');
  const solverMeta = app.querySelector<HTMLElement>('#solver-meta');
  const orBadges = app.querySelector<HTMLElement>('#or-badges');

  if (!container || !choices || !solverMeta || !orBadges) {
    throw new Error('Renderer could not initialize required DOM nodes.');
  }

  const ui: DemoUI = {
    update(result, width, height) {
      lastResult = result;
      lastWidth = width;
      lastHeight = height;

      container.style.width = `${width}px`;
      container.style.height = `${height}px`;

      for (const widget of Object.values(result.widgets)) {
        renderWidget(widget, container);
      }

      choices.innerHTML = `
        <div class="choice-row"><strong>Toolbar:</strong> ${result.choice.toolbarMode}</div>
        <div class="choice-row"><strong>Sidebar:</strong> ${result.choice.sidebarMode}</div>
        <div class="choice-row"><strong>Controls:</strong> ${result.choice.controlsMode}</div>
      `;

      orBadges.innerHTML = `
        <span class="or-badge">toolbar:${result.choice.toolbarMode}</span>
        <span class="or-badge">sidebar:${result.choice.sidebarMode}</span>
        <span class="or-badge">controls:${result.choice.controlsMode}</span>
        <span class="or-badge">${state.theme}</span>
      `;

      solverMeta.innerHTML = `
        <div class="choice-row"><strong>Container:</strong> ${Math.round(width)} × ${Math.round(height)}</div>
        <div class="choice-row"><strong>Candidate score:</strong> ${result.score.toFixed(1)}</div>
        <div class="choice-row"><strong>Search space:</strong> 8 OR-combinations</div>
        <div class="choice-row"><strong>Theme:</strong> ${state.theme}</div>
        <div class="choice-row"><strong>Search query:</strong> ${state.query || '—'}</div>
        <div class="choice-row"><strong>Debug:</strong> ${result.debug.join(' • ')}</div>
      `;

      bindInteractiveControls(rerender);
    },
  };

  document.documentElement.dataset.theme = state.theme;
  return ui;
}