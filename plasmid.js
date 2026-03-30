(function () {
  'use strict';

  // --- Cached DOM elements (queried once, reused everywhere) ---
  const $ = id => document.getElementById(id);
  const $svg = $('plasmid-svg');
  const $linearSvg = $('linear-svg');
  const $mapContainer = $('map-container');
  const $panel = $('panel');
  const $plasmidName = $('plasmid-name');
  const $seqLength = $('seq-length');
  const $seqInput = $('seq-input');
  const $featureList = $('feature-list');
  const $markerList = $('marker-list');
  const $radiusSlider = $('radius-slider');
  const $radiusNum = $('radius-num');
  const $rotationSlider = $('rotation-slider');
  const $rotationNum = $('rotation-num');
  const $toolbarBp = $('toolbar-bp');
  const $fetchBtn = $('fetch-accession-btn');
  // Backbone config elements
  const $bbFill = $('bb-fill'), $bbEdge = $('bb-edge'), $bbWidth = $('bb-width');
  const $bbEdgeWidth = $('bb-edge-width'), $bbOpacity = $('bb-opacity');
  // Ring config elements
  const $ringFill = $('ring-fill'), $ringEdge = $('ring-edge');
  const $ringEdgeWidth = $('ring-edge-width'), $ringOpacity = $('ring-opacity');
  // Tick config elements
  const $tickMajorShow = $('tick-major-show'), $tickMajorLabels = $('tick-major-labels');
  const $tickMajorInterval = $('tick-major-interval'), $tickMajorLen = $('tick-major-len');
  const $tickMajorWidth = $('tick-major-width'), $tickMajorColor = $('tick-major-color');
  const $tickMajorDirection = $('tick-major-direction');
  const $tickMinorShow = $('tick-minor-show'), $tickMinorLabels = $('tick-minor-labels');
  const $tickMinorInterval = $('tick-minor-interval'), $tickMinorLen = $('tick-minor-len');
  const $tickMinorWidth = $('tick-minor-width'), $tickMinorColor = $('tick-minor-color'), $tickMinorLabelColor = $('tick-minor-label-color');
  const $tickMinorDirection = $('tick-minor-direction');
  const $tickLabelSize = $('tick-label-size'), $tickLabelColor = $('tick-label-color'), $tickLabelFormat = $('tick-label-format');
  // GC track
  const $gcShow = $('gc-show');
  // Center edit popover
  const $cepName = $('cep-name'), $cepNameFont = $('cep-name-font'), $cepLenFont = $('cep-len-font');

  // Preset colors sorted by hue: reds → oranges → yellows → greens → blues → purples → neutrals
  const COLOR_MAP = [
    { hex: '#dc2626', name: 'Red' },
    { hex: '#ea580c', name: 'Orange' },
    { hex: '#ca8a04', name: 'Amber' },
    { hex: '#16a34a', name: 'Green' },
    { hex: '#0891b2', name: 'Cyan' },
    { hex: '#2563eb', name: 'Blue' },
    { hex: '#4f46e5', name: 'Indigo' },
    { hex: '#9333ea', name: 'Purple' },
    { hex: '#db2777', name: 'Pink' },
    { hex: '#64748b', name: 'Slate' },
    { hex: '#000000', name: 'Black' },
  ];
  const COLORS = COLOR_MAP.map(c => c.hex);
  const COLOR_NAMES = {};
  COLOR_MAP.forEach(c => { COLOR_NAMES[c.hex.toLowerCase()] = c.name; });



  // --- Theme color palettes ---
  const COLOR_THEMES = {
    'Molecular': ['#2563eb','#16a34a','#ea580c','#db2777','#9333ea','#dc2626','#ca8a04','#0891b2','#64748b','#4f46e5','#059669','#be185d'],
    'Pastel':    ['#93c5fd','#86efac','#fdba74','#f9a8d4','#c4b5fd','#fca5a5','#fde68a','#67e8f9','#cbd5e1','#a5b4fc','#a7f3d0','#fbcfe8'],
    'Vivid':     ['#3b82f6','#22c55e','#f97316','#ec4899','#a855f7','#ef4444','#eab308','#06b6d4','#6366f1','#14b8a6','#f43f5e','#84cc16'],
    'Earth':     ['#92400e','#166534','#9a3412','#831843','#581c87','#991b1b','#854d0e','#155e75','#334155','#3730a3','#78716c','#a16207'],
    'Neutral':   ['#1e293b','#334155','#475569','#64748b','#94a3b8','#cbd5e1','#e2e8f0','#f1f5f9','#000000','#ffffff','#78716c','#a8a29e'],
    'Colorblind':['#0072b2','#e69f00','#009e73','#cc79a7','#56b4e9','#d55e00','#f0e442','#000000','#332288','#88ccee','#44aa99','#ddcc77'],
    'Ocean':     ['#0c4a6e','#0369a1','#0284c7','#0ea5e9','#38bdf8','#7dd3fc','#155e75','#164e63','#134e4a','#115e59','#0d9488','#5eead4'],
  };

  let recentColors = JSON.parse(localStorage.getItem('plasmidStudio_recentColors') || '[]');
  const MAX_RECENT = 12;

  function addRecentColor(hex) {
    hex = hex.toLowerCase();
    recentColors = recentColors.filter(c => c !== hex);
    recentColors.unshift(hex);
    if (recentColors.length > MAX_RECENT) recentColors.pop();
    try { localStorage.setItem('plasmidStudio_recentColors', JSON.stringify(recentColors)); } catch(e) {}
  }

  function getUsedColors() {
    const set = new Set();
    features.forEach(f => { set.add(f.color); if (f.borderColor) set.add(f.borderColor); if (f.labelColor) set.add(f.labelColor); });
    markers.forEach(m => { set.add(m.color); if (m.outerColor) set.add(m.outerColor); if (m.innerColor) set.add(m.innerColor); });
    set.add(bbCfg.fill); set.add(bbCfg.edge);
    return [...set].filter(Boolean);
  }

  // --- Custom color picker popover ---
  let _cpPopover = null;
  let _cpTarget = null;
  let _cpCallback = null;

  function createColorPickerPopover() {
    if (_cpPopover) return _cpPopover;
    const div = document.createElement('div');
    div.id = 'color-picker-popover';
    div.innerHTML = `
      <div class="cp-tabs">
        <button class="active" data-cp-tab="theme">Themes</button>
        <button data-cp-tab="used">Used</button>
        <button data-cp-tab="recent">Recent</button>
        <button data-cp-tab="custom">Custom</button>
      </div>
      <div class="cp-divider"></div>
      <div class="cp-pane active" id="cp-theme"></div>
      <div class="cp-pane" id="cp-used"></div>
      <div class="cp-pane" id="cp-recent"></div>
      <div class="cp-pane" id="cp-custom">
        <label class="cp-custom-label">Pick any color</label>
        <div class="cp-custom-row">
          <input type="color" id="cp-native" value="#6366f1">
          <button class="cp-apply-btn" id="cp-apply-native">Apply</button>
        </div>
        ${window.EyeDropper ? '<button class="cp-eyedropper-btn" id="cp-eyedropper"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9"/><path d="m12 8 4 4"/></svg> Pick from screen</button>' : ''}
      </div>
    `;
    document.body.appendChild(div);

    // Tab switching
    div.querySelectorAll('.cp-tabs button').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        div.querySelectorAll('.cp-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        div.querySelectorAll('.cp-pane').forEach(p => p.classList.remove('active'));
        div.querySelector('#cp-' + btn.dataset.cpTab).classList.add('active');
      });
    });

    // Apply native color
    div.querySelector('#cp-apply-native').addEventListener('click', e => {
      e.stopPropagation();
      const color = div.querySelector('#cp-native').value;
      selectColor(color);
    });

    const _cpEyeBtn = div.querySelector('#cp-eyedropper');
    if (_cpEyeBtn) {
      _cpEyeBtn.addEventListener('click', async e => {
        e.stopPropagation();
        try {
          const dropper = new EyeDropper();
          const result = await dropper.open();
          const color = result.sRGBHex.toLowerCase();
          div.querySelector('#cp-native').value = color;
          selectColor(color);
        } catch(err) {}
      });
    }

    div.addEventListener('click', e => e.stopPropagation());

    _cpPopover = div;
    return div;
  }

  function selectColor(hex) {
    hex = hex.toLowerCase();
    addRecentColor(hex);
    if (_cpTarget) {
      _cpTarget.value = hex;
      _cpTarget.dispatchEvent(new Event('input', { bubbles: true }));
      _cpTarget.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (_cpCallback) _cpCallback(hex);
    closeColorPicker();
  }

  function buildSwatchGrid(colors, container) {
    container.innerHTML = '';
    if (colors.length === 0) {
      container.innerHTML = '<div class="cp-empty">No colors yet</div>';
      return;
    }
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cp-swatch';
      sw.style.background = c;
      sw.title = c;
      if (_cpTarget && _cpTarget.value.toLowerCase() === c.toLowerCase()) sw.classList.add('active');
      sw.addEventListener('click', e => { e.stopPropagation(); selectColor(c); });
      container.appendChild(sw);
    });
  }

  function openColorPicker(targetInput, callback) {
    clearTimeout(_cpCloseTimer);
    const pop = createColorPickerPopover();
    _cpTarget = targetInput;
    _cpCallback = callback || null;

    // Populate theme tab
    const themePane = pop.querySelector('#cp-theme');
    themePane.innerHTML = '';
    Object.entries(COLOR_THEMES).forEach(([name, colors]) => {
      const group = document.createElement('div');
      group.className = 'cp-theme-group';
      const nameDiv = document.createElement('div');
      nameDiv.className = 'cp-theme-name';
      nameDiv.textContent = name;
      const grid = document.createElement('div');
      grid.className = 'cp-theme-swatches';
      group.append(nameDiv, grid);
      colors.forEach(c => {
        const sw = document.createElement('div');
        sw.className = 'cp-swatch';
        sw.style.background = c;
        sw.title = c;
        if (targetInput && targetInput.value.toLowerCase() === c.toLowerCase()) sw.classList.add('active');
        sw.addEventListener('click', e => { e.stopPropagation(); selectColor(c); });
        grid.appendChild(sw);
      });
      themePane.appendChild(group);
    });

    // Populate used tab
    buildSwatchGrid(getUsedColors(), pop.querySelector('#cp-used'));

    // Populate recent tab
    buildSwatchGrid(recentColors, pop.querySelector('#cp-recent'));

    // Set native picker to current value
    if (targetInput) pop.querySelector('#cp-native').value = targetInput.value;

    // Reset to theme tab
    pop.querySelectorAll('.cp-tabs button').forEach(b => b.classList.remove('active'));
    pop.querySelector('[data-cp-tab="theme"]').classList.add('active');
    pop.querySelectorAll('.cp-pane').forEach(p => p.classList.remove('active'));
    pop.querySelector('#cp-theme').classList.add('active');

    // Position near the target input
    const rect = targetInput.getBoundingClientRect();
    pop.style.display = 'block';
    const popW = 260, popH = pop.offsetHeight || 300;
    let left = rect.left + rect.width / 2 - popW / 2;
    let top = rect.bottom + 6;
    if (top + popH > window.innerHeight - 10) top = rect.top - popH - 6;
    if (left < 10) left = 10;
    if (left + popW > window.innerWidth - 10) left = window.innerWidth - popW - 10;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    requestAnimationFrame(() => pop.classList.add('open'));
  }

  let _cpCloseTimer = 0;
  function closeColorPicker() {
    if (_cpPopover) {
      _cpPopover.classList.remove('open');
      clearTimeout(_cpCloseTimer);
      _cpCloseTimer = setTimeout(() => { if (_cpPopover) _cpPopover.style.display = 'none'; }, 150);
    }
    _cpTarget = null;
    _cpCallback = null;
  }

  // Close on outside click
  document.addEventListener('click', e => {
    if (_cpPopover && _cpPopover.classList.contains('open') && !_cpPopover.contains(e.target)) {
      closeColorPicker();
    }
  });

  // Intercept all color inputs
  document.addEventListener('click', e => {
    const input = e.target.closest('input[type="color"]');
    if (!input) return;
    if (input.id === 'cp-native' || input.dataset.native) return; // don't intercept native pickers
    e.preventDefault();
    e.stopPropagation();
    openColorPicker(input);
  }, true);
  const TYPE_DEFAULTS = { gene:'#16a34a', promoter:'#ea580c', terminator:'#dc2626', origin:'#2563eb', resistance:'#db2777', regulatory:'#8b5cf6', primer:'#0891b2', misc:'#64748b' };
  // Unified map from GenBank/SnapGene feature keys to internal type names
  const FEATURE_TYPE_MAP = {
    CDS: 'gene', gene: 'gene', mRNA: 'gene',
    promoter: 'promoter', terminator: 'terminator',
    rep_origin: 'origin', ori: 'origin',
    misc_feature: 'misc', misc_binding: 'misc',
    protein_bind: 'misc',
    primer_bind: 'primer',
    regulatory: 'regulatory', enhancer: 'regulatory',
  };
  // Inline SVG icons for feature types (12x12, used in sidebar list)
  const TYPE_ICONS = {
    gene:       '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 8,6 8,3 11,6 8,9 8,6"/></svg>',
    promoter:   '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10V4"/><path d="M2 4h5l2-2"/></svg>',
    terminator: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="10"/><line x1="3" y1="3" x2="9" y2="3"/></svg>',
    origin:     '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="4"/><circle cx="6" cy="6" r="1.5"/></svg>',
    resistance: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l6 6M9 3l-6 6"/><circle cx="6" cy="6" r="4"/></svg>',
    regulatory: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9V5a4 4 0 0 1 8 0"/><circle cx="6" cy="5" r="1.2"/></svg>',
    primer:     '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8l3-3 4 4"/><path d="M9 4l-2 2"/></svg>',
    misc:       '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="8" height="8" rx="2"/></svg>',
  };
  const SVG_SIZE = 900;
  const cx = SVG_SIZE / 2, cy = SVG_SIZE / 2;
  let R = 220;
  let trackW = 28;
  let mapRotation = 0; // degrees, clockwise

  let bbCfg = {
    fill: '#e2e8f0',
    edge: '#cbd5e1',
    edgeWidth: 1,
    opacity: 1,
  };

  // Per-ring styles (keyed by track index string, e.g. "1", "-1")
  // Missing keys fall back to backbone style with reduced opacity
  let ringStyles = {};

  function getRingStyle(trackIdx) {
    const key = String(trackIdx);
    if (ringStyles[key]) return ringStyles[key];
    // Default: inherit from backbone with lower opacity
    return { fill: bbCfg.fill, edge: bbCfg.edge, edgeWidth: bbCfg.edgeWidth, opacity: bbCfg.opacity * 0.4 };
  }

  function setRingStyle(trackIdx, style) {
    ringStyles[String(trackIdx)] = style;
  }

  const FONTS = ['sans-serif', 'serif', 'monospace', 'Arial', 'Georgia', 'Courier New', 'Helvetica', 'Times New Roman'];

  // Replace a <select> with a custom font picker that previews each font
  function fontPicker(selectEl) {
    if (!selectEl) return;
    const ac = new AbortController();
    const wrap = document.createElement('div');
    wrap.className = 'font-picker';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'font-picker-trigger';

    const dropdown = document.createElement('div');
    dropdown.className = 'font-picker-dropdown';

    let currentValue = selectEl.value || 'sans-serif';

    function setTriggerText(val) {
      trigger.textContent = val;
      trigger.style.fontFamily = val;
    }

    function buildOptions() {
      dropdown.innerHTML = '';
      FONTS.forEach(fn => {
        const opt = document.createElement('div');
        opt.className = 'font-picker-option' + (fn === currentValue ? ' selected' : '');
        opt.textContent = fn;
        opt.style.fontFamily = fn;
        opt.addEventListener('click', e => {
          e.stopPropagation();
          currentValue = fn;
          selectEl.value = fn;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          setTriggerText(fn);
          dropdown.classList.remove('open');
          dropdown.querySelectorAll('.font-picker-option').forEach(o =>
            o.classList.toggle('selected', o.textContent === fn)
          );
        });
        dropdown.appendChild(opt);
      });
    }

    setTriggerText(currentValue);
    buildOptions();

    function positionDropdown() {
      const r = trigger.getBoundingClientRect();
      dropdown.style.left = r.left + 'px';
      dropdown.style.width = r.width + 'px';
      // Show below if room, above if not
      const below = window.innerHeight - r.bottom;
      if (below >= 210 || below >= r.top) {
        dropdown.style.top = r.bottom + 4 + 'px';
        dropdown.style.bottom = '';
      } else {
        dropdown.style.bottom = (window.innerHeight - r.top + 4) + 'px';
        dropdown.style.top = '';
      }
    }

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      // Close any other open font picker dropdowns
      document.querySelectorAll('.font-picker-dropdown.open').forEach(dd => {
        if (dd !== dropdown) dd.classList.remove('open');
      });
      const opening = !dropdown.classList.contains('open');
      dropdown.classList.toggle('open');
      if (opening) {
        currentValue = selectEl.value || 'sans-serif';
        dropdown.querySelectorAll('.font-picker-option').forEach(o =>
          o.classList.toggle('selected', o.textContent === currentValue)
        );
        positionDropdown();
      }
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('open');
    }, { signal: ac.signal });
    // Close on scroll so dropdown doesn't detach from trigger (but not when scrolling inside the dropdown itself)
    window.addEventListener('scroll', e => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    }, { capture: true, signal: ac.signal });

    selectEl.style.display = 'none';
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(trigger);
    wrap.appendChild(selectEl); // keep select in DOM for value reads
    dropdown.dataset.fontPickerFor = selectEl.id || '';
    document.body.appendChild(dropdown); // append to body to avoid overflow clipping

    // Remove dropdown when wrapper is detached
    wrap._cleanup = () => { ac.abort(); dropdown.remove(); };

    // Expose a refresh method for when the select value changes programmatically
    wrap._refresh = () => {
      currentValue = selectEl.value || 'sans-serif';
      setTriggerText(currentValue);
      dropdown.querySelectorAll('.font-picker-option').forEach(o =>
        o.classList.toggle('selected', o.textContent === currentValue)
      );
    };

    return wrap;
  }

  const FEATURE_DEFAULTS = {
    visible: true, track: 0, opacity: 1, border: 0, borderColor: '#000000', borderStyle: 'solid',
    arrow: true, arrowStyle: 'pointed', tailCut: false,
    showLabel: true, labelPos: 'on',
    labelOrientation: 'curved', labelColor: '#1e293b', labelSize: 11, labelFont: 'sans-serif', labelMaxWidth: 0,
    leaderLine: 'never'  // 'never', 'auto' = show when nudged, 'always'
  };

  const STYLE_THEMES = [
    {
      id: 'classic', name: 'Classic', desc: 'Traditional molecular biology textbook colors',
      rules: {
        gene:       { color: '#16a34a', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        promoter:   { color: '#ea580c', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        terminator: { color: '#dc2626', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        origin:     { color: '#2563eb', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        resistance: { color: '#db2777', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        regulatory: { color: '#8b5cf6', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        primer:     { color: '#0891b2', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        misc:       { color: '#64748b', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
      },
      defaults: { labelFont: 'sans-serif', labelSize: 11, border: 0 }
    },
    {
      id: 'pastel', name: 'Pastel', desc: 'Soft muted tones for publication figures',
      rules: {
        gene:       { color: '#86c7a0', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        promoter:   { color: '#f4a87c', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        terminator: { color: '#e8918e', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
        origin:     { color: '#8bb8e8', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
        resistance: { color: '#d4a0c0', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        regulatory: { color: '#c4b5fd', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
        primer:     { color: '#99d5e5', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        misc:       { color: '#b0b8c4', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
      },
      defaults: { labelFont: 'sans-serif', labelSize: 11, border: 0 }
    },
    {
      id: 'bold', name: 'Bold', desc: 'High-contrast saturated colors for presentations',
      rules: {
        gene:       { color: '#059669', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        promoter:   { color: '#d97706', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        terminator: { color: '#dc2626', arrow: false, tailCut: true, opacity: 1, labelColor: '#ffffff' },
        origin:     { color: '#2563eb', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        resistance: { color: '#c026d3', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        regulatory: { color: '#7c3aed', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        primer:     { color: '#0e7490', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        misc:       { color: '#475569', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
      },
      defaults: { labelFont: 'sans-serif', labelSize: 12, border: 0 }
    },
    {
      id: 'snapgene', name: 'SnapGene', desc: 'Matches the SnapGene default palette',
      rules: {
        gene:       { color: '#31b440', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        promoter:   { color: '#c8c800', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        terminator: { color: '#e03c31', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        origin:     { color: '#ffb74d', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
        resistance: { color: '#42a5f5', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        regulatory: { color: '#ab47bc', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        primer:     { color: '#26a69a', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        misc:       { color: '#b0bec5', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
      },
      defaults: { labelFont: 'sans-serif', labelSize: 11, border: 0 }
    },
    {
      id: 'benchling', name: 'Benchling', desc: 'Matches the Benchling default style',
      rules: {
        gene:       { color: '#4caf50', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        promoter:   { color: '#8bc34a', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        terminator: { color: '#f44336', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        origin:     { color: '#ff9800', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
        resistance: { color: '#2196f3', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        regulatory: { color: '#9c27b0', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        primer:     { color: '#00bcd4', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        misc:       { color: '#9e9e9e', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
      },
      defaults: { labelFont: 'sans-serif', labelSize: 11, border: 0 }
    },
    {
      id: 'monochrome', name: 'Monochrome', desc: 'Grayscale with shape differentiation',
      rules: {
        gene:       { color: '#374151', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        promoter:   { color: '#6b7280', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        terminator: { color: '#4b5563', arrow: false, tailCut: true, opacity: 1, labelColor: '#ffffff' },
        origin:     { color: '#9ca3af', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
        resistance: { color: '#1f2937', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        regulatory: { color: '#6b7280', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        primer:     { color: '#4b5563', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        misc:       { color: '#d1d5db', arrow: false, tailCut: false, opacity: 0.6, labelColor: '#1e293b' },
      },
      defaults: { labelFont: 'sans-serif', labelSize: 11, border: 0 }
    },
    {
      id: 'neon', name: 'Neon', desc: 'Vibrant colors that pop on dark backgrounds',
      rules: {
        gene:       { color: '#22d3ee', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        promoter:   { color: '#facc15', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        terminator: { color: '#f43f5e', arrow: false, tailCut: true, opacity: 1, labelColor: '#ffffff' },
        origin:     { color: '#a78bfa', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
        resistance: { color: '#34d399', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        regulatory: { color: '#c084fc', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
        primer:     { color: '#67e8f9', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#1e293b' },
        misc:       { color: '#fb923c', arrow: false, tailCut: false, opacity: 1, labelColor: '#1e293b' },
      },
      defaults: { labelFont: 'sans-serif', labelSize: 11, border: 0 }
    },
    {
      id: 'blueprint', name: 'Blueprint', desc: 'Technical drawing style with borders and monospace labels',
      rules: {
        gene:       { color: '#3b82f6', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 0.75, labelColor: '#ffffff' },
        promoter:   { color: '#60a5fa', arrow: true, arrowStyle: 'pointed', tailCut: true, opacity: 0.75, labelColor: '#1e293b' },
        terminator: { color: '#1e40af', arrow: false, tailCut: true, opacity: 0.75, labelColor: '#ffffff' },
        origin:     { color: '#93c5fd', arrow: false, tailCut: false, opacity: 0.75, labelColor: '#1e293b' },
        resistance: { color: '#2563eb', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 0.75, labelColor: '#ffffff' },
        regulatory: { color: '#7dd3fc', arrow: false, tailCut: true, opacity: 0.75, labelColor: '#1e293b' },
        primer:     { color: '#38bdf8', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 0.75, labelColor: '#1e293b' },
        misc:       { color: '#bfdbfe', arrow: false, tailCut: false, opacity: 0.6, labelColor: '#1e293b' },
      },
      defaults: { labelFont: 'monospace', labelSize: 10, border: 1 }
    },
    {
      id: 'earth', name: 'Earth', desc: 'Warm natural tones for an organic, academic look',
      rules: {
        gene:       { color: '#4d7c0f', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        promoter:   { color: '#b45309', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        terminator: { color: '#9a3412', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        origin:     { color: '#0f766e', arrow: false, tailCut: false, opacity: 1, labelColor: '#ffffff' },
        resistance: { color: '#92400e', arrow: true, arrowStyle: 'flared', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        regulatory: { color: '#854d0e', arrow: false, tailCut: false, opacity: 0.85, labelColor: '#ffffff' },
        primer:     { color: '#166534', arrow: true, arrowStyle: 'pointed', tailCut: false, opacity: 1, labelColor: '#ffffff' },
        misc:       { color: '#78716c', arrow: false, tailCut: false, opacity: 0.7, labelColor: '#ffffff' },
      },
      defaults: { labelFont: 'serif', labelSize: 11, border: 0 }
    },
  ];

  const MARKER_DEFAULTS = {
    visible: true, lineLen: 18, lineWidth: 1.5, lineStyle: 'solid',
    span: 'all', spanFrom: 0, spanTo: 0,
    outerLabel: true, outerSize: 10, outerColor: '#1e293b', outerFont: 'sans-serif', outerOrientation: 'curved',
    innerLabel: true, innerSize: 9, innerColor: '#94a3b8', innerFont: 'sans-serif', innerOrientation: 'curved'
  };

  // Restriction enzyme database - recognition seq uses IUPAC codes
  // cut = 5′ strand cut offset from site start; cut3 = 3′ strand cut offset (defaults to seq.length - cut)
  // Type IIS enzymes have cut/cut3 extending beyond the recognition site
  const RE_ENZYMES = [
    { name:'EcoRI',   seq:'GAATTC',   cut:1 },
    { name:'BamHI',   seq:'GGATCC',   cut:1 },
    { name:'HindIII', seq:'AAGCTT',   cut:1 },
    { name:'XbaI',    seq:'TCTAGA',   cut:1 },
    { name:'SalI',    seq:'GTCGAC',   cut:1 },
    { name:'PstI',    seq:'CTGCAG',   cut:5 },
    { name:'SphI',    seq:'GCATGC',   cut:5 },
    { name:'KpnI',    seq:'GGTACC',   cut:5 },
    { name:'SacI',    seq:'GAGCTC',   cut:5 },
    { name:'SacII',   seq:'CCGCGG',   cut:4 },
    { name:'NotI',    seq:'GCGGCCGC', cut:2 },
    { name:'XhoI',    seq:'CTCGAG',   cut:1 },
    { name:'NdeI',    seq:'CATATG',   cut:2 },
    { name:'NcoI',    seq:'CCATGG',   cut:1 },
    { name:'BglII',   seq:'AGATCT',   cut:1 },
    { name:'ClaI',    seq:'ATCGAT',   cut:2 },
    { name:'NheI',    seq:'GCTAGC',   cut:1 },
    { name:'MluI',    seq:'ACGCGT',   cut:1 },
    { name:'ApaI',    seq:'GGGCCC',   cut:5 },
    { name:'SmaI',    seq:'CCCGGG',   cut:3 },
    { name:'XmaI',    seq:'CCCGGG',   cut:1 },
    { name:'EcoRV',   seq:'GATATC',   cut:3 },
    { name:'ScaI',    seq:'AGTACT',   cut:3 },
    { name:'StuI',    seq:'AGGCCT',   cut:3 },
    { name:'AvrII',   seq:'CCTAGG',   cut:1 },
    { name:'BspEI',   seq:'TCCGGA',   cut:1 },
    { name:'SpeI',    seq:'ACTAGT',   cut:1 },
    { name:'AflII',   seq:'CTTAAG',   cut:1 },
    { name:'PmeI',    seq:'GTTTAAAC', cut:4 },
    { name:'PacI',    seq:'TTAATTAA', cut:5 },
    { name:'SwaI',    seq:'ATTTAAAT', cut:4 },
    { name:'AscI',    seq:'GGCGCGCC', cut:2 },
    { name:'FseI',    seq:'GGCCGGCC', cut:6 },
    { name:'SfiI',    seq:'GGCCNNNNNGGCC', cut:8 },
    { name:'BsrGI',   seq:'TGTACA',   cut:1 },
    { name:'AgeI',    seq:'ACCGGT',   cut:1 },
    { name:'SgrAI',   seq:'CRCCGGYG', cut:2 },
    { name:'BssHII',  seq:'GCGCGC',   cut:1 },
    { name:'Acc65I',  seq:'GGTACC',   cut:1 },
    { name:'HpaI',    seq:'GTTAAC',   cut:3 },
    { name:'DraI',    seq:'TTTAAA',   cut:3 },
    { name:'AatII',   seq:'GACGTC',   cut:5 },
    { name:'BclI',    seq:'TGATCA',   cut:1 },
    { name:'SnaBI',   seq:'TACGTA',   cut:3 },
    { name:'Bsu36I',  seq:'CCTNAGG',  cut:2 },
    { name:'BlpI',    seq:'GCTNAGC',  cut:2 },
    { name:'BstBI',   seq:'TTCGAA',   cut:2 },
    { name:'AleI',    seq:'CACNNNNGTG', cut:5 },
    { name:'PflMI',   seq:'CCANNNNNTGG', cut:7 },
    { name:'BstEII',  seq:'GGTNACC',  cut:1 },
    // Type IIS enzymes - cut outside recognition site
    { name:'BsaI',    seq:'GGTCTC',   cut:7,  cut3:11 },
    { name:'BbsI',    seq:'GAAGAC',   cut:8,  cut3:12 },
    { name:'BpiI',    seq:'GAAGAC',   cut:8,  cut3:12 },
    { name:'Esp3I',   seq:'CGTCTC',   cut:7,  cut3:11 },
    { name:'BsmBI',   seq:'CGTCTC',   cut:7,  cut3:11 },
    { name:'SapI',    seq:'GCTCTTC',  cut:8,  cut3:11 },
    { name:'BspQI',   seq:'GCTCTTC',  cut:8,  cut3:11 },
    { name:'BtgZI',   seq:'GCGATG',   cut:16, cut3:14 },
    { name:'BsaXI',   seq:'ACNNNNNCTCC', cut:-1, cut3:-4 },
    { name:'FokI',    seq:'GGATG',    cut:14, cut3:13 },
    { name:'BceAI',   seq:'ACGGC',    cut:17, cut3:19 },
    { name:'BsmFI',   seq:'GGGAC',    cut:15, cut3:14 },
    { name:'BsgI',    seq:'GTGCAG',   cut:22, cut3:20 },
    // Additional common Type II enzymes
    { name:'MfeI',    seq:'CAATTG',   cut:1 },
    { name:'BglI',    seq:'GCCNNNNNGGC', cut:7 },
    { name:'BstXI',   seq:'CCANNNNNNTGG', cut:8 },
    { name:'MscI',    seq:'TGGCCA',   cut:3 },
    { name:'NruI',    seq:'TCGCGA',   cut:3 },
    { name:'Tth111I', seq:'GACNNNGTC', cut:4 },
    { name:'MboI',    seq:'GATC',     cut:0 },
    { name:'Sau3AI',  seq:'GATC',     cut:0 },
    { name:'DpnI',    seq:'GATC',     cut:2 },
    { name:'HaeIII',  seq:'GGCC',     cut:2 },
    { name:'AluI',    seq:'AGCT',     cut:2 },
    { name:'RsaI',    seq:'GTAC',     cut:2 },
    { name:'TaqI',    seq:'TCGA',     cut:1 },
    { name:'MspI',    seq:'CCGG',     cut:1 },
    { name:'HpaII',   seq:'CCGG',     cut:1 },
    { name:'HinfI',   seq:'GANTC',    cut:1 },
    { name:'PvuI',    seq:'CGATCG',   cut:4 },
    { name:'PvuII',   seq:'CAGCTG',   cut:3 },
    { name:'BsiWI',   seq:'CGTACG',   cut:1 },
    { name:'PciI',    seq:'ACATGT',   cut:1 },
    { name:'SbfI',    seq:'CCTGCAGG', cut:6 },
    { name:'AsiSI',   seq:'GCGATCGC', cut:2 },
    { name:'AarI',    seq:'CACCTGC',  cut:11, cut3:15 },
    { name:'BssSαI',  seq:'CACGAG',   cut:7,  cut3:10 },
    { name:'BanI',    seq:'GGYRCC',   cut:1 },
    { name:'BanII',   seq:'GRGCYC',   cut:5 },
    { name:'EagI',    seq:'CGGCCG',   cut:1 },
    { name:'HincII',  seq:'GTYRAC',   cut:3 },
    { name:'NsiI',    seq:'ATGCAT',   cut:3 },
    { name:'SexAI',   seq:'ACCWGGT',  cut:1 },
    { name:'SfoI',    seq:'GGCGCC',   cut:3 },
    { name:'StyI',    seq:'CCWWGG',   cut:1 },
    { name:'XcmI',    seq:'CCANNNNNNNNNTGG', cut:8 },
    { name:'AhdI',    seq:'GACNNNNNGTC', cut:6 },
    { name:'BsaBI',   seq:'GATNNNNATC', cut:5 },
    { name:'BseRI',   seq:'GAGGAG',   cut:16, cut3:14 },
    { name:'Eco53kI', seq:'GAGCTC',   cut:3 },
  ];

  // IUPAC ambiguity map for restriction site matching
  const IUPAC = {
    A:'A', T:'T', C:'C', G:'G',
    R:'[AG]', Y:'[CT]', S:'[GC]', W:'[AT]', K:'[GT]', M:'[AC]',
    B:'[CGT]', D:'[AGT]', H:'[ACT]', V:'[ACG]', N:'[ACGT]'
  };

  function reToRegex(seq) {
    return new RegExp(seq.split('').map(c => IUPAC[c] || c).join(''), 'gi');
  }

  // Find all cut positions (1-based) for an enzyme in a sequence (searches both strands)
  // For circular plasmids, wraps around the origin to catch spanning sites
  function findCutSites(enzyme, sequence, circular) {
    const seq = sequence.toUpperCase();
    const seqLen = seq.length;
    const siteLen = enzyme.seq.length;
    const maxReach = Math.max(siteLen, Math.abs(enzyme.cut), Math.abs(enzyme.cut3 || 0));
    const isCirc = circular !== undefined ? circular : true;
    const wrapLen = isCirc && seqLen >= siteLen ? Math.min(maxReach, seqLen - 1) : 0;
    const searchSeq = wrapLen > 0 ? seq + seq.substring(0, wrapLen) : seq;

    function wrapPos(raw) {
      if (isCirc) return ((raw % seqLen) + seqLen) % seqLen + 1;
      return Math.max(1, Math.min(raw + 1, seqLen));
    }

    const re = reToRegex(enzyme.seq);
    const positions = [];
    let m;
    // Forward strand - cut position on 5′ strand
    while ((m = re.exec(searchSeq)) !== null) {
      positions.push(wrapPos(m.index + enzyme.cut));
      re.lastIndex = m.index + 1;
    }
    // Reverse complement - only if recognition seq is not a palindrome
    const rc = revComp(enzyme.seq);
    if (rc !== enzyme.seq.toUpperCase()) {
      const reRc = reToRegex(rc);
      // For rc match at position p: the enzyme binds the bottom strand.
      // The top-strand cut offset mirrors to: p + siteLen - cut3
      // where cut3 defaults to siteLen - cut for standard enzymes
      const c3 = enzyme.cut3 != null ? enzyme.cut3 : siteLen - enzyme.cut;
      while ((m = reRc.exec(searchSeq)) !== null) {
        positions.push(wrapPos(m.index + siteLen - c3));
        reRc.lastIndex = m.index + 1;
      }
    }
    return [...new Set(positions)].sort((a, b) => a - b);
  }

  function revComp(seq) {
    const comp = { A:'T', T:'A', C:'G', G:'C', R:'Y', Y:'R', S:'S', W:'W', K:'M', M:'K', B:'V', V:'B', D:'H', H:'D', N:'N' };
    return seq.split('').reverse().map(c => comp[c.toUpperCase()] || c).join('');
  }

  // Compute overhang info for a restriction enzyme
  // Returns { type: '5′'|'3′'|'blunt', bases: number, label: string }
  function getOverhangInfo(enzyme) {
    const siteLen = enzyme.seq.length;
    const cut5 = enzyme.cut;
    const cut3 = enzyme.cut3 != null ? enzyme.cut3 : siteLen - cut5;
    // cut5 and cut3 are both offsets from site start on the top strand
    // If cut5 < cut3: 5′ overhang; if cut5 > cut3: 3′ overhang; if equal: blunt
    if (cut5 === cut3) return { type: 'blunt', bases: 0, label: 'Blunt' };
    if (cut5 < cut3) return { type: "5\u2032", bases: cut3 - cut5, label: `5\u2032 (${cut3 - cut5} nt)` };
    return { type: "3\u2032", bases: cut5 - cut3, label: `3\u2032 (${cut5 - cut3} nt)` };
  }

  // Build HTML for a double-stranded cut site diagram with overhang label
  function buildCutDiagramHTML(enzyme) {
    const seq = enzyme.seq.toUpperCase();
    const siteLen = seq.length;
    const cut5 = enzyme.cut;
    const cut3 = enzyme.cut3 != null ? enzyme.cut3 : siteLen - cut5;
    const comp = { A:'T', T:'A', C:'G', G:'C', R:'Y', Y:'R', S:'S', W:'W', K:'M', M:'K', B:'V', V:'B', D:'H', H:'D', N:'N' };
    const bottom = seq.split('').map(c => comp[c] || c).join('');
    const oh = getOverhangInfo(enzyme);

    // For Type IIS enzymes, cuts can be outside the recognition site.
    // Extend the display with N placeholders to show where cuts fall.
    const minPos = Math.min(0, cut5, cut3);
    const maxPos = Math.max(siteLen, cut5, cut3);
    // Build extended top and bottom strand strings
    let topStr = '', botStr = '';
    for (let i = minPos; i < maxPos; i++) {
      if (i >= 0 && i < siteLen) {
        topStr += seq[i];
        botStr += bottom[i];
      } else {
        topStr += 'N';
        botStr += 'N';
      }
    }
    const adjCut5 = cut5 - minPos; // adjusted cut position in extended string
    const adjCut3 = (siteLen - cut3) - minPos; // bottom strand cut in extended coords
    // For bottom strand: cut3 is offset from site start on top strand where bottom is cut
    // In the extended string, bottom strand cut position = cut3 - minPos
    const adjCut3b = cut3 - minPos;

    const prefixLen = 4; // "5′… " width
    const arrowTop = '\u00A0'.repeat(prefixLen + adjCut5 * 2 - 1) + '\u25BC';
    const arrowBot = '\u00A0'.repeat(prefixLen + adjCut3b * 2 - 1) + '\u25B2';
    const ohLabel = `<span class="tt-re-oh">${oh.label} overhang</span>`;

    return `<span class="tt-re-arrow-row">${arrowTop}</span>` +
      `<span class="tt-re-strand">5\u2032\u2026 ${topStr.split('').join(' ')} \u2026\u20323\u2032</span>` +
      `<span class="tt-re-strand">3\u2032\u2026 ${botStr.split('').join(' ')} \u2026\u20325\u2032</span>` +
      `<span class="tt-re-arrow-row">${arrowBot}</span>` +
      ohLabel;
  }

  let features = [
    { name:'lacZ-alpha', type:'gene', start:396, end:816, direction:1, color:'#16a34a', ...FEATURE_DEFAULTS },
    { name:'Amp(R)', type:'resistance', start:1629, end:2489, direction:-1, color:'#db2777', ...FEATURE_DEFAULTS },
    { name:'ori', type:'origin', start:817, end:1464, direction:1, color:'#2563eb', ...FEATURE_DEFAULTS },
    { name:'lac promoter', type:'promoter', start:210, end:395, direction:1, color:'#ea580c', ...FEATURE_DEFAULTS },
  ];

  let markers = [
    { name:'EcoRI', position:450, color:'#dc2626', ...MARKER_DEFAULTS, outerText:'EcoRI', innerText:'450' },
  ];
  let selectedMarkerIdx = -1;

  let inputMode = 'length'; // 'length' or 'sequence'
  let selectedIdx = -1;     // currently selected feature for editing
  let _featureFilter = '';  // current feature search filter string
  const FEATURE_SEARCH_THRESHOLD = 6;
  // Keyboard navigation focus (separate from selection/editing)
  let kbFocusList = 'features'; // 'features' | 'markers'
  let kbFocusIdx = -1;
  let addColor = TYPE_DEFAULTS['gene'];
  let addDir = 1;
  let showCenterName = true;
  let showCenterLength = true;
  let lengthFormat = 'auto';

  let centerStyle = {
    nameSize: 16, nameColor: '#1e293b', nameFont: 'sans-serif',
    lenSize: 13, lenColor: '#64748b', lenFont: 'sans-serif',
  };

  function formatLength(bp) {
    switch (lengthFormat) {
      case 'bp':   return bp + ' bp';
      case 'kb1':  return (bp / 1000).toFixed(1) + ' kb';
      case 'kb0':  return Math.round(bp / 1000) + ' kb';
      case 'auto':
      default:
        if (bp >= 1000) {
          const k = bp / 1000;
          return (bp % 1000 === 0 ? k.toFixed(0) : k.toFixed(1)) + ' kb';
        }
        return bp + ' bp';
    }
  }

  // --- Tick config ---
  let tickCfg = {
    majorShow: true,
    majorInterval: 0,    // 0 = auto
    majorLabels: true,
    majorLen: 8,
    majorWidth: 1.5,
    majorColor: '#94a3b8',
    labelFormat: 'short',
    labelSize: 10,
    labelColor: '#64748b',
    minorShow: true,
    minorInterval: 0,    // 0 = auto (1/5 major)
    minorLabels: false,
    minorLen: 4,
    minorWidth: 1,
    minorColor: '#cbd5e1',
    minorLabelColor: '#94a3b8',
    majorDirection: 'out',
    minorDirection: 'out',
  };

  let trackSpacing = 30; // px between track center-lines
  let _tickInnerEdge = 0; // updated each render, used by feature label positioning

  let gcTrackCfg = {
    show: false,
    windowSize: 50,    // bp per window
    radius: 0,         // 0 = auto (inside backbone)
    height: 30,        // track height in px
    colorAbove: '#22c55e', // GC above average
    colorBelow: '#ef4444', // GC below average
    opacity: 0.5,
  };

  // Compute GC% in sliding windows across the sequence (cached)
  let _gcCache = { seq: '', windowSize: 0, points: [] };
  function computeGcContent(seq, windowSize) {
    if (!seq || seq.length === 0) return [];
    if (seq === _gcCache.seq && windowSize === _gcCache.windowSize) return _gcCache.points;
    const len = seq.length;
    const upper = seq.toUpperCase();
    const step = Math.max(1, Math.floor(len / 360)); // ~1 point per degree
    const halfW = Math.floor(windowSize / 2);
    const points = [];
    for (let i = 0; i < len; i += step) {
      let gc = 0, count = 0;
      for (let j = i - halfW; j <= i + halfW; j++) {
        const idx = ((j % len) + len) % len; // wrap around for circular
        const c = upper[idx];
        if (c === 'G' || c === 'C') gc++;
        count++;
      }
      points.push({ bp: i, gc: gc / count });
    }
    _gcCache = { seq, windowSize, points };
    return points;
  }

  // Segment GC data into above/below-average runs with zero-crossing interpolation.
  // mapPt(gcPoint) should return an object with a positional key (e.g. {angle, dev} or {x, dev}).
  // Returns { avgGc, segments: [{ sign: 1|-1, points: [...] }] }
  function segmentGcData(gcPoints, mapPt) {
    const maxDev = 0.3;
    let avgGc = 0;
    gcPoints.forEach(p => avgGc += p.gc);
    avgGc /= gcPoints.length || 1;

    const norm = gcPoints.map(p => {
      const mapped = mapPt(p);
      mapped.dev = Math.max(-1, Math.min(1, (p.gc - avgGc) / maxDev));
      return mapped;
    });

    // Split into same-sign runs, interpolating zero crossings
    const segments = [];
    const posKey = norm.length > 0 ? (norm[0].angle !== undefined ? 'angle' : 'x') : 'x';
    for (let i = 0; i < norm.length; i++) {
      const cur = norm[i];
      const sign = cur.dev >= 0 ? 1 : -1;

      if (i > 0) {
        const prev = norm[i - 1];
        const prevSign = prev.dev >= 0 ? 1 : -1;
        if (sign !== prevSign) {
          const t = Math.abs(prev.dev) / (Math.abs(prev.dev) + Math.abs(cur.dev));
          const crossVal = prev[posKey] + t * (cur[posKey] - prev[posKey]);
          const crossPt = { dev: 0 };
          crossPt[posKey] = crossVal;
          if (segments.length > 0) segments[segments.length - 1].points.push(crossPt);
          segments.push({ sign, points: [{ ...crossPt }] });
        }
      }

      if (segments.length === 0 || segments[segments.length - 1].sign !== sign) {
        segments.push({ sign, points: [] });
      }
      segments[segments.length - 1].points.push(cur);
    }

    return { avgGc, segments, norm };
  }

  // Returns geometry for a given track index (0 = backbone, 1 = first outer, -1 = first inner, etc.)
  // Spacing is computed by accumulating actual track widths so rings never overlap
  function _trackWidth(idx) {
    if (idx === 0) return trackW;
    const rs = ringStyles[String(idx)];
    return (rs && rs.trackW != null) ? rs.trackW : Math.max(12, trackW - 4);
  }
  function getTrackGeometry(trackIdx) {
    const gap = 8; // px between track edges
    let tR = R;
    if (trackIdx > 0) {
      for (let i = 0; i < trackIdx; i++) {
        tR += _trackWidth(i) / 2 + gap + _trackWidth(i + 1) / 2;
      }
    } else if (trackIdx < 0) {
      for (let i = 0; i > trackIdx; i--) {
        tR -= _trackWidth(i) / 2 + gap + _trackWidth(i - 1) / 2;
      }
    }
    const tW = _trackWidth(trackIdx);
    return { R: tR, trackW: tW, ro: tR + tW / 2, ri: tR - tW / 2 };
  }

  // Collect the set of track indices currently in use by features
  function getUsedTracks() {
    const s = new Set([0]);
    features.forEach(f => { if (f.track) s.add(f.track); });
    return [...s].sort((a, b) => a - b);
  }

  // --- Helpers ---
  function polarToCart(angle, r) {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(r, startAngle, endAngle) {
    const s = polarToCart(startAngle, r);
    const e = polarToCart(endAngle, r);
    let sweep = endAngle - startAngle;
    if (sweep < 0) sweep += 360;
    const large = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  function bpToAngle(bp, total) { return (bp / total) * 360; }

  // Ensure a color is visible on white backgrounds; darken light colors
  function ensureContrast(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return '#666';
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    // Relative luminance (simplified)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum < 0.7) return hex;
    // Darken by 40%
    const d = v => Math.round(v * 0.6).toString(16).padStart(2, '0');
    return `#${d(r)}${d(g)}${d(b)}`;
  }

  function calcTickCount(total) {
    if (total <= 500) return 5;
    if (total <= 2000) return 8;
    if (total <= 10000) return 10;
    return 12;
  }

  function niceRound(n) {
    if (n <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(n)));
    const norm = n / mag;
    if (norm <= 1) return mag;
    if (norm <= 2) return 2 * mag;
    if (norm <= 5) return 5 * mag;
    return 10 * mag;
  }

  function formatBp(bp, fmt) {
    if (fmt === 'full') return bp.toString();
    if (bp >= 1000) return (bp / 1000).toFixed(bp % 1000 === 0 ? 0 : 1) + 'k';
    return bp.toString();
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function dashArrayFor(style, fallback) {
    return style === 'dashed' ? '4,3' : style === 'dotted' ? '1.5,2' : (fallback || 'none');
  }
  function closePopover(el) {
    if (!el.classList.contains('open')) return;
    el.classList.remove('open');
    el.classList.add('closing');
    const finish = () => {
      el.classList.remove('closing');
      el.style.display = '';
    };
    el.addEventListener('animationend', function handler() {
      el.removeEventListener('animationend', handler);
      finish();
    }, { once: true });
    setTimeout(finish, 200);
  }

  function closeModal(el) {
    if (!el.classList.contains('open')) return;
    el.classList.add('closing');
    el.addEventListener('animationend', function handler() {
      el.removeEventListener('animationend', handler);
      el.classList.remove('open', 'closing');
    }, { once: true });
    setTimeout(() => el.classList.remove('open', 'closing'), 200);
  }
  function switchTab(tabId) {
    document.querySelectorAll('#panel-tabs button').forEach(b => b.classList.remove('active'));
    document.querySelector(`#panel-tabs button[data-tab="${tabId}"]`).classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    $(tabId).classList.add('active');
  }
  // --- Consolidated outside-click dismissal ---
  const _dismissRegistry = [];
  function registerDismiss(el, closeFn, excludeSelectors) {
    _dismissRegistry.push({ el, closeFn, excludeSelectors: excludeSelectors || [] });
  }
  document.addEventListener('click', e => {
    for (const entry of _dismissRegistry) {
      if (!entry.el.classList.contains('open')) continue;
      if (entry.el.contains(e.target)) continue;
      if (entry.excludeSelectors.some(sel => e.target.closest(sel))) continue;
      entry.closeFn();
    }
  });

  function positionCtxMenu(el, e, menuW) {
    const cr = $mapContainer.getBoundingClientRect();
    let left = e.clientX - cr.left + 8;
    let top = e.clientY - cr.top + 8;
    el.style.display = 'block';
    const menuH = el.offsetHeight || 260;
    if (left + menuW > cr.width - 10) left = cr.width - menuW - 10;
    if (top + menuH > cr.height - 10) top = Math.max(10, cr.height - menuH - 10);
    if (left < 10) left = 10;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    requestAnimationFrame(() => el.classList.add('open'));
  }

  // --- Sequence & length helpers ---
  function getSequence() {
    return $seqInput.value.replace(/[^atcguryswkmbdhvnATCGURYSWKMBDHVN]/g, '');
  }

  function getLength() {
    if (inputMode === 'sequence') {
      return getSequence().length || 1;
    }
    return parseInt($seqLength.value) || 1;
  }

  // --- Undo / Redo ---
  const MAX_UNDO = 50;
  let undoStack = [];
  let redoStack = [];
  let _undoDebounce = null;

  // Undo entries use structural sharing: the seqInput string is stored by
  // reference so identical sequences across snapshots share memory.
  let _lastUndoSeq = '';

  function captureState() {
    // Capture collapsed state of collapsible sections
    const collapsedSections = {};
    document.querySelectorAll('h3.collapsible').forEach(h3 => {
      if (h3.dataset.target) collapsedSections[h3.dataset.target] = h3.classList.contains('collapsed');
    });
    return JSON.stringify({
      features, markers, R, trackW, trackSpacing, bbCfg, tickCfg, gcTrackCfg, ringStyles, linearCfg, linearTickCfg,
      centerStyle, showCenterName, showCenterLength, lengthFormat, mapRotation,
      plasmidName: $plasmidName.value,
      seqLength: $seqLength.value,
      seqInput: $seqInput.value,
      inputMode, viewMode,
      collapsedSections,
    });
  }

  // Lightweight snapshot for undo stack - shares sequence string by reference
  function _captureUndoEntry() {
    const seq = $seqInput.value;
    // Reuse the same string reference when sequence hasn't changed
    if (seq === _lastUndoSeq) {
      // same reference
    } else {
      _lastUndoSeq = seq;
    }
    return {
      features: JSON.parse(JSON.stringify(features)),
      markers: JSON.parse(JSON.stringify(markers)),
      R, trackW, trackSpacing,
      bbCfg: Object.assign({}, bbCfg),
      tickCfg: Object.assign({}, tickCfg),
      gcTrackCfg: Object.assign({}, gcTrackCfg),
      linearCfg: Object.assign({}, linearCfg),
      linearTickCfg: Object.assign({}, linearTickCfg),
      ringStyles: JSON.parse(JSON.stringify(ringStyles)),
      centerStyle: Object.assign({}, centerStyle),
      showCenterName, showCenterLength, lengthFormat, mapRotation,
      plasmidName: $plasmidName.value,
      seqLength: $seqLength.value,
      seqInput: _lastUndoSeq,
      inputMode, viewMode,
    };
  }

  function _undoEntryToJson(entry) {
    return JSON.stringify(entry);
  }

  function restoreState(json) {
    const s = JSON.parse(json);
    features = s.features;
    markers = s.markers;
    R = s.R;
    trackW = s.trackW;
    if (s.trackSpacing != null) trackSpacing = s.trackSpacing;
    Object.assign(bbCfg, s.bbCfg);
    Object.assign(tickCfg, s.tickCfg);
    if (s.gcTrackCfg) Object.assign(gcTrackCfg, s.gcTrackCfg);
    if (s.linearCfg) Object.assign(linearCfg, s.linearCfg);
    if (s.linearTickCfg) Object.assign(linearTickCfg, s.linearTickCfg);
    ringStyles = s.ringStyles || {};
    // Migrate old single direction to per-type directions
    if (tickCfg.direction && !tickCfg.majorDirection) {
      tickCfg.majorDirection = tickCfg.direction;
      tickCfg.minorDirection = tickCfg.direction;
    }
    delete tickCfg.direction;
    // Migrate old shared `show` to per-type `majorShow`
    if ('show' in tickCfg && !('majorShow' in tickCfg)) {
      tickCfg.majorShow = tickCfg.show;
    }
    delete tickCfg.show;
    if (tickCfg.majorShow === undefined) tickCfg.majorShow = true;
    Object.assign(centerStyle, s.centerStyle);
    showCenterName = s.showCenterName;
    showCenterLength = s.showCenterLength;
    lengthFormat = s.lengthFormat;
    mapRotation = s.mapRotation || 0;
    inputMode = s.inputMode;
    if (s.viewMode) setViewMode(s.viewMode);
    $plasmidName.value = s.plasmidName;
    $seqLength.value = s.seqLength;
    $seqInput.value = s.seqInput;

    // Sync all UI controls
    $radiusSlider.value = R;
    $radiusNum.value = R;
    $rotationSlider.value = mapRotation;
    $rotationNum.value = mapRotation;
    $('linear-bp-per-row').value = linearCfg.bpPerRow || 0;
    $bbWidth.value = trackW;
    $('bb-width-num').value = trackW;
    $bbFill.value = bbCfg.fill;
    $bbEdge.value = bbCfg.edge;
    $bbEdgeWidth.value = bbCfg.edgeWidth;
    $('bb-edge-width-num').value = bbCfg.edgeWidth;
    $bbOpacity.value = Math.round(bbCfg.opacity * 100);
    $('bb-opacity-num').value = Math.round(bbCfg.opacity * 100);
    $tickMajorShow.checked = tickCfg.majorShow;
    $tickMajorDirection.value = tickCfg.majorDirection || 'out';
    $tickMinorDirection.value = tickCfg.minorDirection || 'out';
    $tickMajorInterval.value = tickCfg.majorInterval;
    $tickMajorLen.value = tickCfg.majorLen;
    $('tick-major-len-num').value = tickCfg.majorLen;
    $tickMajorWidth.value = tickCfg.majorWidth;
    $('tick-major-width-num').value = tickCfg.majorWidth;
    $tickMajorColor.value = tickCfg.majorColor;
    $tickMajorLabels.checked = tickCfg.majorLabels;
    $tickLabelFormat.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.fmt === (tickCfg.labelFormat || 'short')));
    $tickLabelSize.value = tickCfg.labelSize;
    $('tick-label-size-num').value = tickCfg.labelSize;
    $tickLabelColor.value = tickCfg.labelColor;
    $tickMinorShow.checked = tickCfg.minorShow;
    $tickMinorInterval.value = tickCfg.minorInterval;
    $tickMinorLen.value = tickCfg.minorLen;
    $('tick-minor-len-num').value = tickCfg.minorLen;
    $tickMinorWidth.value = tickCfg.minorWidth;
    $('tick-minor-width-num').value = tickCfg.minorWidth;
    $tickMinorColor.value = tickCfg.minorColor;
    $tickMinorLabelColor.value = tickCfg.minorLabelColor || '#94a3b8';
    $tickMinorLabels.checked = tickCfg.minorLabels;
    $('mode-length').classList.toggle('active', inputMode === 'length');
    $('mode-sequence').classList.toggle('active', inputMode === 'sequence');
    document.querySelectorAll('#input-tabs button').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === inputMode);
    });
    syncGcUi();
    updateGcSectionState();
    updateReFinderBtn();

    // Restore collapsed state of collapsible sections
    if (s.collapsedSections) {
      Object.entries(s.collapsedSections).forEach(([targetId, isCollapsed]) => {
        const body = $(targetId);
        const h3 = document.querySelector(`h3.collapsible[data-target="${targetId}"]`);
        if (!body || !h3) return;
        h3.classList.toggle('collapsed', isCollapsed);
        body.classList.toggle('collapsed', isCollapsed);
        h3.setAttribute('aria-expanded', !isCollapsed);
      });
    }

    selectedIdx = -1;
    selectedMarkerIdx = -1;
    renderFeatureList();
    renderMarkerList();
    render();
    updateUndoRedoButtons();
  }

  // Push current state onto undo stack (call BEFORE making a change)
  function pushUndo() {
    undoStack.push(_captureUndoEntry());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
  }

  // Debounced push for continuous inputs (sliders, color pickers)
  let _undoSnapshot = null;
  let _undoTimer = null;
  function pushUndoDebounced() {
    if (_undoSnapshot === null) {
      // Capture state at the START of the drag, before changes
      _undoSnapshot = _captureUndoEntry();
    }
    clearTimeout(_undoTimer);
    _undoTimer = setTimeout(() => {
      undoStack.push(_undoSnapshot);
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack = [];
      _undoSnapshot = null;
      _undoTimer = null;
      updateUndoRedoButtons();
    }, 600);
  }

  function describeChange(fromJson, toJson) {
    try {
      const a = JSON.parse(fromJson), b = JSON.parse(toJson);
      // Feature added/removed
      if (a.features.length > b.features.length) {
        const removed = a.features.find(f => !b.features.some(g => g.name === f.name && g.start === f.start));
        return removed ? 'Delete ' + removed.name : 'Remove feature';
      }
      if (a.features.length < b.features.length) {
        const added = b.features.find(f => !a.features.some(g => g.name === f.name && g.start === f.start));
        return added ? 'Add ' + added.name : 'Add feature';
      }
      // Marker added/removed
      if (a.markers.length > b.markers.length) {
        const removed = a.markers.find(m => !b.markers.some(g => g.name === m.name && g.position === m.position));
        return removed ? 'Delete ' + removed.name : 'Remove marker';
      }
      if (a.markers.length < b.markers.length) {
        const added = b.markers.find(m => !a.markers.some(g => g.name === m.name && g.position === m.position));
        return added ? 'Add ' + added.name : 'Add marker';
      }
      // Name change
      if (a.plasmidName !== b.plasmidName) return 'Rename plasmid';
      // Feature/marker edits
      for (let i = 0; i < a.features.length; i++) {
        if (JSON.stringify(a.features[i]) !== JSON.stringify(b.features[i])) {
          return 'Edit ' + (b.features[i].name || a.features[i].name);
        }
      }
      for (let i = 0; i < a.markers.length; i++) {
        if (JSON.stringify(a.markers[i]) !== JSON.stringify(b.markers[i])) {
          return 'Edit ' + (b.markers[i].name || a.markers[i].name);
        }
      }
      // Backbone/tick/style changes
      if (JSON.stringify(a.bbCfg) !== JSON.stringify(b.bbCfg)) return 'Edit backbone';
      if (JSON.stringify(a.tickCfg) !== JSON.stringify(b.tickCfg)) return 'Edit ticks';
      if (a.mapRotation !== b.mapRotation) return 'Rotate map';
      if (a.R !== b.R || a.trackW !== b.trackW) return 'Edit layout';
      return 'Edit';
    } catch(e) { return 'Edit'; }
  }

  function undo() {
    if (undoStack.length === 0) return;
    const before = _captureUndoEntry();
    const target = undoStack.pop();
    redoStack.push(before);
    const beforeJson = _undoEntryToJson(before);
    const targetJson = _undoEntryToJson(target);
    restoreState(targetJson);
    const desc = describeChange(beforeJson, targetJson);
    showToast('Undo: ' + desc, 'success');
  }

  function redo() {
    if (redoStack.length === 0) return;
    const before = _captureUndoEntry();
    const target = redoStack.pop();
    undoStack.push(before);
    const beforeJson = _undoEntryToJson(before);
    const targetJson = _undoEntryToJson(target);
    restoreState(targetJson);
    const desc = describeChange(beforeJson, targetJson);
    showToast('Redo: ' + desc, 'success');
  }

  function updateUndoRedoButtons() {
    const undoBtn = $('toolbar-undo');
    const redoBtn = $('toolbar-redo');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  // --- Input mode tabs ---
  document.querySelectorAll('#input-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#input-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      inputMode = btn.dataset.mode;
      $('mode-length').classList.toggle('active', inputMode === 'length');
      $('mode-sequence').classList.toggle('active', inputMode === 'sequence');

      // Sync: when switching to length mode, populate from sequence if available
      if (inputMode === 'length') {
        const seq = getSequence();
        if (seq.length > 0) $seqLength.value = seq.length;
      }
      updateGcSectionState();
      updateReFinderBtn();
      render();
    });
  });

  function updateReFinderBtn() {
    const show = inputMode === 'sequence' && getSequence().length > 0;
    const btn = $('open-re-finder');
    const div = $('re-divider');
    if (btn) btn.style.display = show ? '' : 'none';
    if (div) div.style.display = show ? '' : 'none';
  }

  $seqLength.addEventListener('input', () => {
    pushUndoDebounced();
    const val = parseInt($seqLength.value);
    if (!val || val < 1) {
      $seqLength.style.borderColor = 'var(--warning, #d97706)';
      $seqLength.title = 'Minimum length is 1 bp';
    } else {
      $seqLength.style.borderColor = '';
      $seqLength.title = '';
    }
    scheduleRender();
  });
  $seqInput.addEventListener('input', () => {
    pushUndoDebounced();
    // Strip line breaks so sequence stays on one line
    if (/[\r\n]/.test($seqInput.value)) {
      const pos = $seqInput.selectionStart;
      $seqInput.value = $seqInput.value.replace(/[\r\n]+/g, '');
      $seqInput.selectionStart = $seqInput.selectionEnd = Math.min(pos, $seqInput.value.length);
    }
    const raw = $seqInput.value;
    const seq = getSequence();
    const stripped = raw.length - raw.replace(/[\s\d\n\r]/g, '').length; // whitespace/digits don't count
    const nonStd = raw.replace(/[\s\d\n\r]/g, '').replace(/[atcguryswkmbdhvnATCGURYSWKMBDHVN]/g, '').length;
    const ambig = seq.replace(/[atcgATCG]/g, '').length;
    const info = $('seq-info');
    if (seq.length > 0) {
      let msg = seq.length + ' bp detected';
      if (ambig > 0) msg += ` (${ambig} ambiguous)`;
      if (nonStd > 0) msg += ` (${nonStd} invalid character${nonStd > 1 ? 's' : ''} ignored)`;
      info.textContent = msg;
      info.style.color = nonStd > 0 ? 'var(--warning, #d97706)' : '';
    } else {
      info.textContent = '';
      info.style.color = '';
    }
    updateReFinderBtn();
    scheduleRender();
  });
  $plasmidName.addEventListener('input', () => { pushUndoDebounced(); scheduleRender(); });

  // --- Collapsible sections ---
  document.querySelectorAll('h3.collapsible').forEach(h3 => {
    // Set initial aria state and make focusable
    h3.setAttribute('role', 'button');
    h3.setAttribute('tabindex', '0');
    h3.setAttribute('aria-expanded', !h3.classList.contains('collapsed'));
    const toggle = () => {
      const body = $(h3.dataset.target);
      h3.classList.toggle('collapsed');
      body.classList.toggle('collapsed');
      h3.setAttribute('aria-expanded', !h3.classList.contains('collapsed'));
      saveState();
    };
    h3.addEventListener('click', toggle);
    h3.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  // --- Panel tabs (Features / Markers) ---
  document.querySelectorAll('#panel-tabs button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // --- Radius slider + number ---
  $radiusSlider.addEventListener('input', e => {
    pushUndoDebounced();
    R = parseInt(e.target.value);
    $radiusNum.value = R;
    scheduleRender();
  });
  $radiusNum.addEventListener('input', e => {
    pushUndoDebounced();
    let v = parseInt(e.target.value);
    if (isNaN(v)) return;
    v = Math.max(80, Math.min(280, v));
    R = v;
    $radiusSlider.value = R;
    scheduleRender();
  });

  // --- Rotation controls ---
  $rotationSlider.addEventListener('input', e => {
    pushUndoDebounced();
    mapRotation = parseInt(e.target.value) || 0;
    $rotationNum.value = mapRotation;
    scheduleRender();
  });
  $rotationNum.addEventListener('input', e => {
    pushUndoDebounced();
    let v = parseInt(e.target.value);
    if (isNaN(v)) return;
    v = ((v % 360) + 360) % 360;
    mapRotation = v;
    $rotationSlider.value = mapRotation;
    scheduleRender();
  });
  $('rotation-reset').addEventListener('click', () => {
    if (mapRotation === 0) return;
    pushUndo();
    mapRotation = 0;
    $rotationSlider.value = 0;
    $rotationNum.value = 0;
    render();
  });

  // --- Plasmid stats popover ---
  const statsPopover = $('plasmid-stats-popover');
  const statsBody = $('stats-body');

  function buildStatsContent() {
    const seq = getSequence().toUpperCase();
    const total = getLength();
    const hasSeq = seq.length > 0;

    let html = '';

    // Sequence composition
    html += '<div class="stats-section-title">Sequence</div>';
    html += '<table class="stats-table">';
    html += `<tr><td>Length</td><td>${total.toLocaleString()} bp</td></tr>`;

    if (hasSeq) {
      const counts = { A: 0, T: 0, G: 0, C: 0 };
      let ambiguous = 0;
      for (let i = 0; i < seq.length; i++) {
        const c = seq[i];
        if (counts[c] !== undefined) counts[c]++;
        else ambiguous++;
      }
      const resolved = seq.length - ambiguous;
      const gc = counts.G + counts.C;
      const at = counts.A + counts.T;
      const pct = n => resolved > 0 ? (n / resolved * 100).toFixed(1) + '%' : '–';

      html += `<tr><td>GC content</td><td>${pct(gc)}</td></tr>`;
      html += `<tr><td>AT content</td><td>${pct(at)}</td></tr>`;
      if (ambiguous > 0) {
        html += `<tr><td data-tip="IUPAC ambiguity codes (R, Y, S, W, K, M, B, D, H, V, N) - excluded from composition and GC/AT calculations">Ambiguous bases</td><td>${ambiguous.toLocaleString()} (${(ambiguous / seq.length * 100).toFixed(1)}%)</td></tr>`;
      }
      html += '</table>';

      // Composition bar
      const colors = { A: '#3b82f6', T: '#f59e0b', G: '#22c55e', C: '#ef4444' };
      html += '<div class="stats-bar">';
      for (const base of ['A', 'T', 'G', 'C']) {
        const w = resolved > 0 ? (counts[base] / resolved * 100) : 0;
        html += `<span style="width:${w}%;background:${colors[base]}" title="${base}: ${counts[base].toLocaleString()} (${pct(counts[base])})"></span>`;
      }
      html += '</div>';

      // Nucleotide table
      html += '<table class="stats-table">';
      for (const base of ['A', 'T', 'G', 'C']) {
        html += `<tr><td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${colors[base]};margin-right:6px;vertical-align:middle"></span>${base}</td><td>${counts[base].toLocaleString()} (${pct(counts[base])})</td></tr>`;
      }
      html += '</table>';

      // Molecular weight: sum individual nucleotide monophosphate weights for both strands,
      // subtract water lost per phosphodiester bond. For circular dsDNA: N bonds per strand.
      const nMW = { A: 331.22, T: 322.21, G: 347.22, C: 307.18 };
      const compBase = { A: 'T', T: 'A', G: 'C', C: 'G' };
      let mw = 0;
      for (const b of ['A', 'T', 'G', 'C']) {
        // Sense strand nucleotide + its complement on the antisense strand
        mw += counts[b] * (nMW[b] + nMW[compBase[b]]);
      }
      // Subtract water for phosphodiester bonds: N bonds per strand for circular, (N-1) for linear
      const isCircular = viewMode === 'circular' || !viewMode;
      const bondsPerStrand = isCircular ? resolved : Math.max(0, resolved - 1);
      mw -= bondsPerStrand * 2 * 18.02;
      // Ambiguous bases: use average (dNMP ≈ 327 Da sense + 327 Da complement)
      if (ambiguous > 0) mw += ambiguous * (327.0 * 2 - 2 * 18.02);
      const mwFormula = 'Sum of nucleotide monophosphate weights (dAMP 331.2, dTMP 322.2, dGMP 347.2, dCMP 307.2 Da) for both strands. Each phosphodiester bond releases one water molecule (18.02 Da), subtracted per bond. ' + (isCircular ? 'Circular DNA has N bonds per strand (no free ends).' : 'Linear DNA has N\u22121 bonds per strand.');
      html += '<div class="stats-section-title">Properties</div>';
      html += '<table class="stats-table">';
      if (mw >= 1e6) {
        html += `<tr><td data-tip="${mwFormula}">Est. MW (dsDNA)</td><td>${(mw / 1e6).toFixed(2)} MDa</td></tr>`;
      } else {
        html += `<tr><td data-tip="${mwFormula}">Est. MW (dsDNA)</td><td>${(mw / 1e3).toFixed(1)} kDa</td></tr>`;
      }
      // Tm estimate (basic: 2(A+T) + 4(G+C) for short, or 64.9 + 41*(G+C-16.4)/N for long)
      if (seq.length <= 30) {
        const tm = 2 * at + 4 * gc;
        html += `<tr><td data-tip="Tm = 2(A+T) + 4(G+C) (Wallace rule, for oligos \u226430 bp)">Est. Tm</td><td>${tm} °C</td></tr>`;
      } else {
        const tm = 64.9 + 41 * (gc - 16.4) / seq.length;
        html += `<tr><td data-tip="Tm = 64.9 + 41 \u00d7 (nGC \u2212 16.4) / N (Marmur\u2013Doty, for sequences >30 bp)">Est. Tm</td><td>${tm.toFixed(1)} °C</td></tr>`;
      }
      html += '</table>';
    } else {
      html += `<tr><td colspan="2" style="color:var(--text-muted)">No sequence - enter one for composition stats</td></tr>`;
      html += '</table>';
    }

    // Features & markers summary
    const visFeatures = features.filter(f => f.visible !== false);
    const visMarkers = markers.filter(m => m.visible !== false);
    html += '<div class="stats-section-title">Annotations</div>';
    html += '<table class="stats-table">';
    html += `<tr><td>Features</td><td>${visFeatures.length}${visFeatures.length !== features.length ? ' / ' + features.length + ' total' : ''}</td></tr>`;

    // Feature type breakdown
    const typeCounts = {};
    visFeatures.forEach(f => { typeCounts[f.type] = (typeCounts[f.type] || 0) + 1; });
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      html += `<tr><td style="padding-left:12px;color:var(--text-secondary)">${escHtml(type)}</td><td>${count}</td></tr>`;
    });

    html += `<tr><td>Markers</td><td>${visMarkers.length}${visMarkers.length !== markers.length ? ' / ' + markers.length + ' total' : ''}</td></tr>`;

    // Total annotated bp (merge overlapping regions)
    if (hasSeq && visFeatures.length > 0) {
      // Convert features to linear intervals, splitting wrap-around features
      const intervals = [];
      visFeatures.forEach(f => {
        if (f.end >= f.start) {
          intervals.push([f.start, f.end]);
        } else {
          intervals.push([f.start, total]);
          intervals.push([1, f.end]);
        }
      });
      // Sort by start, merge overlapping
      intervals.sort((a, b) => a[0] - b[0]);
      const merged = [];
      for (const iv of intervals) {
        if (merged.length > 0 && iv[0] <= merged[merged.length - 1][1]) {
          merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]);
        } else {
          merged.push([iv[0], iv[1]]);
        }
      }
      let annotatedBp = 0;
      for (const [s, e] of merged) annotatedBp += e - s;
      const coverage = total > 0 ? (annotatedBp / total * 100).toFixed(1) : 0;
      html += `<tr><td>Annotated</td><td>${annotatedBp.toLocaleString()} bp (${coverage}%)</td></tr>`;
    }
    html += '</table>';

    return html;
  }

  $toolbarBp.addEventListener('click', e => {
    e.stopPropagation();
    const wasOpen = statsPopover.classList.contains('open');
    closeAllPopovers();
    if (wasOpen) return;
    statsBody.innerHTML = buildStatsContent();
    // Position below the button, matching info popover gap
    const btn = $toolbarBp;
    const container = $mapContainer;
    const btnRect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    let left = btnRect.left - containerRect.left + btnRect.width / 2 - 150; // 150 = half of 300px width
    left = Math.max(8, Math.min(left, containerRect.width - 308));
    statsPopover.style.left = left + 'px';
    statsPopover.style.top = '56px';
    statsPopover.style.display = '';
    // Trigger reflow then add open class for transition
    statsPopover.offsetHeight;
    statsPopover.classList.add('open');
  });

  registerDismiss(statsPopover, () => closePopover(statsPopover), ['#toolbar-bp']);
  $('stats-close').addEventListener('click', () => {
    statsPopover.classList.remove('open');
    statsPopover.style.display = 'none';
  });

  // --- GC track controls ---
  function readGcCfg() {
    pushUndoDebounced();
    gcTrackCfg.show = $gcShow.checked;
    gcTrackCfg.windowSize = parseInt($('gc-window').value) || 50;
    gcTrackCfg.height = parseInt($('gc-height').value) || 30;
    gcTrackCfg.opacity = (parseInt($('gc-opacity').value) || 50) / 100;
    gcTrackCfg.colorAbove = $('gc-color-above').value;
    gcTrackCfg.colorBelow = $('gc-color-below').value;
    debouncedRender();
  }
  function syncGcUi() {
    $gcShow.checked = gcTrackCfg.show;
    $('gc-window').value = gcTrackCfg.windowSize;
    $('gc-height').value = gcTrackCfg.height;
    $('gc-opacity').value = Math.round(gcTrackCfg.opacity * 100);
    $('gc-color-above').value = gcTrackCfg.colorAbove;
    $('gc-color-below').value = gcTrackCfg.colorBelow;
  }
  ['gc-show'].forEach(id => {
    $(id).addEventListener('change', readGcCfg);
  });
  ['gc-window', 'gc-height', 'gc-opacity'].forEach(id => {
    $(id).addEventListener('input', readGcCfg);
  });
  ['gc-color-above', 'gc-color-below'].forEach(id => {
    $(id).addEventListener('change', readGcCfg);
  });

  function updateGcSectionState() {
    const sec = $('gc-section');
    const disabled = inputMode !== 'sequence';
    sec.classList.toggle('gc-disabled', disabled);
    sec.querySelector('.gc-disabled-hint').style.display = disabled ? '' : 'none';
    if (disabled) {
      gcTrackCfg.show = false;
      $gcShow.checked = false;
    }
  }

  // Slider+number sync helper
  function syncPair(sliderId, numId, cb) {
    const s = $(sliderId);
    const n = $(numId);
    s.addEventListener('input', () => { n.value = s.value; cb(); });
    n.addEventListener('input', () => { s.value = n.value; cb(); });
  }

  // --- Tick mark controls ---
  function syncSliderNum(sliderId, numId) {
    const slider = $(sliderId);
    const num = $(numId);
    slider.addEventListener('input', () => { num.value = slider.value; readTickCfg(); });
    num.addEventListener('input', () => {
      slider.value = num.value;
      readTickCfg();
    });
  }

  function readTickCfg() {
    pushUndoDebounced();
    tickCfg.majorShow = $tickMajorShow.checked;
    tickCfg.majorInterval = parseInt($tickMajorInterval.value) || 0;
    tickCfg.majorLabels = $tickMajorLabels.checked;
    tickCfg.majorLen = parseFloat($tickMajorLen.value) || 8;
    tickCfg.majorWidth = parseFloat($tickMajorWidth.value) || 1.5;
    tickCfg.majorColor = $tickMajorColor.value;
    tickCfg.labelFormat = $tickLabelFormat.querySelector('.active')?.dataset.fmt || 'short';
    tickCfg.labelSize = parseFloat($tickLabelSize.value) || 10;
    tickCfg.labelColor = $tickLabelColor.value;
    tickCfg.minorShow = $tickMinorShow.checked;
    tickCfg.minorInterval = parseInt($tickMinorInterval.value) || 0;
    tickCfg.minorLabels = $tickMinorLabels.checked;
    tickCfg.minorLen = parseFloat($tickMinorLen.value) || 4;
    tickCfg.minorWidth = parseFloat($tickMinorWidth.value) || 1;
    tickCfg.minorColor = $tickMinorColor.value;
    tickCfg.minorLabelColor = $tickMinorLabelColor.value;
    tickCfg.majorDirection = $tickMajorDirection.value;
    tickCfg.minorDirection = $tickMinorDirection.value;
    debouncedRender();
  }

  // Wire checkboxes, color pickers, selects
  ['tick-major-show','tick-major-labels','tick-minor-show','tick-minor-labels'].forEach(id => {
    $(id).addEventListener('change', readTickCfg);
  });
  ['tick-major-color','tick-label-color','tick-minor-color','tick-minor-label-color'].forEach(id => {
    $(id).addEventListener('input', readTickCfg);
  });
  $tickMajorInterval.addEventListener('input', readTickCfg);
  $tickMinorInterval.addEventListener('input', readTickCfg);
  $tickMajorDirection.addEventListener('change', readTickCfg);
  $tickMinorDirection.addEventListener('change', readTickCfg);
  $tickLabelFormat.addEventListener('click', e => {
    const btn = e.target.closest('button[data-fmt]');
    if (!btn) return;
    $tickLabelFormat.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    readTickCfg();
  });

  // Wire slider+number pairs
  syncSliderNum('tick-major-len', 'tick-major-len-num');
  syncSliderNum('tick-major-width', 'tick-major-width-num');
  syncSliderNum('tick-label-size', 'tick-label-size-num');
  syncSliderNum('tick-minor-len', 'tick-minor-len-num');
  syncSliderNum('tick-minor-width', 'tick-minor-width-num');

  // --- Center label toggles ---


  // --- Add-feature color picker ---
  function buildColorPicker(containerOrId, activeColor, onSelect) {
    const container = typeof containerOrId === 'string' ? $(containerOrId) : containerOrId;
    container.innerHTML = '';
    container.classList.add('color-picker-enhanced');
    const activeLc = (activeColor || '#000000').toLowerCase();
    const isPreset = COLORS.map(c => c.toLowerCase()).includes(activeLc);

    function selectColor(hex, el) {
      container.querySelectorAll('.color-opt').forEach(x => x.classList.remove('active'));
      if (el) el.classList.add('active');
      updatePreview(hex);
      hexInput.value = hex;
      onSelect(hex);
      addRecentColor(hex);
    }

    function makeSwatch(hex, name, isActive) {
      const d = document.createElement('div');
      d.className = 'color-opt' + (isActive ? ' active' : '');
      d.style.background = hex;
      d.dataset.color = hex;
      d.title = name || hex;
      d.tabIndex = 0;
      d.setAttribute('role', 'button');
      d.setAttribute('aria-label', name || hex);
      d.addEventListener('click', () => selectColor(hex, d));
      d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.click(); } });
      return d;
    }

    // --- Active color preview strip ---
    const preview = document.createElement('div');
    preview.className = 'cp-preview';
    const previewSwatch = document.createElement('div');
    previewSwatch.className = 'cp-preview-swatch';
    previewSwatch.style.background = activeLc;
    const previewHex = document.createElement('span');
    previewHex.className = 'cp-preview-hex';
    previewHex.textContent = activeLc;
    previewHex.title = 'Click to copy';
    previewHex.addEventListener('click', () => {
      navigator.clipboard.writeText(previewHex.textContent).then(() => {
        previewHex.textContent = 'Copied!';
        setTimeout(() => { previewHex.textContent = hexInput.value; }, 1000);
      }).catch(() => {});
    });
    preview.appendChild(previewSwatch);
    preview.appendChild(previewHex);
    container.appendChild(preview);

    function updatePreview(hex) {
      previewSwatch.style.background = hex;
      previewHex.textContent = hex;
    }

    // --- Preset colors (sorted by hue) ---
    const presetLabel = document.createElement('div');
    presetLabel.className = 'cp-section-label';
    presetLabel.textContent = 'Presets';
    container.appendChild(presetLabel);

    const presetRow = document.createElement('div');
    presetRow.className = 'color-row';
    COLOR_MAP.forEach(({ hex, name }) => {
      presetRow.appendChild(makeSwatch(hex, name, hex.toLowerCase() === activeLc));
    });
    container.appendChild(presetRow);

    // --- Recently used colors ---
    const recentFiltered = recentColors.filter(c => !COLORS.map(x => x.toLowerCase()).includes(c));
    if (recentFiltered.length > 0) {
      const recentLabel = document.createElement('div');
      recentLabel.className = 'cp-section-label';
      recentLabel.textContent = 'Recent';
      container.appendChild(recentLabel);

      const recentRow = document.createElement('div');
      recentRow.className = 'color-row';
      recentFiltered.forEach(hex => {
        recentRow.appendChild(makeSwatch(hex, hex, hex === activeLc));
      });
      container.appendChild(recentRow);
    }

    // --- Hex input + custom picker + eyedropper ---
    const toolRow = document.createElement('div');
    toolRow.className = 'cp-tool-row';

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'cp-hex-input';
    hexInput.value = activeLc;
    hexInput.placeholder = '#000000';
    hexInput.maxLength = 7;
    hexInput.spellcheck = false;
    hexInput.addEventListener('input', () => {
      let v = hexInput.value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        container.querySelectorAll('.color-opt').forEach(x => x.classList.remove('active'));
        updatePreview(v.toLowerCase());
        onSelect(v.toLowerCase());
        addRecentColor(v.toLowerCase());
      }
    });
    hexInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        let v = hexInput.value.trim();
        if (!v.startsWith('#')) v = '#' + v;
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          selectColor(v.toLowerCase(), null);
        }
        hexInput.blur();
      }
    });
    toolRow.appendChild(hexInput);

    // Full color picker button (opens tabbed popover)
    const pickerBtn = document.createElement('button');
    pickerBtn.className = 'cp-tool-btn';
    pickerBtn.title = 'More colors';
    pickerBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"/></svg>';
    pickerBtn.addEventListener('mousedown', e => e.stopPropagation());
    pickerBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const fakeInput = {
        value: hexInput.value || activeLc,
        getBoundingClientRect: () => pickerBtn.getBoundingClientRect()
      };
      openColorPicker(fakeInput, c => {
        selectColor(c, null);
      });
    });
    toolRow.appendChild(pickerBtn);

    // Eyedropper button (if supported)
    if (window.EyeDropper) {
      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'cp-tool-btn';
      eyeBtn.title = 'Pick from screen';
      eyeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22l1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="M14.5 5.5l4-4a1.4 1.4 0 0 1 2 2l-4 4"/><path d="M12 8l4 4"/></svg>';
      eyeBtn.addEventListener('click', async e => {
        e.stopPropagation();
        try {
          const dropper = new EyeDropper();
          const result = await dropper.open();
          selectColor(result.sRGBHex.toLowerCase(), null);
        } catch(err) {}
      });
      toolRow.appendChild(eyeBtn);
    }

    container.appendChild(toolRow);
  }

  buildColorPicker('color-picker', addColor, c => { addColor = c; });

  // Add-feature type changes default color
  $('f-type').addEventListener('change', e => {
    addColor = TYPE_DEFAULTS[e.target.value] || COLORS[0];
    buildColorPicker('color-picker', addColor, c => { addColor = c; });
  });

  // Add-feature direction toggle
  document.querySelectorAll('#add-dir-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#add-dir-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      addDir = parseInt(btn.dataset.dir);
    });
  });

  // --- Add feature ---
  function showAddError(msg) {
    const el = $('add-error');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  function clearAddError() {
    const el = $('add-error');
    el.style.display = 'none';
  }

  function flashField(id) {
    const el = $(id);
    el.classList.add('input-error');
    setTimeout(() => el.classList.remove('input-error'), 2000);
  }

  $('add-feature-btn').addEventListener('click', () => {
    clearAddError();
    const name = $('f-name').value.trim();
    const type = $('f-type').value;
    const start = parseInt($('f-start').value);
    const end = parseInt($('f-end').value);
    const len = getLength();

    if (!name) {
      showAddError('Feature name is required.');
      flashField('f-name');
      return;
    }
    if (isNaN(start) || start < 1) {
      showAddError('Start must be at least 1.');
      flashField('f-start');
      return;
    }
    if (isNaN(end) || end < 1) {
      showAddError('End must be at least 1.');
      flashField('f-end');
      return;
    }
    if (start > len) {
      showAddError('Start (' + start + ') exceeds plasmid length (' + len + ' bp).');
      flashField('f-start');
      return;
    }
    if (end > len) {
      showAddError('End (' + end + ') exceeds plasmid length (' + len + ' bp).');
      flashField('f-end');
      return;
    }
    if (start === end) {
      showAddError('Start and end cannot be the same position.');
      flashField('f-start');
      flashField('f-end');
      return;
    }

    const addTrack = parseInt($('f-track').value) || 0;
    pushUndo();
    features.push({
      name, type, start, end, direction: addDir, color: addColor,
      ...FEATURE_DEFAULTS, track: addTrack
    });
    $('f-name').value = '';
    deselectFeature();
    render();
    renderFeatureList();
  });

  // --- Selection / Edit ---
  // Snapshot of feature state before editing, for cancel/revert
  let editSnapshot = null;

  function closeAllPopovers() {
    document.querySelectorAll('.popover-menu.open').forEach(el => closePopover(el));
    const sp = $('plasmid-stats-popover');
    if (sp && sp.classList.contains('open')) { sp.classList.remove('open'); sp.style.display = 'none'; }
    // Close export, info, theme popovers
    const ep = $('export-popover');
    if (ep) closePopover(ep);
    const ip = $('info-popover');
    if (ip) ip.classList.remove('open');
    const tp = $('theme-popover');
    if (tp) tp.classList.remove('open');
    const tc = $('tips-card');
    if (tc) tc.classList.remove('open');
    // Close toolbar overflow menu
    const om = $('toolbar-overflow-menu');
    if (om) om.classList.remove('open');
    activeRingIdx = null;
    // Close color picker popover
    closeColorPicker();
    // Unpin tooltip if pinned
    try { if (tooltipPinned) unpinTooltip(); } catch(_) {}
  }

  function collapseSection(targetId) {
    const h = document.querySelector('h3[data-target="' + targetId + '"]');
    const b = $(targetId);
    if (h && b && !h.classList.contains('collapsed')) {
      h.classList.add('collapsed');
      b.classList.add('collapsed');
    }
  }

  function collapseGcTrack() {
    collapseSection('gc-track-body');
    collapseSection('plasmid-body');
  }

  let _addPanelWasCollapsed = false; // track pre-edit collapsed state

  function ensurePanelSectionsVisible() {
    const h2 = $panel.querySelector('h2');
    const pt = document.querySelector('.panel-top');
    const pb = document.querySelector('.panel-bottom');
    const pf = document.querySelector('.panel-footer');
    if (h2) h2.style.display = '';
    if (pt) pt.style.display = '';
    if (pb) pb.style.display = '';
    if (pf) pf.style.display = '';
    $panel.scrollTop = 0;
  }

  // Scroll an element into view within its .tab-pane only, without
  // disturbing overflow:hidden ancestors like #panel.
  function scrollIntoPane(el, align) {
    const pane = el.closest('.tab-pane');
    if (!pane) return;
    const elTop = el.offsetTop - pane.offsetTop;
    const elBot = elTop + el.offsetHeight;
    if (align === 'start') {
      pane.scrollTop = elTop;
    } else {
      // 'nearest' - only scroll if out of view
      if (elTop < pane.scrollTop) pane.scrollTop = elTop;
      else if (elBot > pane.scrollTop + pane.clientHeight) pane.scrollTop = elBot - pane.clientHeight;
    }
  }

  function selectFeature(idx) {
    if (idx < 0 || idx >= features.length) return;
    if (selectedMarkerIdx >= 0) deselectMarker();
    if ($panel.classList.contains('re-expanded')) closeReModal();
    closeAllPopovers();
    ensurePanelSectionsVisible();
    collapseGcTrack();
    selectedIdx = idx;
    kbFocusList = 'features';
    kbFocusIdx = idx;
    editSnapshot = Object.assign({}, features[idx]);
    // Collapse add-feature section (remember if it was already collapsed)
    const addH3 = document.querySelector('h3[data-target="add-feature-body"]');
    const addBody = $('add-feature-body');
    _addPanelWasCollapsed = addH3 && addH3.classList.contains('collapsed');
    if (addH3 && addBody && !_addPanelWasCollapsed) {
      addH3.classList.add('collapsed');
      addBody.classList.add('collapsed');
      addH3.setAttribute('aria-expanded', 'false');
    }
    switchTab('features-tab');
    renderFeatureList();
    // Scroll selected feature into view within the tab pane only
    requestAnimationFrame(() => {
      const li = $featureList.querySelector(`li[data-fidx="${idx}"]`);
      if (li) scrollIntoPane(li, 'start');
    });
    render();
  }

  function cleanupFontPickers(container) {
    if (!container) return;
    container.querySelectorAll('.font-picker').forEach(fp => { if (fp._cleanup) fp._cleanup(); });
  }

  function deselectFeature() {
    cleanupFontPickers($featureList);
    selectedIdx = -1;
    editSnapshot = null;
    ensurePanelSectionsVisible();
    // Restore add-feature section if it wasn't collapsed before editing
    if (!_addPanelWasCollapsed) {
      const addH3 = document.querySelector('h3[data-target="add-feature-body"]');
      const addBody = $('add-feature-body');
      if (addH3 && addBody) {
        addH3.classList.remove('collapsed');
        addBody.classList.remove('collapsed');
        addH3.setAttribute('aria-expanded', 'true');
      }
    }
    renderFeatureList();
    render();
  }

  function cancelEdit() {
    if (selectedIdx >= 0 && editSnapshot) {
      Object.assign(features[selectedIdx], editSnapshot);
    }
    deselectFeature();
  }

  // Read all edit controls and apply to the selected feature, then re-render map only
  function applyEditsToFeature() {
    if (selectedIdx < 0) return;
    pushUndoDebounced();
    const f = features[selectedIdx];
    const panel = $('inline-edit-panel');
    if (!panel) return;

    f.name = panel.querySelector('#e-name').value.trim() || f.name;
    f.type = panel.querySelector('#e-type').value;
    f.start = parseInt(panel.querySelector('#e-start').value) || f.start;
    f.end = parseInt(panel.querySelector('#e-end').value) || f.end;
    f.track = parseInt(panel.querySelector('#e-track').value) || 0;
    f.opacity = parseFloat(panel.querySelector('#e-opacity').value) / 100;
    f.border = parseFloat(panel.querySelector('#e-border').value);
    f.borderColor = panel.querySelector('#e-border-color').value;
    f.borderStyle = panel.querySelector('#e-border-style').value;
    // Read shape controls - layout differs for direction=none vs directional
    const endShapeEl = panel.querySelector('#e-end-shape');
    const endShapeFullEl = panel.querySelector('#e-end-shape-full');
    const startShapeEl = panel.querySelector('#e-start-shape');
    const tailShapeEl = panel.querySelector('#e-tail-shape');

    if (endShapeFullEl) {
      // Direction=none: unified start/end shape dropdowns (flat/pointed/flared/notched/interior)
      const endVal = endShapeFullEl.value;
      f.arrow = (endVal === 'pointed' || endVal === 'flared' || endVal === 'interior');
      f.arrowStyle = endVal === 'flared' ? 'flared' : (endVal === 'interior' ? 'interior' : 'pointed');
      f.endNotch = endVal === 'notched';

      const startVal = startShapeEl ? startShapeEl.value : 'flat';
      f.startArrow = (startVal === 'pointed' || startVal === 'flared' || startVal === 'interior');
      f.startArrowStyle = startVal === 'flared' ? 'flared' : (startVal === 'interior' ? 'interior' : 'pointed');
      f.tailCut = startVal === 'notched';
    } else {
      // Directional: separate end shape + tail dropdowns
      const endShape = endShapeEl ? endShapeEl.value : 'pointed';
      f.arrow = endShape !== 'flat';
      f.arrowStyle = endShape === 'flared' ? 'flared' : (endShape === 'interior' ? 'interior' : 'pointed');
      f.tailCut = tailShapeEl ? tailShapeEl.value === 'notched' : false;
      // Clear direction=none-only properties
      f.startArrow = false;
      f.startArrowStyle = 'pointed';
      f.endNotch = false;
    }
    f.showLabel = panel.querySelector('#e-label').checked;
    f.labelPos = panel.querySelector('#e-label-pos').value;
    f.leaderLine = panel.querySelector('#e-leader-line').value;
    f.labelOrientation = panel.querySelector('#e-label-orient').value;
    f.labelColor = panel.querySelector('#e-label-color').value;
    f.labelSize = parseInt(panel.querySelector('#e-label-size').value) || 11;
    f.labelMaxWidth = parseInt(panel.querySelector('#e-label-wrap').value) || 0;
    f.labelFont = panel.querySelector('#e-label-font').value;

    const dirBtn = panel.querySelector('.dir-toggle button.active');
    if (dirBtn) f.direction = parseInt(dirBtn.dataset.dir);

    // Color is read from the hex input in the enhanced picker
    const hexInp = panel.querySelector('#edit-color-picker .cp-hex-input');
    if (hexInp && /^#[0-9a-fA-F]{6}$/.test(hexInp.value)) {
      f.color = hexInp.value.toLowerCase();
    } else {
      const colorEl = panel.querySelector('#edit-color-picker .color-opt.active');
      if (colorEl && colorEl.dataset.color) f.color = colorEl.dataset.color;
    }

    // Update display values
    const opVal = panel.querySelector('#e-opacity-val');
    if (opVal) opVal.textContent = Math.round(f.opacity * 100) + '%';
    const bVal = panel.querySelector('#e-border-val');
    if (bVal) bVal.textContent = f.border;
    const wrapVal = panel.querySelector('#e-label-wrap-val');
    if (wrapVal) wrapVal.textContent = f.labelMaxWidth ? f.labelMaxWidth + ' chars' : 'Auto';

    // Update the sidebar list item to reflect name/range/color changes
    const li = document.querySelector(`#feature-list li[data-fidx="${selectedIdx}"]`);
    if (li) {
      const nameSpan = li.querySelector('.fname');
      const rangeSpan = li.querySelectorAll('.frange');
      const swatch = li.querySelector('.swatch');
      if (nameSpan) nameSpan.textContent = f.name;
      if (rangeSpan[0]) rangeSpan[0].textContent = f.start + '-' + f.end;
      if (swatch) swatch.style.background = f.color;
    }

    debouncedRender();
  }

  function buildInlineEditPanel(f) {
    const div = document.createElement('li');
    div.id = 'inline-edit-panel';
    div.className = 'inline-edit';
    div.addEventListener('click', e => e.stopPropagation());

    div.innerHTML = `
      <h3>Edit: ${escHtml(f.name)}</h3>
      <label>Name</label>
      <input type="text" id="e-name" value="${escHtml(f.name)}" maxlength="60">
      <label>Type</label>
      <select id="e-type">
        <option value="gene"${f.type==='gene'?' selected':''}>Gene / CDS</option>
        <option value="promoter"${f.type==='promoter'?' selected':''}>Promoter</option>
        <option value="terminator"${f.type==='terminator'?' selected':''}>Terminator</option>
        <option value="origin"${f.type==='origin'?' selected':''}>Origin of Replication</option>
        <option value="resistance"${f.type==='resistance'?' selected':''}>Resistance Marker</option>
        <option value="regulatory"${f.type==='regulatory'?' selected':''}>Regulatory</option>
        <option value="primer"${f.type==='primer'?' selected':''}>Primer Binding Site</option>
        <option value="misc"${f.type==='misc'?' selected':''}>Misc Feature</option>
      </select>
      <hr>
      <div class="two-col">
        <div><label>Start (bp)</label><input type="number" id="e-start" min="1" value="${f.start}"></div>
        <div><label>End (bp)</label><input type="number" id="e-end" min="1" value="${f.end}"></div>
      </div>
      <label>Direction</label>
      <div class="dir-toggle" id="edit-dir-toggle">
        <button data-dir="1" class="${f.direction===1?'active':''}">&#10145; Fwd</button>
        <button data-dir="0" class="${f.direction===0?'active':''}">&#9644; None</button>
        <button data-dir="-1" class="${f.direction===-1?'active':''}">&#11013; Rev</button>
      </div>
      <label>Track</label>
      <select id="e-track">
        <option value="-2"${(f.track||-0)===-2?' selected':''}>Inner 2</option>
        <option value="-1"${(f.track||0)===-1?' selected':''}>Inner 1</option>
        <option value="0"${(f.track||0)===0?' selected':''}>Backbone</option>
        <option value="1"${(f.track||0)===1?' selected':''}>Outer 1</option>
        <option value="2"${(f.track||0)===2?' selected':''}>Outer 2</option>
      </select>
      <hr>
      <label>Color</label>
      <div class="color-row" id="edit-color-picker"></div>
      <label>Opacity</label>
      <input type="range" id="e-opacity" min="0" max="100" step="5" value="${Math.round(f.opacity * 100)}" list="ticks-opacity">
      <span class="range-val" id="e-opacity-val">${Math.round(f.opacity * 100)}%</span>
      <label>Border Width</label>
      <input type="range" id="e-border" min="0" max="4" step="0.5" value="${f.border}" list="ticks-0-4">
      <span class="range-val" id="e-border-val">${f.border}</span>
      <div class="two-col">
        <div>
          <label>Border style</label>
          <select id="e-border-style">
            <option value="solid"${(f.borderStyle||'solid')==='solid'?' selected':''}>Solid</option>
            <option value="dashed"${f.borderStyle==='dashed'?' selected':''}>Dashed</option>
            <option value="dotted"${f.borderStyle==='dotted'?' selected':''}>Dotted</option>
          </select>
        </div>
        <div>
          <label>Border color</label>
          <input type="color" id="e-border-color" value="${f.borderColor || '#000000'}">
        </div>
      </div>
      <div id="e-shape-section"></div>
      <hr>
      <div class="check-row">
        <input type="checkbox" id="e-label"${f.showLabel?' checked':''}>
        <label for="e-label">Show label</label>
      </div>
      <div id="e-label-opts"${f.showLabel?'':' style="display:none"'}>
      <label>Label position</label>
      <select id="e-label-pos">
        <option value="on"${(f.labelPos||'on')==='on'?' selected':''}>On feature</option>
        ${viewMode === 'linear'
          ? `<option value="inside"${f.labelPos==='inside'?' selected':''}>Below</option>`
          : `<option value="inside"${f.labelPos==='inside'?' selected':''}>Inside (toward center)</option>
        <option value="outside"${f.labelPos==='outside'?' selected':''}>Outside</option>`}
      </select>
      <label>Label orientation</label>
      <select id="e-label-orient">
        <option value="curved"${(f.labelOrientation||'curved')==='curved'?' selected':''}>Follow arc</option>
        <option value="horizontal"${f.labelOrientation==='horizontal'?' selected':''}>Horizontal</option>
      </select>
      <label>Leader line</label>
      <select id="e-leader-line">
        <option value="never"${(f.leaderLine||'never')==='never'?' selected':''}>Off</option>
        <option value="auto"${f.leaderLine==='auto'?' selected':''}>Auto (when offset)</option>
        <option value="always"${f.leaderLine==='always'?' selected':''}>Always</option>
      </select>
      <div class="two-col" style="align-items:end">
        <div><label>Text color</label><input type="color" id="e-label-color" value="${f.labelColor || '#1e293b'}"></div>
        <div><label>Text size</label><div class="slider-num-row"><input type="range" id="e-label-size" min="6" max="24" step="1" value="${f.labelSize || 11}"><input type="number" id="e-label-size-num" min="6" max="24" value="${f.labelSize || 11}" style="width:54px"></div></div>
      </div>
      <label>Wrap width <span class="range-val" id="e-label-wrap-val">${f.labelMaxWidth ? f.labelMaxWidth + ' chars' : 'Auto'}</span></label>
      <input type="range" id="e-label-wrap" min="0" max="40" step="1" value="${f.labelMaxWidth || 0}">
      <label>Font</label>
      <select id="e-label-font">
        ${FONTS.map(fn => `<option value="${fn}"${(f.labelFont||'sans-serif')===fn?' selected':''}>${fn}</option>`).join('')}
      </select>
      </div>
      <hr>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn-primary btn-sm" id="edit-done-btn" style="flex:1">Done</button>
        <button class="btn-secondary btn-sm" id="edit-cancel-btn" style="flex:1">Cancel</button>
        <button class="btn-danger btn-sm" id="edit-delete-btn">Delete</button>
      </div>
    `;

    // Build color picker (reuse shared builder) - use div.querySelector since div is detached
    buildColorPicker(div.querySelector('#edit-color-picker'), f.color, c => {
      applyEditsToFeature();
    });

    // Build shape controls based on current direction
    function buildShapeSection() {
      const sec = div.querySelector('#e-shape-section');
      if (!sec) return;
      const dirBtn = div.querySelector('#edit-dir-toggle button.active');
      const dir = dirBtn ? parseInt(dirBtn.dataset.dir) : f.direction;
      const isNoneDir = dir === 0;

      // Compute current end shape value
      const endVal = f.arrow === false ? 'flat'
        : f.endNotch ? 'notched'
        : (f.arrowStyle === 'flared' ? 'flared' : (f.arrowStyle === 'interior' ? 'interior' : 'pointed'));
      // Compute current start shape value
      const startVal = f.tailCut ? 'notched'
        : f.startArrow ? (f.startArrowStyle === 'flared' ? 'flared' : (f.startArrowStyle === 'interior' ? 'interior' : 'pointed'))
        : 'flat';

      const shapeOpts = (sel) => `
        <option value="flat"${sel==='flat'?' selected':''}>Flat</option>
        <option value="pointed"${sel==='pointed'?' selected':''}>Pointed</option>
        <option value="flared"${sel==='flared'?' selected':''}>Flared</option>
        <option value="interior"${sel==='interior'?' selected':''}>Interior</option>
        <option value="notched"${sel==='notched'?' selected':''}>Notched</option>`;

      if (isNoneDir) {
        sec.innerHTML = `<div class="two-col">
          <div><label>Start shape</label><select id="e-start-shape">${shapeOpts(startVal)}</select></div>
          <div><label>End shape</label><select id="e-end-shape-full">${shapeOpts(endVal)}</select></div>
        </div>`;
      } else {
        sec.innerHTML = `<div class="two-col">
          <div>
            <label>End shape</label>
            <select id="e-end-shape">
              <option value="flat"${f.arrow===false?' selected':''}>Flat</option>
              <option value="pointed"${f.arrow!==false&&(f.arrowStyle||'pointed')==='pointed'?' selected':''}>Pointed</option>
              <option value="flared"${f.arrow!==false&&f.arrowStyle==='flared'?' selected':''}>Flared</option>
              <option value="interior"${f.arrow!==false&&f.arrowStyle==='interior'?' selected':''}>Interior</option>
            </select>
          </div>
          <div>
            <label>Tail</label>
            <select id="e-tail-shape">
              <option value="flat"${!f.tailCut?' selected':''}>Flat</option>
              <option value="notched"${f.tailCut?' selected':''}>Notched</option>
            </select>
          </div>
        </div>`;
      }
      // Wire new selects for live preview
      sec.querySelectorAll('select').forEach(sel => {
        sel.addEventListener('change', () => applyEditsToFeature());
      });
    }
    buildShapeSection();

    // Direction toggle
    div.querySelectorAll('#edit-dir-toggle button').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        div.querySelectorAll('#edit-dir-toggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        buildShapeSection();
        applyEditsToFeature();
      });
    });

    // Toggle label options visibility when checkbox changes
    const eLabelCheck = div.querySelector('#e-label');
    const eLabelOpts = div.querySelector('#e-label-opts');
    eLabelCheck.addEventListener('change', () => {
      eLabelOpts.style.display = eLabelCheck.checked ? '' : 'none';
    });

    // Font picker for label font
    fontPicker(div.querySelector('#e-label-font'));

    // Sync label size slider <-> number
    const labelSizeSlider = div.querySelector('#e-label-size');
    const labelSizeNum = div.querySelector('#e-label-size-num');
    labelSizeSlider.addEventListener('input', () => {
      labelSizeNum.value = labelSizeSlider.value;
    });
    labelSizeNum.addEventListener('input', () => {
      let v = parseInt(labelSizeNum.value);
      if (!isNaN(v)) {
        v = Math.max(6, Math.min(24, v));
        labelSizeSlider.value = v;
      }
    });

    // Wire all inputs/selects/checkboxes for live preview
    const liveInputs = div.querySelectorAll('input, select');
    liveInputs.forEach(el => {
      const evt = (el.type === 'checkbox' || el.type === 'color' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evt, () => applyEditsToFeature());
    });

    // Buttons
    div.querySelector('#edit-done-btn').addEventListener('click', e => {
      e.stopPropagation();
      editSnapshot = null; // commit - no revert
      deselectFeature();
    });
    div.querySelector('#edit-cancel-btn').addEventListener('click', e => {
      e.stopPropagation();
      cancelEdit();
    });
    div.querySelector('#edit-delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      showConfirm(`Delete <strong>${escHtml(f.name)}</strong>?`, () => {
        pushUndo();
        features.splice(selectedIdx, 1);
        editSnapshot = null;
        deselectFeature();
      });
    });

    return div;
  }

  // --- Render SVG ---
  let _renderPending = false;
  let _renderRafId = 0;
  let _lastSvgHtml = '';
  let _lastLinearHtml = '';
  function scheduleRender() {
    if (_renderPending) return;
    _renderPending = true;
    _renderRafId = requestAnimationFrame(() => { _renderPending = false; _render(); });
  }
  // Debounced render for rapid input (color pickers, sliders)
  let _debouncedRenderTimer = 0;
  function debouncedRender(ms) {
    clearTimeout(_debouncedRenderTimer);
    _debouncedRenderTimer = setTimeout(() => scheduleRender(), ms || 30);
  }
  // Direct render for cases that need immediate DOM (e.g. initial load, list rebuilds)
  function showEmptyState() {
    const svg = $svg;
    const lsvg = $linearSvg;
    svg.innerHTML = '';
    if (lsvg) lsvg.innerHTML = '';
    _lastSvgHtml = '';
    _lastLinearHtml = '';
    $featureList.innerHTML = '';
    $markerList.innerHTML = '';
    $panel.classList.add('empty-state');
    $mapContainer.classList.add('empty-state');
  }

  function hideEmptyState() {
    $panel.classList.remove('empty-state');
    $mapContainer.classList.remove('empty-state');
  }

  function render() { _render(); }

  function flashFeatureArc(idx) {
    requestAnimationFrame(() => {
      const svg = $svg;
      svg.querySelectorAll(`.feature-arc[data-idx="${idx}"]`).forEach(el => {
        el.classList.add('ring-moved');
        el.addEventListener('animationend', () => el.classList.remove('ring-moved'), { once: true });
      });
    });
  }
  // Render a marker label as curved (textPath) or horizontal.
  // Returns SVG string. Extracted from _render to avoid re-creating per marker.
  function renderMarkerLabel(angle, idx, labelText, labelR, fontSize, fontWeight, fontFamily, fillColor, orient, pathPrefix) {
    let out = '';
    const text = escHtml(labelText);
    if (orient === 'horizontal') {
      const lp = polarToCart(angle, labelR);
      const norm = ((angle % 360) + 360) % 360;
      let anc = 'middle', ox = 0, oy = 0;
      const pad = fontSize * 0.4;
      const isOuter = labelR > R;
      if (isOuter) {
        if (norm > 45 && norm < 135) { anc = 'start'; ox = pad; }
        else if (norm > 225 && norm < 315) { anc = 'end'; ox = -pad; }
        else if (norm >= 135 && norm <= 225) { oy = pad; }
        else { oy = -pad; }
      } else {
        if (norm > 45 && norm < 135) { anc = 'end'; ox = -pad; }
        else if (norm > 225 && norm < 315) { anc = 'start'; ox = pad; }
        else if (norm >= 135 && norm <= 225) { oy = -pad; }
        else { oy = pad; }
      }
      const mLabelRot = mapRotation !== 0 ? ` transform="rotate(${-mapRotation} ${lp.x} ${lp.y})"` : '';
      out += `<text x="${lp.x + ox}" y="${lp.y + oy}" text-anchor="${anc}" dominant-baseline="central" fill="${fillColor}" font-size="${fontSize}" font-weight="${fontWeight}" font-family="${fontFamily}" pointer-events="none"${mLabelRot}>${text}</text>`;
    } else {
      const pathId = pathPrefix + '-' + idx;
      const charW = fontSize * 0.6;
      const textW = labelText.length * charW;
      const circ = 2 * Math.PI * labelR;
      const halfSpanDeg = Math.max(15, (textW / circ) * 360 / 2 + 10);
      const midNorm = ((angle % 360) + 360) % 360;
      const flipArc = midNorm > 90 && midNorm < 270;

      let arcStart, arcEnd;
      if (flipArc) {
        arcStart = angle + halfSpanDeg;
        arcEnd = angle - halfSpanDeg;
      } else {
        arcStart = angle - halfSpanDeg;
        arcEnd = angle + halfSpanDeg;
      }

      if (flipArc) {
        const s = polarToCart(arcStart, labelR);
        const e = polarToCart(arcEnd, labelR);
        let sweep = arcStart - arcEnd;
        if (sweep < 0) sweep += 360;
        const large = sweep > 180 ? 1 : 0;
        out += `<defs><path id="${pathId}" d="M ${s.x} ${s.y} A ${labelR} ${labelR} 0 ${large} 0 ${e.x} ${e.y}" fill="none"/></defs>`;
      } else {
        const arcD = describeArc(labelR, Math.min(arcStart, arcEnd), Math.max(arcStart, arcEnd));
        out += `<defs><path id="${pathId}" d="${arcD}" fill="none"/></defs>`;
      }

      out += `<text pointer-events="none" font-size="${fontSize}" font-weight="${fontWeight}" font-family="${fontFamily}" fill="${fillColor}">`;
      out += `<textPath href="#${pathId}" startOffset="50%" text-anchor="middle" dominant-baseline="central">${text}</textPath>`;
      out += `</text>`;
    }
    return out;
  }

  function _render() {
    const svg = $svg;
    const total = getLength();
    const name = $plasmidName.value;
    const bpEl = $toolbarBp;
    if (bpEl) bpEl.textContent = total > 0 ? total.toLocaleString('en-US') + ' bp' : '';
    let html = '';

    // Open rotation group (everything except center text rotates)
    if (mapRotation !== 0) {
      html += `<g transform="rotate(${mapRotation} ${cx} ${cy})">`;
    }

    // Backbone
    const ri = R - trackW / 2, ro = R + trackW / 2;
    html += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${bbCfg.fill}" stroke-width="${trackW}" opacity="${bbCfg.opacity}" pointer-events="none"/>`;
    if (bbCfg.edgeWidth > 0) {
      html += `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="none" stroke="${bbCfg.edge}" stroke-width="${bbCfg.edgeWidth}" opacity="${bbCfg.opacity}" pointer-events="none"/>`;
      html += `<circle cx="${cx}" cy="${cy}" r="${ro}" fill="none" stroke="${bbCfg.edge}" stroke-width="${bbCfg.edgeWidth}" opacity="${bbCfg.opacity}" pointer-events="none"/>`;
    }
    // Backbone hover highlight + hit area (on top of backbone, under features)
    html += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(99,102,241,.12)" stroke-width="${trackW + 4}" class="backbone-hover-ring"/>`;
    html += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="transparent" stroke-width="${Math.max(trackW, 14)}" class="backbone-hit" style="cursor:pointer"/>`;

    // Additional tracks (non-zero) - per-ring styles, only shown if track has features
    const usedTracks = getUsedTracks();
    const populatedTracks = new Set();
    features.forEach(f => { if (f.visible !== false) populatedTracks.add(f.track || 0); });
    usedTracks.forEach(t => {
      if (t === 0) return;
      if (!populatedTracks.has(t)) return; // hide empty rings
      const tg = getTrackGeometry(t);
      const rs = getRingStyle(t);
      html += `<circle cx="${cx}" cy="${cy}" r="${tg.R}" fill="none" stroke="${rs.fill}" stroke-width="${tg.trackW}" opacity="${rs.opacity}" pointer-events="none"/>`;
      if (rs.edgeWidth > 0) {
        html += `<circle cx="${cx}" cy="${cy}" r="${tg.ri}" fill="none" stroke="${rs.edge}" stroke-width="${rs.edgeWidth}" opacity="${rs.opacity}" pointer-events="none"/>`;
        html += `<circle cx="${cx}" cy="${cy}" r="${tg.ro}" fill="none" stroke="${rs.edge}" stroke-width="${rs.edgeWidth}" opacity="${rs.opacity}" pointer-events="none"/>`;
      }
      // Hit area + hover ring for this ring
      html += `<circle cx="${cx}" cy="${cy}" r="${tg.R}" fill="none" stroke="rgba(99,102,241,.1)" stroke-width="${tg.trackW + 4}" class="ring-hover-ring" data-ring="${t}" pointer-events="none"/>`;
      html += `<circle cx="${cx}" cy="${cy}" r="${tg.R}" fill="none" stroke="transparent" stroke-width="${Math.max(tg.trackW, 14)}" class="ring-hit" data-ring="${t}" style="cursor:pointer"/>`;
    });

    // Compute outermost/innermost edges across all populated tracks
    let tickRo = ro, tickRi = ri;
    populatedTracks.forEach(t => {
      if (t === 0) return;
      const tg = getTrackGeometry(t);
      if (tg.ro > tickRo) tickRo = tg.ro;
      if (tg.ri < tickRi) tickRi = tg.ri;
    });

    // Tick hit area - ring just outside the outermost track
    const tickHitR = tickRo + (tickCfg.majorLen || 8) / 2 + 2;
    html += `<circle cx="${cx}" cy="${cy}" r="${tickHitR}" fill="none" stroke="transparent" stroke-width="${(tickCfg.majorLen || 8) + 8}" class="tick-hit" style="cursor:pointer"/>`;
    html += `<circle cx="${cx}" cy="${cy}" r="${tickHitR}" fill="none" stroke="rgba(99,102,241,.1)" stroke-width="${(tickCfg.majorLen || 8) + 4}" class="tick-hover-ring" pointer-events="none"/>`;

    // Ticks
    if (tickCfg.majorShow || tickCfg.minorShow) {
      const majorInt = tickCfg.majorInterval > 0
        ? tickCfg.majorInterval
        : niceRound(Math.ceil(total / calcTickCount(total)));

      // Helper: compute tick line endpoints based on direction
      function tickEndpoints(angle, len, dir) {
        if (dir === 'in') {
          return [{ p1: polarToCart(angle, tickRi - 2), p2: polarToCart(angle, tickRi - 2 - len) }];
        } else if (dir === 'both') {
          const half = len / 2;
          const mid = (ri + ro) / 2;
          return [{ p1: polarToCart(angle, mid + half), p2: polarToCart(angle, mid - half) }];
        } else if (dir === 'outandin') {
          return [
            { p1: polarToCart(angle, tickRo + 2), p2: polarToCart(angle, tickRo + 2 + len) },
            { p1: polarToCart(angle, tickRi - 2), p2: polarToCart(angle, tickRi - 2 - len) }
          ];
        } else {
          return [{ p1: polarToCart(angle, tickRo + 2), p2: polarToCart(angle, tickRo + 2 + len) }];
        }
      }

      function labelRadius(len, dir) {
        if (dir === 'in') return tickRi - 2 - len - 12;
        if (dir === 'both') return tickRo + 6 + len / 2;
        return tickRo + 2 + len + 12;
      }

      // Build occupied angular ranges from feature/marker labels that are
      // positioned outside the backbone (where tick labels live).
      // Labels with labelPos 'on' or 'inside' sit at a different radius
      // and don't conflict with tick labels.
      const occupiedRanges = [];
      features.forEach(f => {
        if (f.visible === false || f.showLabel === false) return;
        const labelPos = f.labelPos || 'on';
        // Only 'outside' feature labels and horizontal labels near ticks can overlap
        if (labelPos !== 'outside') return;
        let sa = bpToAngle(f.start - 1, total);
        let ea = f.start <= f.end ? bpToAngle(f.end, total) : bpToAngle(f.end, total) + 360;
        const midAngle = sa + (ea - sa) / 2;
        const lSize = f.labelSize || 11;
        const labelR = R + trackW / 2 + lSize * 0.6 + 6;
        const charW = lSize * 0.6;
        const textW = f.name.length * charW;
        const circ = 2 * Math.PI * Math.max(labelR, 1);
        const halfSpanDeg = Math.min((textW / circ) * 360 / 2 + 1, 180);
        const lo = ((midAngle - halfSpanDeg) % 360 + 360) % 360;
        const hi = ((midAngle + halfSpanDeg) % 360 + 360) % 360;
        occupiedRanges.push([lo, hi]);
      });
      // Marker labels always sit outside the backbone near tick labels
      markers.forEach(m => {
        if (m.visible === false) return;
        const a = bpToAngle(m.position, total);
        const mSize = m.fontSize || 10;
        const mText = m.outerText || m.name;
        const charW = mSize * 0.6;
        const textW = mText.length * charW;
        const mR = (R + trackW / 2) + (m.lineLen || 18) + 12;
        const circ = 2 * Math.PI * Math.max(mR, 1);
        const halfSpanDeg = Math.min((textW / circ) * 360 / 2 + 1, 180);
        const lo = ((a - halfSpanDeg) % 360 + 360) % 360;
        const hi = ((a + halfSpanDeg) % 360 + 360) % 360;
        occupiedRanges.push([lo, hi]);
      });

      function tickLabelOccluded(angle) {
        const a = ((angle % 360) + 360) % 360;
        for (const [s, e] of occupiedRanges) {
          if (s <= e) { if (a >= s && a <= e) return true; }
          else { if (a >= s || a <= e) return true; }
        }
        return false;
      }

      // Major ticks
      if (tickCfg.majorShow) {
        const majDir = tickCfg.majorDirection || 'out';
        for (let bp = 0; bp < total; bp += majorInt) {
          const angle = bpToAngle(bp, total);
          const segs = tickEndpoints(angle, tickCfg.majorLen, majDir);
          segs.forEach(({ p1, p2 }) => {
            html += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${tickCfg.majorColor}" stroke-width="${tickCfg.majorWidth}"/>`;
          });
          if (tickCfg.majorLabels && !tickLabelOccluded(angle)) {
            const pl = polarToCart(angle, labelRadius(tickCfg.majorLen, majDir));
            const tickRot = mapRotation !== 0 ? ` transform="rotate(${-mapRotation} ${pl.x} ${pl.y})"` : '';
            html += `<text x="${pl.x}" y="${pl.y}" text-anchor="middle" dominant-baseline="central" fill="${tickCfg.labelColor}" font-size="${tickCfg.labelSize}" font-family="sans-serif"${tickRot}>${formatBp(bp, tickCfg.labelFormat)}</text>`;
          }
        }
      }

      // Minor ticks
      if (tickCfg.minorShow) {
        const minDir = tickCfg.minorDirection || 'out';
        const minorInt = tickCfg.minorInterval > 0
          ? tickCfg.minorInterval
          : Math.max(1, Math.round(majorInt / 5));

        for (let bp = 0; bp < total; bp += minorInt) {
          if (bp % majorInt === 0) continue;
          const angle = bpToAngle(bp, total);
          const segs = tickEndpoints(angle, tickCfg.minorLen, minDir);
          segs.forEach(({ p1, p2 }) => {
            html += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${tickCfg.minorColor}" stroke-width="${tickCfg.minorWidth}"/>`;
          });
          if (tickCfg.minorLabels && !tickLabelOccluded(angle)) {
            const pl = polarToCart(angle, labelRadius(tickCfg.minorLen, minDir));
            const tickRot = mapRotation !== 0 ? ` transform="rotate(${-mapRotation} ${pl.x} ${pl.y})"` : '';
            html += `<text x="${pl.x}" y="${pl.y}" text-anchor="middle" dominant-baseline="central" fill="${tickCfg.minorLabelColor || tickCfg.labelColor}" font-size="${Math.max(6, tickCfg.labelSize - 2)}" font-family="sans-serif"${tickRot}>${formatBp(bp, tickCfg.labelFormat)}</text>`;
          }
        }
      }
    }

    // GC content track
    if (gcTrackCfg.show && inputMode === 'sequence') {
      const seq = getSequence();
      if (seq.length > 0) {
        const gcPoints = computeGcContent(seq, gcTrackCfg.windowSize);

        // Track geometry - sits inside the innermost used track
        let innermost = R - trackW / 2;
        usedTracks.forEach(t => {
          const tg = getTrackGeometry(t);
          if (tg.ri < innermost) innermost = tg.ri;
        });
        // Push further inward if any feature has inside labels or on-feature curved labels
        const hasInsideLabels = features.some(f => {
          if (f.visible === false || f.showLabel === false) return false;
          if (f.labelPos === 'inside') return true;
          // Curved 'on' labels sit on the arc - descenders extend inward
          if ((f.labelPos || 'on') === 'on' && (f.labelOrientation || 'curved') === 'curved') return true;
          return false;
        });
        const labelClearance = hasInsideLabels ? 18 : 0;
        const gcR = gcTrackCfg.radius || (innermost - gcTrackCfg.height / 2 - 4 - labelClearance);
        const halfH = gcTrackCfg.height / 2;

        // Draw baseline circle
        html += `<circle cx="${cx}" cy="${cy}" r="${gcR}" fill="none" stroke="#cbd5e1" stroke-width="0.5" opacity="0.4" pointer-events="none"/>`;

        // Segment GC data into above/below runs (shared helper)
        // Duplicate first point at 360° to close the circular loop
        const gcPtsCirc = gcPoints.slice();
        if (gcPtsCirc.length > 0) gcPtsCirc.push({ bp: total, gc: gcPtsCirc[0].gc });
        const { segments, norm: gcNorm } = segmentGcData(gcPtsCirc, p => ({ angle: bpToAngle(p.bp, total) }));

        function gcPt(angle, dev) { return polarToCart(angle, gcR + dev * halfH); }
        function basePt(angle) { return polarToCart(angle, gcR); }

        // Render each segment as a polygon: data points forward, baseline points reversed
        for (const seg of segments) {
          if (seg.points.length < 2) continue;
          let poly = '';
          for (const p of seg.points) { const pt = gcPt(p.angle, p.dev); poly += `${pt.x},${pt.y} `; }
          for (let j = seg.points.length - 1; j >= 0; j--) { const bp = basePt(seg.points[j].angle); poly += `${bp.x},${bp.y} `; }
          const color = seg.sign >= 0 ? gcTrackCfg.colorAbove : gcTrackCfg.colorBelow;
          html += `<polygon points="${poly.trim()}" fill="${color}" opacity="${gcTrackCfg.opacity}" pointer-events="none"/>`;
        }

        // Draw the data line on top
        const linePoints = gcNorm.map(p => { const pt = gcPt(p.angle, p.dev); return `${pt.x},${pt.y}`; }).join(' ');
        html += `<polyline points="${linePoints}" fill="none" stroke="#64748b" stroke-width="0.8" opacity="0.6" pointer-events="none"/>`;

        // GC% label omitted - the track itself conveys the data,
        // and overall GC% is available in the statistics popover.
      }
    }

    // Features - placedLabels tracks bounding rects of horizontal labels
    // so subsequent labels can be nudged to avoid overlap.
    const placedLabels = [];
    features.forEach((f, idx) => {
      if (f.visible === false) return;
      html += renderFeatureArc(f, idx, total, placedLabels);
    });

    // Per-marker outer/inner edge based on span setting.
    // 'all'      - extend through all tracks with a feature at this bp
    // 'backbone' - only cross the backbone ring (track 0)
    // 'custom'   - span from spanFrom track to spanTo track
    function markerEdges(m) {
      const bp = m.position;
      const span = m.span || 'all';

      if (span === 'backbone') {
        return { ro: R + trackW / 2, ri: R - trackW / 2 };
      }

      if (span === 'custom') {
        const fromT = m.spanFrom || 0;
        const toT = m.spanTo || 0;
        const lo = Math.min(fromT, toT);
        const hi = Math.max(fromT, toT);
        // Only include backbone if range actually covers track 0
        const includesBb = lo <= 0 && hi >= 0;
        let mRo = includesBb ? R + trackW / 2 : -Infinity;
        let mRi = includesBb ? R - trackW / 2 : Infinity;
        for (let t = lo; t <= hi; t++) {
          if (t === 0) continue;
          const tg = getTrackGeometry(t);
          if (tg.ro > mRo) mRo = tg.ro;
          if (tg.ri < mRi) mRi = tg.ri;
        }
        return { ro: mRo, ri: mRi };
      }

      // 'all' - original behavior: extend through occupied tracks
      let mRo = R + trackW / 2, mRi = R - trackW / 2;
      usedTracks.forEach(t => {
        if (t === 0) return;
        const tg = getTrackGeometry(t);
        const occupied = features.some(f => {
          if (f.visible === false) return false;
          if ((f.track || 0) !== t) return false;
          if (f.start <= f.end) return bp >= f.start && bp <= f.end;
          return bp >= f.start || bp <= f.end;
        });
        if (!occupied) return;
        if (tg.ro > mRo) mRo = tg.ro;
        if (tg.ri < mRi) mRi = tg.ri;
      });
      return { ro: mRo, ri: mRi };
    }

    // Markers - precompute tick direction for label clearance
    const majDir = tickCfg.majorDirection || 'out';
    const outwardTicks = majDir === 'out' || majDir === 'both' || majDir === 'outandin';
    const inwardTicks = majDir === 'in' || majDir === 'both' || majDir === 'outandin';
    // Estimate the widest tick label to reserve enough space
    const _maxTickBp = total;
    const _maxTickLabel = tickCfg.majorLabels ? formatBp(_maxTickBp, tickCfg.labelFormat) : '';
    const _tickLabelW = _maxTickLabel.length * tickCfg.labelSize * 0.6;
    let tickOuterEdge = 0, tickInnerEdge = 0;
    if (tickCfg.majorShow && outwardTicks) {
      tickOuterEdge = 2 + tickCfg.majorLen + (tickCfg.majorLabels ? 8 + _tickLabelW * 0.5 : 4);
    }
    if (tickCfg.majorShow && inwardTicks) {
      tickInnerEdge = 2 + tickCfg.majorLen + (tickCfg.majorLabels ? 8 + _tickLabelW * 0.5 : 4);
    }
    _tickInnerEdge = tickInnerEdge;

    // --- Pre-pass: compute stacked outer label positions for markers ---
    // Collect label info for all visible markers with outer labels.
    // When labels overlap angularly, nudge them apart along the arc
    // (tangentially) rather than pushing them radially outward.
    const _mLabelInfos = [];
    markers.forEach((m, idx) => {
      if (m.visible === false || !m.outerLabel) return;
      const angle = bpToAngle(m.position, total);
      const { ro } = markerEdges(m);
      const lineLen = m.lineLen || 18;
      const fontSize = m.outerSize || 10;
      const labelText = m.outerText || m.name;
      const charW = fontSize * 0.6;
      const textW = labelText.length * charW;
      const baseR = ro + lineLen + 4 + fontSize * 0.5;
      const circ = 2 * Math.PI * baseR;
      const angSpan = (textW / circ) * 360;
      // minGap: angular space this label needs (half-span each side)
      const minGap = (fontSize + 2) / circ * 360; // font-height based gap in degrees
      _mLabelInfos.push({ idx, angle, baseR, fontSize, angSpan, minGap, finalAngle: angle });
    });
    // Sort by angle for overlap detection
    _mLabelInfos.sort((a, b) => a.angle - b.angle);
    // Group into clusters of overlapping labels, then spread each
    // cluster symmetrically around its center
    const clusters = [];
    let curCluster = [];
    for (let i = 0; i < _mLabelInfos.length; i++) {
      if (curCluster.length === 0) { curCluster.push(_mLabelInfos[i]); continue; }
      const prev = curCluster[curCluster.length - 1];
      const cur = _mLabelInfos[i];
      const needed = prev.minGap / 2 + cur.minGap / 2;
      if (cur.angle - prev.angle < needed) {
        curCluster.push(cur);
      } else {
        clusters.push(curCluster);
        curCluster = [cur];
      }
    }
    if (curCluster.length) clusters.push(curCluster);
    // Spread each cluster symmetrically around its angular center
    clusters.forEach(cl => {
      if (cl.length <= 1) return;
      const centerAngle = cl.reduce((s, l) => s + l.angle, 0) / cl.length;
      const totalSpan = cl.reduce((s, l) => s + l.minGap, 0);
      let startAngle = centerAngle - totalSpan / 2;
      cl.forEach((label, i) => {
        label.finalAngle = startAngle + label.minGap / 2;
        startAngle += label.minGap;
      });
    });
    // Build lookup: marker idx → { finalAngle, baseR }
    const _mLabelPos = {};
    _mLabelInfos.forEach(info => {
      _mLabelPos[info.idx] = { finalAngle: info.finalAngle, baseR: info.baseR, nudged: Math.abs(info.finalAngle - info.angle) > 0.5 };
    });

    markers.forEach((m, idx) => {
      if (m.visible === false) return;
      const angle = bpToAngle(m.position, total);
      const { ro, ri } = markerEdges(m);
      const lineLen = m.lineLen || 18;
      const lineW = m.lineWidth || 1.5;
      const dashArray = dashArrayFor(m.lineStyle);
      const mSelected = idx === selectedMarkerIdx;

      html += `<g class="marker-group" data-marker-idx="${idx}" style="cursor:pointer">`;

      // Invisible wider hit area for easy clicking
      const h1 = polarToCart(angle, ri - 4);
      const h2 = polarToCart(angle, ro + lineLen + 4);
      html += `<line x1="${h1.x}" y1="${h1.y}" x2="${h2.x}" y2="${h2.y}" stroke="transparent" stroke-width="10"/>`;

      // Selection highlight
      if (mSelected) {
        const s1 = polarToCart(angle, ri - 4);
        const s2 = polarToCart(angle, ro + lineLen + 4);
        html += `<line x1="${s1.x}" y1="${s1.y}" x2="${s2.x}" y2="${s2.y}" stroke="#6366f1" stroke-width="8" stroke-linecap="round" opacity="0.2"/>`;
      }

      // Small tick across the track (only for solid lines - dashed/dotted skip it
      // so the gaps stay fully transparent)
      if (dashArray === 'none') {
        const t1 = polarToCart(angle, ri - 2);
        const t2 = polarToCart(angle, ro + 2);
        html += `<line x1="${t1.x}" y1="${t1.y}" x2="${t2.x}" y2="${t2.y}" stroke="${m.color}" stroke-width="${lineW}" opacity="0.5"/>`;
      }

      // Main line from inner edge through backbone and outward
      const p1 = polarToCart(angle, ri);
      const p2 = polarToCart(angle, ro + lineLen);
      html += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${m.color}" stroke-width="${lineW}"${dashArray !== 'none' ? ` stroke-dasharray="${dashArray}"` : ''}/>`;

      // Outer label with tangential stacking and leader lines
      if (m.outerLabel) {
        const outerOrient = m.outerOrientation === 'horizontal' ? 'horizontal' : 'curved';
        const outerFontSize = m.outerSize || 10;
        const pos = _mLabelPos[idx];
        const outerLabelR = pos ? pos.baseR : ro + lineLen + 4 + outerFontSize * 0.5;
        const labelAngle = pos ? pos.finalAngle : angle;
        // Leader line from marker line tip to displaced label
        if (pos && pos.nudged) {
          const leaderFrom = polarToCart(angle, ro + lineLen);
          const leaderTo = polarToCart(labelAngle, outerLabelR - outerFontSize * 0.6);
          html += `<line x1="${leaderFrom.x}" y1="${leaderFrom.y}" x2="${leaderTo.x}" y2="${leaderTo.y}" stroke="${m.color}" stroke-width="0.75" opacity="0.5" pointer-events="none"/>`;
        }
        html += renderMarkerLabel(
          labelAngle, idx, m.outerText || m.name, outerLabelR,
          outerFontSize, '600', m.outerFont || 'sans-serif',
          m.outerColor || '#1e293b', outerOrient, 'mlabel-outer'
        );
      }

      // Inner label - push inside past any inward tick labels
      if (m.innerLabel) {
        const innerOrient = m.innerOrientation === 'horizontal' ? 'horizontal' : 'curved';
        const innerFontSize = m.innerSize || 9;
        const innerLabelR = ri - Math.max(7, tickInnerEdge) - innerFontSize * 0.5;
        const innerWeight = (m.innerText && m.innerText !== String(m.position)) ? '600' : '400';
        html += renderMarkerLabel(
          angle, idx, m.innerText || String(m.position), innerLabelR,
          innerFontSize, innerWeight, m.innerFont || 'sans-serif',
          m.innerColor || '#94a3b8', innerOrient, 'mlabel-inner'
        );
      }

      html += `</g>`; // close marker-group
    });

    // Center: invisible click target (always present, covers inner area)
    const centerR = Math.max((R - trackW / 2) * 0.55, 24);
    html += `<circle cx="${cx}" cy="${cy}" r="${centerR}" fill="transparent" class="center-hit" style="cursor:pointer"/>`;

    // Close rotation group
    if (mapRotation !== 0) {
      html += `</g>`;
    }

    // Center text (not rotated)
    const hasName = showCenterName && name.length > 0;
    const hasLen = showCenterLength;
    const bothVisible = hasName && hasLen;
    const gap = Math.max(centerStyle.nameSize, centerStyle.lenSize) * 0.8;
    const nameY = bothVisible ? cy - gap / 2 : cy;
    const lenY = bothVisible ? cy + gap / 2 + centerStyle.lenSize * 0.35 : cy;
    if (hasName) {
      html += `<text x="${cx}" y="${nameY}" text-anchor="middle" dominant-baseline="central" fill="${centerStyle.nameColor}" font-size="${centerStyle.nameSize}" font-weight="700" font-family="${centerStyle.nameFont}" class="center-name-text" style="cursor:text">${escHtml(name)}</text>`;
    }
    if (hasLen) {
      html += `<text x="${cx}" y="${lenY}" text-anchor="middle" dominant-baseline="central" fill="${centerStyle.lenColor}" font-size="${centerStyle.lenSize}" font-family="${centerStyle.lenFont}" class="center-len-text" style="cursor:pointer;pointer-events:none">${formatLength(total)}</text>`;
    }

    // Empty state hint when no features or markers
    if (features.length === 0 && markers.length === 0) {
      const hintY = cy + ro + 50;
      html += `<text x="${cx}" y="${hintY}" text-anchor="middle" dominant-baseline="central" fill="${tickCfg.majorColor || '#94a3b8'}" font-size="12" font-family="sans-serif" opacity="0.5" pointer-events="none">Add features in the sidebar to get started</text>`;
    }

    if (html !== _lastSvgHtml) {
      svg.innerHTML = html;
      _lastSvgHtml = html;
    }
  }

  // --- Linear map view ---
  let viewMode = 'circular'; // 'circular' | 'linear'

  // Linear view config
  let linearCfg = { bpPerRow: 0, bbHeight: 4 }; // 0 = auto (single row)

  // Independent tick config for linear view
  let linearTickCfg = {
    majorShow: true,
    majorInterval: 0,
    majorLabels: true,
    majorWidth: 1,
    majorColor: '#94a3b8',
    labelFormat: 'short',
    labelSize: 9,
    labelColor: '#64748b',
    minorShow: true,
    minorInterval: 0,
    minorWidth: 0.75,
    minorColor: '#64748b',
  };

  let _afterLinearRender = null;
  function _renderLinear() {
    const lsvg = $linearSvg;
    if (!lsvg || viewMode !== 'linear') return;

    const total = getLength();
    const name = $plasmidName.value;
    const pad = { left: 60, right: 30, top: 40, bottom: 30 };
    const mapW = 800;
    const trackH = 20;
    const trackGap = 4;
    const bbH = linearCfg.bbHeight || 4;
    const svgW = mapW + pad.left + pad.right;

    const hasMarkers = markers.some(m => m.visible !== false);
    const hasGc = gcTrackCfg.show && inputMode === 'sequence' && getSequence().length > 0;
    const gcH = hasGc ? Math.min(gcTrackCfg.height, 24) : 0;

    // Multi-row layout
    const bpPerRow = linearCfg.bpPerRow > 0 ? linearCfg.bpPerRow : total;
    const rowCount = Math.ceil(total / bpPerRow);

    // Compute row height - linear mode uses a single track
    const tickLabelH = linearTickCfg.majorLabels ? 16 : 4;
    const hasInsideLabels = features.some(f => f.visible !== false && f.showLabel !== false && f.labelPos === 'inside');
    const featureBlockH = features.some(f => f.visible !== false) ? (trackH + trackGap + (hasInsideLabels ? 14 : 0)) : 0;
    const markerBlockH = hasMarkers ? 28 : 0;
    const gcBlockH = gcH > 0 ? gcH + 6 : 0;
    const rowH = 24 + bbH + tickLabelH + featureBlockH + markerBlockH + gcBlockH + 16;
    const svgH = pad.top + rowCount * rowH + pad.bottom;

    let html = '';

    // Title (once at top)
    html += `<text x="${pad.left}" y="${pad.top - 12}" font-size="15" font-weight="700" fill="var(--text, #1e293b)" font-family="sans-serif">${escHtml(name)}</text>`;
    html += `<text x="${pad.left + mapW}" y="${pad.top - 12}" text-anchor="end" font-size="11" fill="var(--text-muted, #94a3b8)" font-family="sans-serif">${total.toLocaleString()} bp${rowCount > 1 ? ' \u00b7 ' + rowCount + ' rows' : ''}</text>`;

    for (let row = 0; row < rowCount; row++) {
      const rowStart = row * bpPerRow;
      const rowEnd = Math.min((row + 1) * bpPerRow, total);
      const rowLen = rowEnd - rowStart;
      const rowTop = pad.top + row * rowH;
      const bbY = rowTop + tickLabelH + 16;

      const bpToX = bp => pad.left + ((bp - rowStart) / rowLen) * mapW;

      // Row range label (for multi-row)
      if (rowCount > 1) {
        html += `<text x="${pad.left - 4}" y="${bbY + bbH / 2}" text-anchor="end" dominant-baseline="central" font-size="9" fill="var(--text-muted, #94a3b8)" font-family="sans-serif">${formatBp(rowStart, linearTickCfg.labelFormat)}</text>`;
      }

      // Backbone
      const bbEdge = bbCfg.edgeWidth > 0 ? ` stroke="${bbCfg.edge}" stroke-width="${bbCfg.edgeWidth}"` : '';
      html += `<rect x="${pad.left}" y="${bbY}" width="${mapW}" height="${bbH}" rx="${bbH / 2}" fill="${bbCfg.fill}" opacity="${bbCfg.opacity != null ? bbCfg.opacity : 1}"${bbEdge} class="linear-bb"/>`;
      // Backbone hover highlight + hit area
      const hitH = Math.max(bbH + 4, 14);
      const hitY = bbY - (hitH - bbH) / 2;
      html += `<rect x="${pad.left}" y="${bbY - 2}" width="${mapW}" height="${bbH + 4}" rx="${(bbH + 4) / 2}" fill="rgba(99,102,241,.12)" class="backbone-hover-ring" style="pointer-events:none;opacity:0;transition:opacity .15s"/>`;
      html += `<rect x="${pad.left}" y="${hitY}" width="${mapW}" height="${hitH}" fill="transparent" class="backbone-hit" style="cursor:pointer"/>`;

      // Tick marks (uses independent linearTickCfg)
      if (linearTickCfg.majorShow && total > 0) {
        const majorInt = linearTickCfg.majorInterval > 0
          ? linearTickCfg.majorInterval
          : niceRound(Math.ceil(total / calcTickCount(total)));
        const firstTick = Math.ceil(rowStart / majorInt) * majorInt;
        for (let bp = firstTick; bp <= rowEnd; bp += majorInt) {
          const x = bpToX(bp);
          html += `<line x1="${x}" y1="${bbY - 4}" x2="${x}" y2="${bbY + bbH + 4}" stroke="${linearTickCfg.majorColor}" stroke-width="${linearTickCfg.majorWidth}" opacity="0.5"/>`;
          if (bp > 0 && linearTickCfg.majorLabels) {
            html += `<text x="${x}" y="${bbY - 8}" text-anchor="middle" font-size="${Math.min(linearTickCfg.labelSize, 9)}" fill="${linearTickCfg.labelColor}" font-family="sans-serif">${formatBp(bp, linearTickCfg.labelFormat)}</text>`;
          }
        }
        // Minor ticks
        if (linearTickCfg.minorShow) {
          const minorInt = linearTickCfg.minorInterval > 0
            ? linearTickCfg.minorInterval
            : niceRound(Math.ceil(majorInt / 5));
          const firstMinor = Math.ceil(rowStart / minorInt) * minorInt;
          for (let bp = firstMinor; bp <= rowEnd; bp += minorInt) {
            if (bp % majorInt === 0) continue;
            const x = bpToX(bp);
            html += `<line x1="${x}" y1="${bbY - 2}" x2="${x}" y2="${bbY + bbH + 2}" stroke="${linearTickCfg.minorColor || linearTickCfg.majorColor}" stroke-width="${linearTickCfg.minorWidth || 0.75}"/>`;
          }
        }
      }

      // Feature track - all features on a single track in linear mode
      const trackYBase = bbY + bbH + 4;
      {
        const ty = trackYBase;

        features.forEach((f, idx) => {
          if (f.visible === false) return;

          // Determine which segments of this feature fall in this row.
          // Positions are 1-based: left boundary is start-1, right is end.
          const fLeft = f.start - 1;
          const fRight = f.end;
          const segments = [];
          if (fRight >= fLeft) {
            // Non-wrapping
            if (fLeft < rowEnd && fRight > rowStart) {
              segments.push([Math.max(fLeft, rowStart), Math.min(fRight, rowEnd)]);
            }
          } else {
            // Wrapping feature: start..total, 0..end
            if (fLeft < rowEnd && total > rowStart) {
              segments.push([Math.max(fLeft, rowStart), Math.min(total, rowEnd)]);
            }
            if (0 < rowEnd && fRight > rowStart) {
              segments.push([Math.max(0, rowStart), Math.min(fRight, rowEnd)]);
            }
          }
          if (segments.length === 0) return;

          const isSelected = idx === selectedIdx;
          const opacity = f.opacity != null ? f.opacity : 0.85;
          const h = trackH;
          const ry = 4;
          const border = f.border || 0;
          const borderColor = f.borderColor || '#000';
          const borderDash = dashArrayFor(f.borderStyle);

          segments.forEach(([segStart, segEnd]) => {
            const bx1 = bpToX(segStart);
            const bx2 = bpToX(segEnd);
            const w = Math.max(2, bx2 - bx1);

            // Continuation detection: does this segment touch a row boundary?
            const continuesRight = segEnd === rowEnd && segEnd !== (fRight >= fLeft ? fRight : total);
            const continuesLeft = segStart === rowStart && segStart !== (fRight >= fLeft ? fLeft : 0);

            // Arrow detection - suppress arrows on continuation edges
            const ay = ty + h / 2;
            const drawEndArr = !continuesRight && w > 9 && (f.direction === 0
              ? (f.arrow !== false)
              : (f.direction === 1 && f.arrow !== false));
            const drawStartArr = !continuesLeft && w > 9 && (f.direction === 0
              ? !!f.startArrow
              : (f.direction === -1 && f.arrow !== false));
            const endStyle = f.arrowStyle || 'pointed';
            const startStyle = f.direction === 0 ? (f.startArrowStyle || 'pointed') : (f.arrowStyle || 'pointed');
            const endAW = drawEndArr && endStyle !== 'interior' ? (endStyle === 'blunt' ? 4 : 7) : 0;
            const startAW = drawStartArr && startStyle !== 'interior' ? (startStyle === 'blunt' ? 4 : 7) : 0;

            // Build a single path for the feature shape
            const x1 = bx1, x2 = bx1 + w, y1 = ty, y2 = ty + h;
            const r = ry;

            // Zigzag edge helper for continuation sides
            // Produces a sawtooth edge; always starts and ends at xBase
            const zigW = 3, zigN = Math.max(2, Math.round(h / 6));
            function zigRight(xBase) {
              let d = '';
              const step = h / zigN;
              for (let i = 0; i < zigN; i++) {
                const mid = y1 + (i + 0.5) * step;
                const bot = y1 + (i + 1) * step;
                d += `L${xBase - zigW},${mid} L${xBase},${bot}`;
              }
              return d;
            }
            function zigLeft(xBase) {
              let d = '';
              const step = h / zigN;
              for (let i = zigN - 1; i >= 0; i--) {
                const mid = y1 + (i + 0.5) * step;
                const top = y1 + i * step;
                d += `L${xBase + zigW},${mid} L${xBase},${top}`;
              }
              return d;
            }

            // Suppress rounded corners on continuation edges
            const rL = continuesLeft ? 0 : r;
            const rR = continuesRight ? 0 : r;

            let shapePath;
            if (startAW > 0 && endAW > 0) {
              shapePath = `M${x1 + startAW},${y1} L${x2 - endAW},${y1} L${x2},${ay} L${x2 - endAW},${y2} L${x1 + startAW},${y2} L${x1},${ay} Z`;
            } else if (endAW > 0 && !continuesLeft) {
              shapePath = `M${x1 + rL},${y1} L${x2 - endAW},${y1} L${x2},${ay} L${x2 - endAW},${y2} L${x1 + rL},${y2} Q${x1},${y2} ${x1},${y2 - rL} L${x1},${y1 + rL} Q${x1},${y1} ${x1 + rL},${y1} Z`;
            } else if (endAW > 0 && continuesLeft) {
              shapePath = `M${x1},${y1} L${x2 - endAW},${y1} L${x2},${ay} L${x2 - endAW},${y2} L${x1},${y2} ${zigLeft(x1)} Z`;
            } else if (startAW > 0 && !continuesRight) {
              shapePath = `M${x1 + startAW},${y1} L${x2 - rR},${y1} Q${x2},${y1} ${x2},${y1 + rR} L${x2},${y2 - rR} Q${x2},${y2} ${x2 - rR},${y2} L${x1 + startAW},${y2} L${x1},${ay} Z`;
            } else if (startAW > 0 && continuesRight) {
              shapePath = `M${x1 + startAW},${y1} L${x2},${y1} ${zigRight(x2)} L${x1 + startAW},${y2} L${x1},${ay} Z`;
            } else if (continuesLeft && continuesRight) {
              // Both sides continue - zigzag on both edges
              shapePath = `M${x1},${y1} L${x2},${y1} ${zigRight(x2)} L${x1},${y2} ${zigLeft(x1)} Z`;
            } else if (continuesRight) {
              // Right continues - rounded left, zigzag right
              shapePath = `M${x1 + rL},${y1} L${x2},${y1} ${zigRight(x2)} L${x1 + rL},${y2} Q${x1},${y2} ${x1},${y2 - rL} L${x1},${y1 + rL} Q${x1},${y1} ${x1 + rL},${y1} Z`;
            } else if (continuesLeft) {
              // Left continues - zigzag left, rounded right
              shapePath = `M${x1},${y1} L${x2 - rR},${y1} Q${x2},${y1} ${x2},${y1 + rR} L${x2},${y2 - rR} Q${x2},${y2} ${x2 - rR},${y2} L${x1},${y2} ${zigLeft(x1)} Z`;
            } else {
              // No arrows, no continuation - rounded rect
              shapePath = `M${x1 + r},${y1} L${x2 - r},${y1} Q${x2},${y1} ${x2},${y1 + r} L${x2},${y2 - r} Q${x2},${y2} ${x2 - r},${y2} L${x1 + r},${y2} Q${x1},${y2} ${x1},${y2 - r} L${x1},${y1 + r} Q${x1},${y1} ${x1 + r},${y1} Z`;
            }

            // Interior chevron geometry
            const intEnd = drawEndArr && endStyle === 'interior';
            const intStart = drawStartArr && startStyle === 'interior';
            let linChevEndPts = '', linChevStartPts = '';
            if (intEnd) {
              const pad = Math.max(1, h * 0.15);
              const aW = Math.min(7, w * 0.25);
              const ax = x2 - 2;
              linChevEndPts = `${ax - aW},${y1 + pad} ${ax},${ay} ${ax - aW},${y2 - pad}`;
            }
            if (intStart) {
              const pad = Math.max(1, h * 0.15);
              const aW = Math.min(7, w * 0.25);
              const ax = x1 + 2;
              linChevStartPts = `${ax + aW},${y1 + pad} ${ax},${ay} ${ax + aW},${y2 - pad}`;
            }

            // Mask for interior chevron cutouts
            const linUseMask = intEnd || intStart;
            let linMaskAttr = '';
            if (linUseMask) {
              const lmId = `lin-chev-mask-${idx}-${segStart}`;
              html += `<defs><mask id="${lmId}">`;
              html += `<rect x="${x1 - 4}" y="${y1 - 4}" width="${w + 8}" height="${h + 8}" fill="white"/>`;
              if (linChevEndPts) html += `<polygon points="${linChevEndPts}" fill="black"/>`;
              if (linChevStartPts) html += `<polygon points="${linChevStartPts}" fill="black"/>`;
              html += `</mask></defs>`;
              linMaskAttr = ` mask="url(#${lmId})"`;
            }

            html += `<g class="feature-arc" data-idx="${idx}" style="cursor:pointer">`;
            if (isSelected) {
              html += `<rect x="${x1 - 2}" y="${y1 - 2}" width="${w + 4}" height="${h + 4}" rx="${r + 1}" fill="none" stroke="var(--accent, #6366f1)" stroke-width="2" stroke-dasharray="6,4" opacity="0.6" class="selection-ring" pointer-events="none"/>`;
            }
            // Single unified shape - fill + border, masked for interior chevrons
            html += `<g${linMaskAttr}>`;
            html += `<path d="${shapePath}" fill="${f.color}" opacity="${opacity}"`;
            if (border > 0) {
              html += ` stroke="${borderColor}" stroke-width="${border}" stroke-linejoin="round" stroke-dasharray="${borderDash}"`;
            }
            html += `/>`;
            html += `</g>`;

            // Interior chevron border strokes (outside mask)
            if (border > 0) {
              if (linChevEndPts) html += `<polygon points="${linChevEndPts}" fill="none" stroke="${borderColor}" stroke-width="${border}" stroke-linejoin="round" pointer-events="none"/>`;
              if (linChevStartPts) html += `<polygon points="${linChevStartPts}" fill="none" stroke="${borderColor}" stroke-width="${border}" stroke-linejoin="round" pointer-events="none"/>`;
            }
            // Right (end) notch - suppress on continuation edges
            const drawEndNotch = !continuesRight && (f.direction === 0
              ? !!f.endNotch
              : (f.direction === -1 && !!f.tailCut));
            if (drawEndNotch && w > 12) {
              const nW = 5;
              const ax = bx1 + w;
              html += `<polygon points="${ax},${ty} ${ax - nW},${ay} ${ax},${ty + h}" fill="var(--bg-card, #fff)" opacity="1"/>`;
            }
            // Left (start) notch - suppress on continuation edges
            const drawStartNotch = !continuesLeft && (f.direction === 0
              ? !!f.tailCut
              : (f.direction === 1 && !!f.tailCut));
            if (drawStartNotch && w > 12) {
              const nW = 5;
              html += `<polygon points="${bx1},${ty} ${bx1 + nW},${ay} ${bx1},${ty + h}" fill="var(--bg-card, #fff)" opacity="1"/>`;
            }

            // Continuation chevrons - forward: > both ends, reverse: < both ends, none: zigzag only
            const dir = f.direction || 0;
            if (dir !== 0) {
              const chevColor = ensureContrast(f.color);
              if (continuesRight) {
                const cx = x2 + 2, cw = 4;
                const pts = dir === 1
                  ? `${cx},${y1 + 3} ${cx + cw},${ay} ${cx},${y2 - 3}`
                  : `${cx + cw},${y1 + 3} ${cx},${ay} ${cx + cw},${y2 - 3}`;
                html += `<polyline points="${pts}" fill="none" stroke="${chevColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity * 0.7}" pointer-events="none"/>`;
              }
              if (continuesLeft) {
                const cx = x1 - 2, cw = 4;
                const pts = dir === 1
                  ? `${cx - cw},${y1 + 3} ${cx},${ay} ${cx - cw},${y2 - 3}`
                  : `${cx},${y1 + 3} ${cx - cw},${ay} ${cx},${y2 - 3}`;
                html += `<polyline points="${pts}" fill="none" stroke="${chevColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity * 0.7}" pointer-events="none"/>`;
              }
            }

            // Label
            if (f.showLabel !== false) {
              const labelSize = Math.min(f.labelSize || 11, 11);
              const labelFont = f.labelFont || 'sans-serif';
              const labelPos = f.labelPos || 'on';
              const maxChars = Math.floor(w / (labelSize * 0.65));
              const label = f.name.length > maxChars && maxChars > 2 ? f.name.slice(0, maxChars - 1) + '\u2026' : f.name;
              const lx = bx1 + w / 2;

              if (labelPos === 'inside') {
                // Below the feature bar
                html += `<text x="${lx}" y="${ty + h + labelSize + 2}" text-anchor="middle" font-size="${Math.min(labelSize, 9)}" fill="${f.labelColor || f.color}" font-weight="600" font-family="${labelFont}" pointer-events="none">${escHtml(f.name)}</text>`;
              } else if (w > 18 && maxChars >= 2) {
                // 'on' - label fits on the bar
                html += `<text x="${lx}" y="${ty + h / 2}" text-anchor="middle" dominant-baseline="central" font-size="${labelSize}" fill="${f.labelColor || '#fff'}" font-weight="600" font-family="${labelFont}" pointer-events="none">${escHtml(label)}</text>`;
              } else if (w > 4) {
                // 'on' but bar too narrow - fall back to above
                html += `<text x="${lx}" y="${ty - 4}" text-anchor="middle" font-size="${Math.min(labelSize, 9)}" fill="${f.color}" font-weight="600" font-family="${labelFont}" pointer-events="none">${escHtml(f.name)}</text>`;
              }
            }
            html += `</g>`;
          });
        });
      }

      // Markers
      if (hasMarkers) {
        const markerY = trackYBase + featureBlockH + 2;
        markers.forEach((m, idx) => {
          if (m.visible === false) return;
          if (m.position < rowStart || m.position > rowEnd) return;
          const x = bpToX(m.position);
          const isSelected = idx === selectedMarkerIdx;
          html += `<g class="marker-group" data-marker-idx="${idx}" style="cursor:pointer">`;
          if (isSelected) {
            html += `<line x1="${x}" y1="${bbY - 4}" x2="${x}" y2="${markerY + 10}" stroke="var(--accent, #6366f1)" stroke-width="5" opacity="0.12" stroke-linecap="round"/>`;
          }
          const mDash = dashArrayFor(m.lineStyle, '');
          html += `<line x1="${x}" y1="${bbY}" x2="${x}" y2="${markerY + 6}" stroke="${m.color}" stroke-width="${m.lineWidth || 1.5}"${mDash ? ` stroke-dasharray="${mDash}"` : ''}/>`;
          if (!mDash) html += `<circle cx="${x}" cy="${bbY + bbH / 2}" r="2.5" fill="${m.color}"/>`;
          html += `<text x="${x}" y="${markerY + 18}" text-anchor="middle" font-size="9" fill="${m.color}" font-family="sans-serif" pointer-events="none">${escHtml(m.name)}</text>`;
          html += `</g>`;
        });
      }

      // GC content track
      if (hasGc) {
        const seq = getSequence().toUpperCase();
        const gcPoints = computeGcContent(seq, gcTrackCfg.windowSize);
        const gcYBase = trackYBase + featureBlockH + markerBlockH + 2;
        const gcMid = gcYBase + gcH / 2;

        // Baseline
        html += `<line x1="${pad.left}" y1="${gcMid}" x2="${pad.left + mapW}" y2="${gcMid}" stroke="var(--border, #cbd5e1)" stroke-width="0.5" opacity="0.4"/>`;

        // Filter points to this row and segment using shared helper
        const rowPts = gcPoints.filter(p => p.bp >= rowStart && p.bp <= rowEnd);
        if (rowPts.length > 1) {
          const { segments } = segmentGcData(rowPts, p => ({ x: bpToX(p.bp) }));

          for (const seg of segments) {
            if (seg.points.length < 2) continue;
            let poly = '';
            for (const p of seg.points) poly += `${p.x},${gcMid - p.dev * (gcH / 2)} `;
            for (let j = seg.points.length - 1; j >= 0; j--) poly += `${seg.points[j].x},${gcMid} `;
            const color = seg.sign >= 0 ? gcTrackCfg.colorAbove : gcTrackCfg.colorBelow;
            html += `<polygon points="${poly.trim()}" fill="${color}" opacity="${gcTrackCfg.opacity}" pointer-events="none"/>`;
          }
        }
      }
    }

    lsvg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    lsvg.setAttribute('width', svgW);
    lsvg.setAttribute('height', svgH);
    if (html !== _lastLinearHtml) {
      lsvg.innerHTML = html;
      _lastLinearHtml = html;
    }
    if (_afterLinearRender) _afterLinearRender(svgW, svgH);
  }

  function setViewMode(mode) {
    viewMode = mode;
    const mc = $mapContainer;
    const btn = $('toolbar-view-toggle');
    const linOpts = $('linear-opts');
    const panToggle = $('toolbar-pan-toggle');
    const isPanMode = panToggle && panToggle.classList.contains('toolbar-btn-active');
    if (mode === 'linear') {
      mc.classList.add('linear-mode');
      btn.classList.add('active');
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
      btn.title = 'Switch to circular view (L)';
      if (linOpts) linOpts.style.display = '';
      $svg.classList.remove('pan-mode');
      if (isPanMode && $linearSvg) $linearSvg.classList.add('pan-mode');
      _renderLinear();
    } else {
      mc.classList.remove('linear-mode');
      btn.classList.remove('active');
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="14" y2="18"/></svg>';
      btn.title = 'Switch to linear view (L)';
      if (linOpts) linOpts.style.display = 'none';
      if ($linearSvg) $linearSvg.classList.remove('pan-mode');
      if (isPanMode) $svg.classList.add('pan-mode');
      render();
    }
  }

  $('linear-bp-per-row').addEventListener('input', e => {
    pushUndoDebounced();
    linearCfg.bpPerRow = Math.max(0, parseInt(e.target.value) || 0);
    debouncedRender();
  });

  $('toolbar-view-toggle').addEventListener('click', () => {
    setViewMode(viewMode === 'circular' ? 'linear' : 'circular');
  });

  // Event delegation on linear SVG - click, hover, tooltip, right-click
  (function() {
    const svg = $linearSvg;
    let hoveredIdx = -1;
    let hoveredMarkerIdx = -1;
    let bbHovered = false;

    svg.addEventListener('click', e => {
      const bbHit = e.target.closest('.backbone-hit');
      if (bbHit) { e.stopPropagation(); openBbCtxMenu(e); return; }
      const idx = getArcIdx(e.target);
      if (idx >= 0) { e.stopPropagation(); selectFeature(idx); return; }
      const mIdx = getMarkerIdx(e.target);
      if (mIdx >= 0) { e.stopPropagation(); selectMarker(mIdx); return; }
    });

    svg.addEventListener('mouseover', e => {
      if (e.target.closest('.backbone-hit')) {
        if (!bbHovered) {
          bbHovered = true;
          svg.querySelectorAll('.backbone-hover-ring').forEach(r => r.style.opacity = '1');
        }
        return;
      }
      const idx = getArcIdx(e.target);
      if (idx >= 0 && idx !== hoveredIdx) {
        clearHovers();
        hoveredIdx = idx;
        svg.querySelectorAll(`.feature-arc[data-idx="${idx}"]`).forEach(s => s.classList.add('feature-arc-hover'));
        if (!tooltipPinned) showTooltip(e, features[idx]);
        return;
      }
      const mIdx = getMarkerIdx(e.target);
      if (mIdx >= 0 && mIdx !== hoveredMarkerIdx) {
        clearHovers();
        hoveredMarkerIdx = mIdx;
        svg.querySelectorAll(`.marker-group[data-marker-idx="${mIdx}"]`).forEach(s => s.classList.add('marker-hover'));
        if (!tooltipPinned) { const m = markers[mIdx]; if (m) showTooltip(e, { name: m.name, start: m.position, end: m.position, type: 'marker', enzyme: m.enzyme }); }
        return;
      }
    });

    svg.addEventListener('mousemove', e => {
      if (hoveredIdx >= 0 || hoveredMarkerIdx >= 0) moveTooltip(e);
    });

    svg.addEventListener('mouseout', e => {
      if (bbHovered && !e.relatedTarget?.closest?.('.backbone-hit')) {
        bbHovered = false;
        if (!bbCtxMenu.classList.contains('open'))
          svg.querySelectorAll('.backbone-hover-ring').forEach(r => r.style.opacity = '0');
      }
      if (hoveredIdx >= 0) {
        const idx = getArcIdx(e.relatedTarget);
        if (idx !== hoveredIdx) { clearFeatureHover(); }
      }
      if (hoveredMarkerIdx >= 0) {
        const mIdx = getMarkerIdx(e.relatedTarget);
        if (mIdx !== hoveredMarkerIdx) { clearMarkerHover(); }
      }
    });

    svg.addEventListener('contextmenu', e => {
      const arc = e.target.closest('.feature-arc');
      if (arc) {
        const idx = parseInt(arc.dataset.idx);
        if (!isNaN(idx) && features[idx]) {
          pinTooltip(e, idx);
          return;
        }
      }
      if (tooltipPinned) unpinTooltip();
    });

    function clearFeatureHover() {
      if (hoveredIdx >= 0) {
        svg.querySelectorAll(`.feature-arc[data-idx="${hoveredIdx}"]`).forEach(s => s.classList.remove('feature-arc-hover'));
        hoveredIdx = -1;
        hideTooltip();
      }
    }
    function clearMarkerHover() {
      if (hoveredMarkerIdx >= 0) {
        svg.querySelectorAll(`.marker-group[data-marker-idx="${hoveredMarkerIdx}"]`).forEach(s => s.classList.remove('marker-hover'));
        hoveredMarkerIdx = -1;
        hideTooltip();
      }
    }
    function clearHovers() { clearFeatureHover(); clearMarkerHover(); }
  })();

  // Patch render to also update linear view when active, with error boundary
  const _circularRender = _render;
  let _lastRenderError = 0;
  _render = function() {
    try {
      _circularRender();
      if (viewMode === 'linear') _renderLinear();
    } catch (err) {
      console.error('Render error:', err);
      // Throttle error toasts to avoid flooding
      const now = Date.now();
      if (now - _lastRenderError > 3000) {
        _lastRenderError = now;
        showToast('Render error: ' + (err.message || 'unknown'), 'error');
      }
    }
  };

  // --- SVG event delegation (attached once, not per render) ---
  function getArcIdx(el) {
    if (!el) return -1;
    const arc = el.closest('.feature-arc');
    return arc ? parseInt(arc.dataset.idx) : -1;
  }

  function getMarkerIdx(el) {
    if (!el) return -1;
    const g = el.closest('.marker-group');
    return g ? parseInt(g.dataset.markerIdx) : -1;
  }

  (function() {
    const svg = $svg;
    let hoveredIdx = -1;
    let hoveredMarkerIdx = -1;
    let bbHovered = false;
    let tickHovered = false;
    let centerHovered = false;

    svg.addEventListener('click', e => {
      if (svg.classList.contains('pan-mode')) return;
      // Suppress click after a ring drag
      if (svg._ringDragged) { svg._ringDragged = false; return; }
      if (e.target.closest('.center-name-text')) { e.stopPropagation(); startCenterNameEdit(); openCenterEditPopover(); return; }
      const hit = e.target.closest('.center-hit');
      if (hit) { e.stopPropagation(); openCenterEditPopover(); return; }
      const idx = getArcIdx(e.target);
      if (idx >= 0) { e.stopPropagation(); selectFeature(idx); return; }
      const mIdx = getMarkerIdx(e.target);
      if (mIdx >= 0) { e.stopPropagation(); selectMarker(mIdx); return; }
      const tickHit = e.target.closest('.tick-hit');
      if (tickHit) { e.stopPropagation(); openTickCtxMenu(e); return; }
      const bbHit = e.target.closest('.backbone-hit');
      if (bbHit) { e.stopPropagation(); openBbCtxMenu(e); return; }
      const ringHit = e.target.closest('.ring-hit');
      if (ringHit) { e.stopPropagation(); openRingCtxMenu(e, parseInt(ringHit.dataset.ring)); return; }
    });

    svg.addEventListener('mouseover', e => {
      const idx = getArcIdx(e.target);
      if (idx >= 0 && idx !== hoveredIdx) {
        clearAllHovers();
        hoveredIdx = idx;
        svg.querySelectorAll(`.feature-arc[data-idx="${idx}"]`).forEach(s => s.classList.add('feature-arc-hover'));
        if (!tooltipPinned) showTooltip(e, features[idx]);
        return;
      }
      const mIdx = getMarkerIdx(e.target);
      if (mIdx >= 0 && mIdx !== hoveredMarkerIdx) {
        clearAllHovers();
        hoveredMarkerIdx = mIdx;
        svg.querySelectorAll(`.marker-group[data-marker-idx="${mIdx}"]`).forEach(s => s.classList.add('marker-hover'));
        if (!tooltipPinned) { const m = markers[mIdx]; if (m) showTooltip(e, { name: m.name, start: m.position, end: m.position, type: 'marker', enzyme: m.enzyme }); }
        return;
      }
      if (e.target.closest('.tick-hit') && !tickHovered) {
        clearAllHovers();
        tickHovered = true;
        svg.querySelectorAll('.tick-hover-ring').forEach(r => r.classList.add('visible'));
        return;
      }
      if (e.target.closest('.backbone-hit') && !bbHovered) {
        clearAllHovers();
        bbHovered = true;
        svg.querySelectorAll('.backbone-hover-ring').forEach(r => r.classList.add('visible'));
        return;
      }
      const ringEl = e.target.closest('.ring-hit');
      if (ringEl && !ringEl._hovered) {
        clearAllHovers();
        ringEl._hovered = true;
        const ringIdx = ringEl.dataset.ring;
        svg.querySelectorAll(`.ring-hover-ring[data-ring="${ringIdx}"]`).forEach(r => r.classList.add('visible'));
        return;
      }
      if (e.target.closest('.center-hit') && !centerHovered) {
        clearAllHovers();
        centerHovered = true;
        svg.querySelectorAll('.center-hit').forEach(r => r.setAttribute('fill', 'rgba(99,102,241,.06)'));
      }
    });

    svg.addEventListener('mousemove', e => {
      if (hoveredIdx >= 0 || hoveredMarkerIdx >= 0) moveTooltip(e);
    });

    svg.addEventListener('mouseout', e => {
      if (hoveredIdx >= 0) {
        const idx = getArcIdx(e.relatedTarget);
        if (idx !== hoveredIdx) clearFeatureHover();
      }
      if (hoveredMarkerIdx >= 0) {
        const mIdx = getMarkerIdx(e.relatedTarget);
        if (mIdx !== hoveredMarkerIdx) clearMarkerHover();
      }
      if (tickHovered && !e.relatedTarget?.closest?.('.tick-hit')) {
        tickHovered = false;
        if (!tickCtxMenu.classList.contains('open'))
          svg.querySelectorAll('.tick-hover-ring').forEach(r => r.classList.remove('visible'));
      }
      if (bbHovered && !e.relatedTarget?.closest?.('.backbone-hit')) {
        bbHovered = false;
        if (!bbCtxMenu.classList.contains('open'))
          svg.querySelectorAll('.backbone-hover-ring').forEach(r => r.classList.remove('visible'));
      }
      // Ring hover out
      const ringOut = e.target.closest('.ring-hit');
      if (ringOut && ringOut._hovered && !e.relatedTarget?.closest?.('.ring-hit')) {
        ringOut._hovered = false;
        if (!ringCtxMenu.classList.contains('open'))
          svg.querySelectorAll('.ring-hover-ring').forEach(r => r.classList.remove('visible'));
      }
      if (centerHovered && !e.relatedTarget?.closest?.('.center-hit')) {
        centerHovered = false;
        if (!cepPopover.classList.contains('open'))
          svg.querySelectorAll('.center-hit').forEach(r => r.setAttribute('fill', 'transparent'));
      }
    });

    function clearFeatureHover() {
      if (hoveredIdx >= 0) {
        svg.querySelectorAll(`.feature-arc[data-idx="${hoveredIdx}"]`).forEach(s => s.classList.remove('feature-arc-hover'));
        hoveredIdx = -1;
        hideTooltip();
      }
    }

    function clearMarkerHover() {
      if (hoveredMarkerIdx >= 0) {
        svg.querySelectorAll(`.marker-group[data-marker-idx="${hoveredMarkerIdx}"]`).forEach(s => s.classList.remove('marker-hover'));
        hoveredMarkerIdx = -1;
        hideTooltip();
      }
    }

    function clearAllHovers() {
      clearFeatureHover();
      clearMarkerHover();
      if (tickHovered) {
        tickHovered = false;
        svg.querySelectorAll('.tick-hover-ring').forEach(r => r.classList.remove('visible'));
      }
      if (bbHovered) {
        bbHovered = false;
        svg.querySelectorAll('.backbone-hover-ring').forEach(r => r.classList.remove('visible'));
      }
      svg.querySelectorAll('.ring-hit').forEach(r => { r._hovered = false; });
      svg.querySelectorAll('.ring-hover-ring').forEach(r => r.classList.remove('visible'));
      if (centerHovered) {
        centerHovered = false;
        svg.querySelectorAll('.center-hit').forEach(r => r.setAttribute('fill', 'transparent'));
      }
    }
  })();

  // Check if two angular ranges (in degrees, 0-360) overlap.
  // Handles wrap-around (e.g. 350°-10° overlapping 5°-15°).
  function _angularOverlap(s1, e1, s2, e2) {
    // Normalize to [0,360)
    const norm = a => ((a % 360) + 360) % 360;
    s1 = norm(s1); e1 = norm(e1);
    s2 = norm(s2); e2 = norm(e2);
    // Convert to non-wrapping ranges
    const ranges1 = s1 <= e1 ? [[s1, e1]] : [[s1, 360], [0, e1]];
    const ranges2 = s2 <= e2 ? [[s2, e2]] : [[s2, 360], [0, e2]];
    for (const [a, b] of ranges1) {
      for (const [c, d] of ranges2) {
        if (a < d && b > c) return true;
      }
    }
    return false;
  }

  function renderFeatureArc(f, idx, total, placedLabels) {
    let html = '';
    let startAngle, endAngle;
    // Arc spans from the beginning of the start base to the end of the end base.
    // Positions are 1-based: start-1 gives the left boundary, end gives the right.
    // Direction only controls which end gets the arrowhead.
    if (f.start <= f.end) {
      startAngle = bpToAngle(f.start - 1, total);
      endAngle = bpToAngle(f.end, total);
    } else {
      startAngle = bpToAngle(f.start - 1, total);
      endAngle = bpToAngle(f.end, total) + 360;
    }

    let spanAngle = endAngle - startAngle;
    if (spanAngle < 0) spanAngle += 360;

    const isSelected = idx === selectedIdx;
    const opacity = f.opacity != null ? f.opacity : 0.85;
    const borderW = f.border || 0;
    const borderColor = f.borderColor || '#000000';
    const isNone = f.direction === 0;

    // Determine which ends get arrows and notches
    // For directional features: arrow at head, notch at tail
    // For direction=none: independent control at both ends via startArrow/endNotch
    let hasEndArrow, endArrowStyle, hasStartArrow, startArrowStyle, hasStartNotch, hasEndNotch;
    let interiorEndArrow = false, interiorStartArrow = false;
    if (isNone) {
      hasEndArrow = f.arrow !== false;
      endArrowStyle = f.arrowStyle || 'pointed';
      hasStartArrow = !!f.startArrow;
      startArrowStyle = f.startArrowStyle || 'pointed';
      hasStartNotch = !!f.tailCut;
      hasEndNotch = !!f.endNotch;
      // Can't have both arrow and notch on same end - arrow wins
      if (hasEndArrow) hasEndNotch = false;
      if (hasStartArrow) hasStartNotch = false;
      // Interior arrows: draw inside the band, not as part of the shape
      if (endArrowStyle === 'interior' && hasEndArrow) { interiorEndArrow = true; hasEndArrow = false; }
      if (startArrowStyle === 'interior' && hasStartArrow) { interiorStartArrow = true; hasStartArrow = false; }
    } else {
      hasEndArrow = f.direction === 1 ? (f.arrow !== false) : false;
      hasStartArrow = f.direction === -1 ? (f.arrow !== false) : false;
      endArrowStyle = f.arrowStyle || 'pointed';
      startArrowStyle = f.arrowStyle || 'pointed';
      hasStartNotch = f.direction === 1 ? !!f.tailCut : false;
      hasEndNotch = f.direction === -1 ? !!f.tailCut : false;
      // Interior arrows: draw inside the band, not as part of the shape
      if (endArrowStyle === 'interior' && hasEndArrow) { interiorEndArrow = true; hasEndArrow = false; }
      if (startArrowStyle === 'interior' && hasStartArrow) { interiorStartArrow = true; hasStartArrow = false; }
    }

    // Build a single closed path for the entire feature shape (body + arrows)
    const tg = getTrackGeometry(f.track || 0);
    const fR = tg.R, fTW = tg.trackW;
    const halfW = (fTW - 4) / 2;
    const ro = fR + halfW;
    const ri = fR - halfW;

    // Arrow degree calculations
    const endArrowDeg = hasEndArrow ? Math.min(8, spanAngle * 0.25) : 0;
    const startArrowDeg = hasStartArrow ? Math.min(8, spanAngle * 0.25) : 0;
    const hasEndArr = hasEndArrow && endArrowDeg > 0.5;
    const hasStartArr = hasStartArrow && startArrowDeg > 0.5;

    // Flare for each end
    const endFlare = (endArrowStyle === 'flared' && hasEndArr) ? halfW * 0.6 : 0;
    const startFlare = (startArrowStyle === 'flared' && hasStartArr) ? halfW * 0.6 : 0;

    // Arc body spans (shortened on arrow ends)
    const bodyStart = startAngle + startArrowDeg;
    const bodyEnd = endAngle - endArrowDeg;

    let bodySpan = bodyEnd - bodyStart;
    if (bodySpan < 0) bodySpan += 360;
    const large = bodySpan > 180 ? 1 : 0;

    // Key points
    const bsO = polarToCart(bodyStart, ro);
    const bsI = polarToCart(bodyStart, ri);
    const beO = polarToCart(bodyEnd, ro);
    const beI = polarToCart(bodyEnd, ri);

    // End arrow geometry (clockwise end)
    let endTip, endBaseO, endBaseI;
    if (hasEndArr) {
      endTip = polarToCart(endAngle, fR);
      endBaseO = polarToCart(bodyEnd, ro + endFlare);
      endBaseI = polarToCart(bodyEnd, ri - endFlare);
    }

    // Start arrow geometry (counter-clockwise end)
    let startTip, startBaseO, startBaseI;
    if (hasStartArr) {
      startTip = polarToCart(startAngle, fR);
      startBaseO = polarToCart(bodyStart, ro + startFlare);
      startBaseI = polarToCart(bodyStart, ri - startFlare);
    }

    // Build closed path: start end → outer arc CW → end → inner arc CCW → close
    let shapePath = '';
    // Start end
    if (hasStartArr) {
      shapePath += `M ${startTip.x} ${startTip.y}`;
      shapePath += ` L ${startBaseO.x} ${startBaseO.y}`;
      shapePath += ` L ${bsO.x} ${bsO.y}`;
    } else {
      shapePath += `M ${bsO.x} ${bsO.y}`;
    }
    // Outer arc CW
    shapePath += ` A ${ro} ${ro} 0 ${large} 1 ${beO.x} ${beO.y}`;
    // End
    if (hasEndArr) {
      shapePath += ` L ${endBaseO.x} ${endBaseO.y}`;
      shapePath += ` L ${endTip.x} ${endTip.y}`;
      shapePath += ` L ${endBaseI.x} ${endBaseI.y}`;
      shapePath += ` L ${beI.x} ${beI.y}`;
    } else {
      shapePath += ` L ${beI.x} ${beI.y}`;
    }
    // Inner arc CCW
    shapePath += ` A ${ri} ${ri} 0 ${large} 0 ${bsI.x} ${bsI.y}`;
    // Close start end
    if (hasStartArr) {
      shapePath += ` L ${startBaseI.x} ${startBaseI.y}`;
    }
    shapePath += ' Z';

    // Notch cutout masks - one or both ends can have notches
    const startNotchDeg = hasStartNotch ? Math.min(6, spanAngle * 0.2) : 0;
    const endNotchDeg = hasEndNotch ? Math.min(6, spanAngle * 0.2) : 0;
    const useStartNotch = hasStartNotch && startNotchDeg > 0.3;
    const useEndNotch = hasEndNotch && endNotchDeg > 0.3;
    const useMask = useStartNotch || useEndNotch || interiorEndArrow || interiorStartArrow;
    // Build notch cutout polygon SVG for a given angle/tip direction
    function notchPoly(nAngle, tipAngle, extAngle) {
      const nTip = polarToCart(tipAngle, fR);
      // Extend the notch lines from tip through ro/ri outward by 4px
      // so the mask fully covers the fill while cutting along the same
      // line as the border outline
      const oEdge = polarToCart(nAngle, ro);
      const iEdge = polarToCart(nAngle, ri);
      const pad = 4;
      const dxO = oEdge.x - nTip.x, dyO = oEdge.y - nTip.y;
      const lO = Math.hypot(dxO, dyO) || 1;
      const cO = { x: oEdge.x + dxO / lO * pad, y: oEdge.y + dyO / lO * pad };
      const dxI = iEdge.x - nTip.x, dyI = iEdge.y - nTip.y;
      const lI = Math.hypot(dxI, dyI) || 1;
      const cI = { x: iEdge.x + dxI / lI * pad, y: iEdge.y + dyI / lI * pad };
      const eO = polarToCart(extAngle, ro + 2), eI = polarToCart(extAngle, ri - 2);
      return `<polygon points="${eO.x},${eO.y} ${cO.x},${cO.y} ${nTip.x},${nTip.y} ${cI.x},${cI.y} ${eI.x},${eI.y}" fill="black"/>`;
    }

    // Precompute interior chevron geometry for mask + border
    const chevPad = Math.max(2, halfW * 0.2);
    const chevRo = ro - chevPad;
    const chevRi = ri + chevPad;
    const chevDeg = Math.min(6, spanAngle * 0.2);
    let chevEndPoints = null, chevStartPoints = null;
    if (chevDeg > 0.3) {
      if (interiorEndArrow) {
        const tipA = endAngle - 1;
        const baseA = tipA - chevDeg;
        const tip = polarToCart(tipA, fR);
        const bO = polarToCart(baseA, chevRo);
        const bI = polarToCart(baseA, chevRi);
        chevEndPoints = `${bO.x},${bO.y} ${tip.x},${tip.y} ${bI.x},${bI.y}`;
      }
      if (interiorStartArrow) {
        const tipA = startAngle + 1;
        const baseA = tipA + chevDeg;
        const tip = polarToCart(tipA, fR);
        const bO = polarToCart(baseA, chevRo);
        const bI = polarToCart(baseA, chevRi);
        chevStartPoints = `${bO.x},${bO.y} ${tip.x},${tip.y} ${bI.x},${bI.y}`;
      }
    }

    let maskId = '';
    if (useMask) {
      maskId = 'tail-mask-' + idx;
      html += `<defs><mask id="${maskId}">`;
      html += `<rect width="${SVG_SIZE}" height="${SVG_SIZE}" fill="white"/>`;
      if (useStartNotch) html += notchPoly(startAngle, startAngle + startNotchDeg, startAngle - 2);
      if (useEndNotch) html += notchPoly(endAngle, endAngle - endNotchDeg, endAngle + 2);
      if (chevEndPoints) html += `<polygon points="${chevEndPoints}" fill="black"/>`;
      if (chevStartPoints) html += `<polygon points="${chevStartPoints}" fill="black"/>`;
      html += `</mask></defs>`;
    }

    // Build notch-aware outline path (used for selection highlight and border stroke)
    let notchPath = '';
    if (useMask) {
      if (useStartNotch) {
        const nO = polarToCart(startAngle, ro);
        const nI = polarToCart(startAngle, ri);
        const nTip = polarToCart(startAngle + startNotchDeg, fR);
        notchPath = `M ${nO.x} ${nO.y} L ${nTip.x} ${nTip.y} L ${nI.x} ${nI.y}`;
      } else if (hasStartArr) {
        notchPath = `M ${startTip.x} ${startTip.y} L ${startBaseO.x} ${startBaseO.y} L ${bsO.x} ${bsO.y}`;
      } else {
        notchPath = `M ${bsO.x} ${bsO.y}`;
      }
      if (useStartNotch) {
        if (useEndNotch) {
          const eNO = polarToCart(endAngle, ro);
          const eNI = polarToCart(endAngle, ri);
          const eNTip = polarToCart(endAngle - endNotchDeg, fR);
          notchPath += ` A ${ri} ${ri} 0 ${large} 1 ${eNI.x} ${eNI.y}`;
          notchPath += ` L ${eNTip.x} ${eNTip.y} L ${eNO.x} ${eNO.y}`;
        } else if (hasEndArr) {
          notchPath += ` A ${ri} ${ri} 0 ${large} 1 ${beI.x} ${beI.y}`;
          notchPath += ` L ${endBaseI.x} ${endBaseI.y} L ${endTip.x} ${endTip.y} L ${endBaseO.x} ${endBaseO.y} L ${beO.x} ${beO.y}`;
        } else {
          notchPath += ` A ${ri} ${ri} 0 ${large} 1 ${beI.x} ${beI.y} L ${beO.x} ${beO.y}`;
        }
        const nO = polarToCart(startAngle, ro);
        notchPath += ` A ${ro} ${ro} 0 ${large} 0 ${nO.x} ${nO.y} Z`;
      } else {
        if (useEndNotch) {
          const eNO = polarToCart(endAngle, ro);
          const eNI = polarToCart(endAngle, ri);
          const eNTip = polarToCart(endAngle - endNotchDeg, fR);
          notchPath += ` A ${ro} ${ro} 0 ${large} 1 ${eNO.x} ${eNO.y}`;
          notchPath += ` L ${eNTip.x} ${eNTip.y} L ${eNI.x} ${eNI.y}`;
        } else if (hasEndArr) {
          notchPath += ` A ${ro} ${ro} 0 ${large} 1 ${beO.x} ${beO.y}`;
          notchPath += ` L ${endBaseO.x} ${endBaseO.y} L ${endTip.x} ${endTip.y} L ${endBaseI.x} ${endBaseI.y} L ${beI.x} ${beI.y}`;
        } else {
          notchPath += ` A ${ro} ${ro} 0 ${large} 1 ${beO.x} ${beO.y} L ${beI.x} ${beI.y}`;
        }
        if (hasStartArr) {
          notchPath += ` A ${ri} ${ri} 0 ${large} 0 ${bsI.x} ${bsI.y} L ${startBaseI.x} ${startBaseI.y} Z`;
        } else {
          notchPath += ` A ${ri} ${ri} 0 ${large} 0 ${bsI.x} ${bsI.y} Z`;
        }
      }
    }

    // Selection highlight
    if (isSelected) {
      const selPath = useMask ? notchPath : shapePath;
      html += `<path d="${selPath}" fill="none" stroke="var(--accent, #6366f1)" stroke-width="6" stroke-linejoin="round" opacity="0.2" class="selection-glow" pointer-events="none"/>`;
      html += `<path d="${selPath}" fill="none" stroke="var(--accent, #6366f1)" stroke-width="2.5" stroke-linejoin="round" opacity="0.6" stroke-dasharray="6,4" class="selection-ring" pointer-events="none"/>`;
    }

    const maskAttr = useMask ? ` mask="url(#${maskId})"` : '';
    html += `<g${maskAttr} class="feature-arc" data-idx="${idx}">`;

    // Feature shape - fill inside mask, border stroke outside if notched
    const bStyle = f.borderStyle || 'solid';
    const bDash = bStyle === 'dashed' ? ' stroke-dasharray="6,4"' : (bStyle === 'dotted' ? ' stroke-dasharray="2,3"' : '');
    const hasBorder = borderW > 0;
    const strokeAttr = hasBorder && !useMask
      ? ` stroke="${borderColor}" stroke-width="${borderW}" stroke-linejoin="round"${bDash}`
      : '';
    html += `<path d="${shapePath}" fill="${f.color}" opacity="${opacity}"${strokeAttr}/>`;

    html += `</g>`;

    // Border stroke outside mask for notched/interior-arrow features
    if (hasBorder && useMask && notchPath) {
      html += `<path d="${notchPath}" fill="none" stroke="${borderColor}" stroke-width="${borderW}" stroke-linejoin="round"${bDash} opacity="${opacity}" pointer-events="none"/>`;
    }
    // Interior chevron border strokes (drawn outside mask so they're visible)
    if (hasBorder) {
      if (chevEndPoints) html += `<polygon points="${chevEndPoints}" fill="none" stroke="${borderColor}" stroke-width="${borderW}" stroke-linejoin="round" opacity="${opacity}" pointer-events="none"/>`;
      if (chevStartPoints) html += `<polygon points="${chevStartPoints}" fill="none" stroke="${borderColor}" stroke-width="${borderW}" stroke-linejoin="round" opacity="${opacity}" pointer-events="none"/>`;
    }

    // Label
    if (f.showLabel !== false) {
      const labelPos = f.labelPos || 'on';
      const orient = f.labelOrientation === 'horizontal' ? 'horizontal' : 'curved';
      const lColor = f.labelColor || '#1e293b';
      const lSize = f.labelSize || 11;
      const lFont = f.labelFont || 'sans-serif';
      let labelR;
      const hGap = orient === 'horizontal' ? 5 : lSize * 0.7 + 2;
      if (labelPos === 'inside') {
        labelR = fR - fTW / 2 - hGap;
        if ((f.track || 0) <= 0 && _tickInnerEdge > 0) {
          const bbInner = R - trackW / 2;
          const tickClearR = bbInner - _tickInnerEdge - hGap;
          labelR = Math.min(labelR, tickClearR);
        }
      }
      else if (labelPos === 'outside') {
        labelR = fR + fTW / 2 + hGap;
        // Inner ring "outside" labels point toward the backbone — clamp so
        // they don't overlap with inward tick marks
        if ((f.track || 0) < 0 && _tickInnerEdge > 0) {
          const tickFloor = R - trackW / 2 - _tickInnerEdge - hGap;
          labelR = Math.min(labelR, tickFloor);
        }
      }
      else {
        // 'on' - centered on feature, but clamp inward so the text
        // stays inside the ring with a few px gap from the outer edge
        const halfW = (fTW - 4) / 2;
        labelR = Math.min(fR, fR + halfW - lSize * 0.5 - 5);
      }

      const midAngle = startAngle + spanAngle / 2;

      // For horizontal inside labels, the text bounding box has height
      // that can push corners toward the ring. Compute the actual minimum
      // distance from the text bbox to the ring and adjust if needed.
      // (Horizontal label ring-clearance is handled by the anchor logic below)

      const origLabelR = labelR;
      const lp = polarToCart(midAngle, labelR);

      if (orient === 'curved') {
        const pathId = 'label-path-' + idx;
        const midNorm = ((midAngle % 360) + 360) % 360;
        const flipArc = midNorm > 90 && midNorm < 270;

        // Estimate text width in degrees and extend path so text can spill beyond the feature
        const charWidthPx = lSize * 0.6;
        const textWidthPx = f.name.length * charWidthPx;
        const circumference = 2 * Math.PI * labelR;
        const textSpanDeg = (textWidthPx / circumference) * 360;
        const padDeg = Math.max(0, (textSpanDeg - spanAngle) / 2 + 15);

        // Collision avoidance for curved labels - when angular spans overlap,
        // flip the label to the opposite side of the feature arc (inside ↔ outside)
        // rather than pushing it further and further in one direction.
        const labelAngStart = ((midAngle - textSpanDeg / 2) % 360 + 360) % 360;
        const labelAngEnd = ((midAngle + textSpanDeg / 2) % 360 + 360) % 360;
        const curvedHGap = lSize * 0.7 + 2;
        function _curvedCollides(testR) {
          for (const pl of placedLabels) {
            if (!pl.curved) continue;
            if (Math.abs(testR - pl.r) > lSize * 0.8) continue;
            if (_angularOverlap(labelAngStart, labelAngEnd, pl.angStart, pl.angEnd)) return true;
          }
          return false;
        }
        if (_curvedCollides(labelR)) {
          // Try the opposite side of the feature arc first.
          // Use a tight gap - just enough to clear the ring edge + 2px.
          const nudgeGap = lSize * 0.5 + 3;
          const insideR = fR - fTW / 2 + 2 - nudgeGap;
          const outsideR = fR + fTW / 2 - 2 + nudgeGap;
          const altR = labelPos === 'inside' ? outsideR : insideR;
          if (!_curvedCollides(altR)) {
            labelR = altR;
          } else {
            // Both sides collide - nudge incrementally outward from the alt position
            const nudgeDir = altR > fR ? 1 : -1;
            let nudge = lSize * 1.4;
            for (let cn = 0; cn < 3; cn++) {
              const testR = altR + nudge * nudgeDir;
              if (!_curvedCollides(testR)) { labelR = testR; break; }
              nudge += lSize * 1.4;
            }
          }
        }

        // Recalculate circumference-based values with adjusted radius
        const adjCirc = 2 * Math.PI * Math.max(labelR, 1);
        const adjTextSpanDeg = (textWidthPx / adjCirc) * 360;
        const adjPadDeg = Math.max(0, (adjTextSpanDeg - spanAngle) / 2 + 15);

        // Record this curved label for future collision checks
        placedLabels.push({
          curved: true, r: labelR,
          angStart: labelAngStart, angEnd: labelAngEnd
        });

        let arcStart, arcEnd;
        if (flipArc) {
          arcStart = startAngle + spanAngle + adjPadDeg;
          arcEnd = startAngle - adjPadDeg;
        } else {
          arcStart = startAngle - adjPadDeg;
          arcEnd = startAngle + spanAngle + adjPadDeg;
        }

        const arcD = describeArc(labelR, Math.min(arcStart, arcEnd), Math.max(arcStart, arcEnd));
        if (flipArc) {
          const s = polarToCart(arcStart, labelR);
          const e = polarToCart(arcEnd, labelR);
          let sweep = arcStart - arcEnd;
          if (sweep < 0) sweep += 360;
          const large = sweep > 180 ? 1 : 0;
          const revD = `M ${s.x} ${s.y} A ${labelR} ${labelR} 0 ${large} 0 ${e.x} ${e.y}`;
          html += `<defs><path id="${pathId}" d="${revD}" fill="none"/></defs>`;
        } else {
          html += `<defs><path id="${pathId}" d="${arcD}" fill="none"/></defs>`;
        }

        html += `<text pointer-events="none" font-size="${lSize}" font-weight="600" font-family="${lFont}" fill="${lColor}">`;
        html += `<textPath href="#${pathId}" startOffset="50%" text-anchor="middle" dominant-baseline="central">${escHtml(f.name)}</textPath>`;
        html += `</text>`;

        // Leader line for curved labels positioned outside/inside or nudged
        const leaderModeCurved = f.leaderLine || 'auto';
        const curvedDisplaced = Math.abs(labelR - origLabelR) > 1 || labelPos !== 'on';
        if (leaderModeCurved === 'always' || (leaderModeCurved === 'auto' && curvedDisplaced)) {
          // Anchor from the edge closest to the label's actual position
          const anchorR2 = labelR < fR ? fR - fTW / 2 : fR + fTW / 2;
          const a1 = polarToCart(midAngle, anchorR2);
          const a2 = polarToCart(midAngle, labelR);
          html += `<line x1="${a1.x}" y1="${a1.y}" x2="${a2.x}" y2="${a2.y}" stroke="${lColor}" stroke-width="0.7" stroke-dasharray="3,2" opacity="0.4" pointer-events="none" class="leader-line"/>`;
          html += `<circle cx="${a1.x}" cy="${a1.y}" r="1.5" fill="${lColor}" opacity="0.4" pointer-events="none" class="leader-line"/>`;
        }
      } else {
        // Horizontal label - pin the corner/edge of the text closest to the
        // ring at the anchor point (labelR). Text extends away from the ring.
        //
        // We decompose the radial direction into horizontal and vertical
        // components and independently choose text-anchor and vAlign based
        // on which components are significant. This gives smooth transitions
        // between edge and corner anchoring without hard octant boundaries.
        //
        // Only fall back to centered anchoring (middle/center) when the
        // component is within ±15° of a cardinal axis (|component| < sin 15°).
        // Convert plasmid angle (0°=top, CW) to screen angle (0°=right, CW)
        // by subtracting 90°, matching polarToCart's (angle - 90) conversion.
        const screenAngle = midAngle + mapRotation - 90;
        const ringRad = screenAngle * Math.PI / 180;
        const rx = Math.cos(ringRad); // horizontal: +right, -left
        const ry = Math.sin(ringRad); // vertical: +down, -up (SVG Y-axis)
        const T = 0.15; // threshold for edge anchoring (~±8.5° dead zone at cardinals)

        let anchor = 'middle';
        let vAlign = 'center';
        let offX = 0, offY = 0;
        const pad = lSize * 0.4;
        const isIn = labelPos === 'inside';

        // Horizontal anchor: pin the edge facing the ring
        if (Math.abs(rx) >= T) {
          if (isIn) anchor = rx > 0 ? 'end' : 'start';    // ring right → pin right edge
          else      anchor = rx > 0 ? 'start' : 'end';    // outside → opposite
        }
        // Vertical anchor: pin the edge facing the ring
        if (Math.abs(ry) >= T) {
          if (isIn) vAlign = ry > 0 ? 'bottom' : 'top';   // ring below → pin bottom
          else      vAlign = ry > 0 ? 'top' : 'bottom';   // outside → opposite
        }

        // Padding for outside labels - push away from ring along each active axis
        if (!isIn) {
          if (anchor === 'start') offX = pad;
          else if (anchor === 'end') offX = -pad;
          if (vAlign === 'top') offY = pad;
          else if (vAlign === 'bottom') offY = -pad;
        }

        // Word-wrap long labels into multiple lines
        const maxChars = f.labelMaxWidth > 0 ? f.labelMaxWidth : Math.max(6, Math.round(60 / lSize * 6));
        const words = f.name.split(/\s+/);
        const lines = [];
        let cur = '';
        for (const w of words) {
          if (cur && (cur.length + 1 + w.length) > maxChars) {
            lines.push(cur);
            cur = w;
          } else {
            cur = cur ? cur + ' ' + w : w;
          }
        }
        if (cur) lines.push(cur);

        const lineH = lSize * 1.25;
        const totalH = lines.length * lineH;
        const maxLineW = Math.max(...lines.map(l => l.length)) * lSize * 0.6;
        const estH = lSize * 1.1; // single-line text height estimate

        // Vertical dy offset: position the correct vertical edge at the
        // anchor point. SVG text y= sets the alphabetic baseline (~bottom).
        // We shift with dy so the desired edge aligns with the anchor.
        //   'center' → shift up by half the text height
        //   'top'    → no shift (text hangs below anchor)
        //   'bottom' → shift up by full text height (text sits above anchor)
        let dyVal = 0;
        if (vAlign === 'center') dyVal = estH * 0.35;       // baseline is ~35% up from bottom
        else if (vAlign === 'top') dyVal = estH * 0.85;     // push text down so top edge is at anchor
        else if (vAlign === 'bottom') dyVal = -estH * 0.15; // push text up so bottom edge is at anchor

        // Compute screen-space bounding rect for collision detection.
        // lp is in SVG space (inside the rotated group); rotate to screen.
        const rad = mapRotation * Math.PI / 180;
        const cosR = Math.cos(rad), sinR = Math.sin(rad);
        const ddx = lp.x - cx, ddy = lp.y - cy;
        const screenX = cx + ddx * cosR - ddy * sinR + offX;
        const screenY = cy + ddx * sinR + ddy * cosR + offY;

        // Bbox origin depends on anchor and vAlign
        function bboxX(sx) { return anchor === 'end' ? sx - maxLineW : anchor === 'start' ? sx : sx - maxLineW / 2; }
        function bboxY(sy) { return vAlign === 'bottom' ? sy - totalH : vAlign === 'top' ? sy : sy - totalH / 2; }
        let rectX = bboxX(screenX);
        let rectY = bboxY(screenY);
        let rect = { x: rectX, y: rectY, w: maxLineW, h: totalH };

        // Nudge to clear overlapping labels with minimal displacement.
        // Use small steps (3px) to find the closest non-overlapping position.
        const gap = 3;
        let nudge = 0;
        const rAngle = Math.atan2(screenY - cy, screenX - cx);
        const tangX = -Math.sin(rAngle);
        const tangY = Math.cos(rAngle);
        const nudgeRadial = labelPos !== 'inside';
        const ndx = nudgeRadial ? Math.cos(rAngle) : tangX;
        const ndy = nudgeRadial ? Math.sin(rAngle) : tangY;
        const step = gap;
        for (let attempt = 0; attempt < 20; attempt++) {
          let hit = false;
          for (const pr of placedLabels) {
            if (pr.curved) continue;
            if (rect.x < pr.x + pr.w + gap && rect.x + rect.w + gap > pr.x &&
                rect.y < pr.y + pr.h + gap && rect.y + rect.h + gap > pr.y) {
              hit = true;
              break;
            }
          }
          if (!hit) break;
          nudge += step;
          const nsx = screenX + ndx * nudge;
          const nsy = screenY + ndy * nudge;
          rect = { x: bboxX(nsx), y: bboxY(nsy), w: maxLineW, h: totalH };
        }
        placedLabels.push(rect);

        // Convert nudge back to unrotated SVG space
        let finalX = lp.x + offX, finalY = lp.y + offY;
        if (nudge > 0) {
          let ndx, ndy;
          if (nudgeRadial) {
            ndx = Math.cos(rAngle) * nudge;
            ndy = Math.sin(rAngle) * nudge;
          } else {
            ndx = tangX * nudge;
            ndy = tangY * nudge;
          }
          finalX += ndx * cosR + ndy * sinR;
          finalY += -ndx * sinR + ndy * cosR;
        }

        // Leader line from feature arc to displaced label
        const leaderMode = f.leaderLine || 'auto';
        const showLeader = leaderMode === 'always' || (leaderMode === 'auto' && nudge > 0);
        if (showLeader) {
          const anchorR = labelPos === 'inside' ? fR - fTW / 2 : fR + fTW / 2;
          const anchorPt = polarToCart(midAngle, anchorR);
          html += `<line x1="${anchorPt.x}" y1="${anchorPt.y}" x2="${finalX}" y2="${finalY}" stroke="${lColor}" stroke-width="0.7" stroke-dasharray="3,2" opacity="0.4" pointer-events="none" class="leader-line"/>`;
          html += `<circle cx="${anchorPt.x}" cy="${anchorPt.y}" r="1.5" fill="${lColor}" opacity="0.4" pointer-events="none" class="leader-line"/>`;
        }

        // Apply vertical offset via dy
        const textY = finalY + dyVal;
        const baseY = textY - (totalH - lineH) / 2;
        const hLabelRot = mapRotation !== 0 ? ` transform="rotate(${-mapRotation} ${finalX} ${finalY})"` : '';
        if (lines.length === 1) {
          html += `<text x="${finalX}" y="${textY}" text-anchor="${anchor}" fill="${lColor}" font-size="${lSize}" font-weight="600" font-family="${lFont}" pointer-events="none"${hLabelRot}>${escHtml(f.name)}</text>`;
        } else {
          html += `<text text-anchor="${anchor}" fill="${lColor}" font-size="${lSize}" font-weight="600" font-family="${lFont}" pointer-events="none"${hLabelRot}>`;
          lines.forEach((line, li) => {
            html += `<tspan x="${finalX}" y="${baseY + li * lineH}">${escHtml(line)}</tspan>`;
          });
          html += `</text>`;
        }
      }
    }

    return html;
  }

  // --- Inline center name editing ---
  function startCenterNameEdit() {
    const svg = $svg;
    const nameEl = svg.querySelector('.center-name-text');
    if (!nameEl || svg.querySelector('.center-name-edit')) return;

    const bbox = nameEl.getBBox();
    const inputW = Math.max(bbox.width + 40, 120);
    const inputH = centerStyle.nameSize * 1.6;
    const fx = cx - inputW / 2;
    const fy = parseFloat(nameEl.getAttribute('y')) - inputH / 2;

    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', fx);
    fo.setAttribute('y', fy);
    fo.setAttribute('width', inputW);
    fo.setAttribute('height', inputH);
    fo.classList.add('center-name-edit');

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 80;
    input.value = $plasmidName.value;
    Object.assign(input.style, {
      width: '100%', height: '100%', border: '1.5px solid var(--accent)',
      borderRadius: '4px', background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #1e293b)',
      fontSize: centerStyle.nameSize + 'px', fontWeight: '700',
      fontFamily: centerStyle.nameFont, textAlign: 'center',
      outline: 'none', padding: '0 6px', boxSizing: 'border-box'
    });

    // Hide the original text while editing
    nameEl.style.opacity = '0';

    function commit() {
      const val = input.value.trim();
      if (val && val !== $plasmidName.value) {
        pushUndoDebounced();
        $plasmidName.value = val;
        if ($cepName) $cepName.value = val;
        if (typeof renderTabBar === 'function' && projects[activeProjectIdx]) {
          projects[activeProjectIdx].name = val;
          renderTabBar();
        }
      }
      nameEl.style.opacity = '';
      fo.remove();
      scheduleRender();
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); nameEl.style.opacity = ''; fo.remove(); }
    });
    input.addEventListener('blur', commit);

    fo.appendChild(input);
    svg.appendChild(fo);
    input.focus();
    input.select();
  }

  // --- Center label edit popover ---
  const cepPopover = $('center-edit-popover');

  function openCenterEditPopover() {
    closeAllPopovers();
    const svg = $svg;
    const svgRect = svg.getBoundingClientRect();
    const containerRect = $mapContainer.getBoundingClientRect();
    const svgScaleX = svgRect.width / SVG_SIZE;
    const svgScaleY = svgRect.height / SVG_SIZE;
    const popoverW = 280;

    // Position to the right of the plasmid, vertically centered
    const centerX = svgRect.left - containerRect.left + cx * svgScaleX;
    const centerY = svgRect.top - containerRect.top + cy * svgScaleY;
    const outerEdge = centerX + R * svgScaleX + 20;

    // Measure popover height
    cepPopover.style.left = '0px';
    cepPopover.style.top = '0px';
    cepPopover.style.display = 'block';
    cepPopover.style.visibility = 'hidden';
    const popoverH = cepPopover.offsetHeight;
    cepPopover.style.display = '';
    cepPopover.style.visibility = '';

    let left = outerEdge;
    let top = centerY - popoverH / 2;

    // If it doesn't fit on the right, place it on the left
    if (left + popoverW > containerRect.width - 12) {
      left = centerX - R * svgScaleX - popoverW - 20;
    }

    // Clamp within container bounds
    const maxTop = containerRect.height - popoverH - 12;
    top = Math.max(12, Math.min(top, maxTop));
    left = Math.max(12, left);

    cepPopover.style.left = left + 'px';
    cepPopover.style.top = top + 'px';
    cepPopover.style.display = 'block';

    // Populate fields
    $('cep-show-name').checked = showCenterName;
    $('cep-show-length').checked = showCenterLength;
    $('cep-length-format').value = lengthFormat;
    $cepName.value = $plasmidName.value;
    $('cep-name-size').value = centerStyle.nameSize;
    $('cep-name-color').value = centerStyle.nameColor;
    $cepNameFont.value = centerStyle.nameFont;
    $('cep-len-size').value = centerStyle.lenSize;
    $('cep-len-color').value = centerStyle.lenColor;
    $cepLenFont.value = centerStyle.lenFont;
    if (_cepNameFP) _cepNameFP._refresh();
    if (_cepLenFP) _cepLenFP._refresh();

    requestAnimationFrame(() => cepPopover.classList.add('open'));
  }

  function closeCenterEditPopover() {
    closePopover(cepPopover);
    document.querySelectorAll('.center-hit').forEach(r => r.setAttribute('fill', 'transparent'));
  }

  function readCenterEdits() {
    pushUndoDebounced();
    showCenterName = $('cep-show-name').checked;
    showCenterLength = $('cep-show-length').checked;
    lengthFormat = $('cep-length-format').value;
    const newName = $cepName.value.trim();
    $plasmidName.value = newName;
    if (typeof renderTabBar === 'function' && projects[activeProjectIdx]) {
      projects[activeProjectIdx].name = newName;
      renderTabBar();
    }
    centerStyle.nameSize = parseInt($('cep-name-size').value) || 16;
    centerStyle.nameColor = $('cep-name-color').value;
    centerStyle.nameFont = $cepNameFont.value;
    centerStyle.lenSize = parseInt($('cep-len-size').value) || 13;
    centerStyle.lenColor = $('cep-len-color').value;
    centerStyle.lenFont = $cepLenFont.value;
    debouncedRender();
  }

  $('cep-close').addEventListener('click', closeCenterEditPopover);

  // Live-update on any change
  ['cep-show-name', 'cep-show-length', 'cep-length-format',
   'cep-name', 'cep-name-size', 'cep-name-color', 'cep-name-font',
   'cep-len-size', 'cep-len-color', 'cep-len-font'].forEach(id => {
    const el = $(id);
    const evt = (el.tagName === 'SELECT' || el.type === 'color' || el.type === 'checkbox') ? 'change' : 'input';
    el.addEventListener(evt, readCenterEdits);
  });

  // Initialize font pickers for center label
  let _cepNameFP = fontPicker($cepNameFont);
  let _cepLenFP = fontPicker($cepLenFont);

  registerDismiss(cepPopover, closeCenterEditPopover, ['.center-name-text', '.center-len-text', '#color-picker-popover']);

  // --- Backbone context menu ---
  const bbCtxMenu = $('bb-ctx-menu');

  function openBbCtxMenu(e) {
    closeAllPopovers();
    // Sync current values into the menu inputs
    const isLin = viewMode === 'linear';
    const w = isLin ? (linearCfg.bbHeight || 4) : trackW;
    $bbWidth.min = isLin ? 1 : 6;
    $bbWidth.max = isLin ? 16 : 60;
    $('bb-width-num').min = isLin ? 1 : 6;
    $('bb-width-num').max = isLin ? 16 : 60;
    $bbWidth.value = w;
    $('bb-width-num').value = w;
    $bbFill.value = bbCfg.fill;
    $bbEdge.value = bbCfg.edge;
    $bbEdgeWidth.value = bbCfg.edgeWidth;
    $('bb-edge-width-num').value = bbCfg.edgeWidth;
    $bbOpacity.value = Math.round(bbCfg.opacity * 100);
    $('bb-opacity-num').value = Math.round(bbCfg.opacity * 100);

    // Linear-only tick/label section
    const linSec = $('bb-lin-tick-section');
    if (linSec) {
      linSec.style.display = isLin ? '' : 'none';
      if (isLin) {
        $('bb-lin-tick-show').checked = linearTickCfg.majorShow;
        $('bb-lin-tick-interval').value = linearTickCfg.majorInterval;
        $('bb-lin-tick-width').value = linearTickCfg.majorWidth;
        $('bb-lin-tick-width-num').value = linearTickCfg.majorWidth;
        $('bb-lin-tick-color').value = linearTickCfg.majorColor;
        $('bb-lin-minor-show').checked = linearTickCfg.minorShow;
        $('bb-lin-label-show').checked = linearTickCfg.majorLabels;
        $('bb-lin-label-format').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.fmt === (linearTickCfg.labelFormat || 'short')));
        $('bb-lin-label-size').value = linearTickCfg.labelSize;
        $('bb-lin-label-size-num').value = linearTickCfg.labelSize;
        $('bb-lin-label-color').value = linearTickCfg.labelColor;
      }
    }

    positionCtxMenu(bbCtxMenu, e, isLin ? 420 : 240);
  }

  function closeBbCtxMenu() {
    closePopover(bbCtxMenu);
    // Clear hover rings in both views
    document.querySelectorAll('.backbone-hover-ring').forEach(r => {
      r.classList.remove('visible');
      r.style.opacity = '0';
    });
  }

  $('bb-ctx-close').addEventListener('click', closeBbCtxMenu);

  function readBbCfg() {
    pushUndoDebounced();
    // Freeze current inherited style for uncustomized rings before
    // changing the backbone, so they keep their appearance.
    const usedTracks = getUsedTracks();
    usedTracks.forEach(t => {
      if (t === 0) return;
      const key = String(t);
      if (!ringStyles[key]) {
        ringStyles[key] = { fill: bbCfg.fill, edge: bbCfg.edge, edgeWidth: bbCfg.edgeWidth, opacity: bbCfg.opacity * 0.4 };
      }
    });
    if (viewMode === 'linear') {
      linearCfg.bbHeight = parseFloat($bbWidth.value) || 4;
    } else {
      trackW = parseFloat($bbWidth.value) || 28;
    }
    bbCfg.fill = $bbFill.value;
    bbCfg.edge = $bbEdge.value;
    bbCfg.edgeWidth = parseFloat($bbEdgeWidth.value) || 0;
    bbCfg.opacity = parseFloat($bbOpacity.value) / 100;
    debouncedRender();
  }

  syncPair('bb-width', 'bb-width-num', readBbCfg);
  syncPair('bb-edge-width', 'bb-edge-width-num', readBbCfg);
  syncPair('bb-opacity', 'bb-opacity-num', readBbCfg);
  ['bb-fill', 'bb-edge'].forEach(id => {
    $(id).addEventListener('input', readBbCfg);
    $(id).addEventListener('change', readBbCfg);
  });

  // Linear tick/label controls inside backbone popover
  function readLinTickCfg() {
    pushUndoDebounced();
    linearTickCfg.majorShow = $('bb-lin-tick-show').checked;
    linearTickCfg.majorInterval = Math.max(0, parseInt($('bb-lin-tick-interval').value) || 0);
    linearTickCfg.majorWidth = parseFloat($('bb-lin-tick-width').value) || 1;
    linearTickCfg.majorColor = $('bb-lin-tick-color').value;
    linearTickCfg.minorShow = $('bb-lin-minor-show').checked;
    linearTickCfg.majorLabels = $('bb-lin-label-show').checked;
    linearTickCfg.labelSize = parseInt($('bb-lin-label-size').value) || 9;
    linearTickCfg.labelColor = $('bb-lin-label-color').value;
    debouncedRender();
  }
  ['bb-lin-tick-show', 'bb-lin-minor-show', 'bb-lin-label-show'].forEach(id => {
    $(id).addEventListener('change', readLinTickCfg);
  });
  $('bb-lin-tick-interval').addEventListener('input', readLinTickCfg);
  syncPair('bb-lin-tick-width', 'bb-lin-tick-width-num', readLinTickCfg);
  syncPair('bb-lin-label-size', 'bb-lin-label-size-num', readLinTickCfg);
  ['bb-lin-tick-color', 'bb-lin-label-color'].forEach(id => {
    $(id).addEventListener('input', readLinTickCfg);
    $(id).addEventListener('change', readLinTickCfg);
  });
  $('bb-lin-label-format').addEventListener('click', e => {
    const btn = e.target.closest('button[data-fmt]');
    if (!btn) return;
    $('bb-lin-label-format').querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    linearTickCfg.labelFormat = btn.dataset.fmt;
    pushUndoDebounced();
    debouncedRender();
  });

  registerDismiss(bbCtxMenu, closeBbCtxMenu, ['.backbone-hit', '#color-picker-popover']);

  // --- Ring context menu ---
  const ringCtxMenu = $('ring-ctx-menu');
  let activeRingIdx = null;

  function openRingCtxMenu(e, trackIdx) {
    closeAllPopovers();
    activeRingIdx = trackIdx;
    const rs = getRingStyle(trackIdx);
    const tg = getTrackGeometry(trackIdx);
    const label = trackIdx > 0 ? 'Outer Ring ' + trackIdx : 'Inner Ring ' + Math.abs(trackIdx);
    $('ring-ctx-title').textContent = label;
    $('ring-width').value = tg.trackW;
    $('ring-width-num').value = tg.trackW;
    $ringFill.value = rs.fill;
    $ringEdge.value = rs.edge;
    $ringEdgeWidth.value = rs.edgeWidth;
    $('ring-edge-width-num').value = rs.edgeWidth;
    $ringOpacity.value = Math.round(rs.opacity * 100);
    $('ring-opacity-num').value = Math.round(rs.opacity * 100);

    positionCtxMenu(ringCtxMenu, e, 240);
  }

  function closeRingCtxMenu() {
    closePopover(ringCtxMenu);
    document.querySelectorAll('.ring-hover-ring').forEach(r => {
      r.classList.remove('visible');
      r.style.opacity = '0';
    });
    activeRingIdx = null;
  }

  $('ring-ctx-close').addEventListener('click', closeRingCtxMenu);

  function readRingCfg() {
    if (activeRingIdx == null) return;
    pushUndoDebounced();
    setRingStyle(activeRingIdx, {
      fill: $ringFill.value,
      edge: $ringEdge.value,
      edgeWidth: parseFloat($ringEdgeWidth.value) || 0,
      opacity: parseFloat($ringOpacity.value) / 100,
      trackW: parseFloat($('ring-width').value) || 24,
    });
    debouncedRender();
  }

  syncPair('ring-width', 'ring-width-num', readRingCfg);
  syncPair('ring-edge-width', 'ring-edge-width-num', readRingCfg);
  syncPair('ring-opacity', 'ring-opacity-num', readRingCfg);
  ['ring-fill', 'ring-edge'].forEach(id => {
    $(id).addEventListener('input', readRingCfg);
    $(id).addEventListener('change', readRingCfg);
  });

  $('ring-reset-style').addEventListener('click', () => {
    if (activeRingIdx == null) return;
    pushUndo();
    delete ringStyles[String(activeRingIdx)];
    // Refresh the menu inputs to show backbone defaults
    const rs = getRingStyle(activeRingIdx);
    const tg = getTrackGeometry(activeRingIdx);
    $('ring-width').value = tg.trackW;
    $('ring-width-num').value = tg.trackW;
    $ringFill.value = rs.fill;
    $ringEdge.value = rs.edge;
    $ringEdgeWidth.value = rs.edgeWidth;
    $('ring-edge-width-num').value = rs.edgeWidth;
    $ringOpacity.value = Math.round(rs.opacity * 100);
    $('ring-opacity-num').value = Math.round(rs.opacity * 100);
    scheduleRender();
  });

  registerDismiss(ringCtxMenu, closeRingCtxMenu, ['.ring-hit', '#color-picker-popover']);

  // --- Tick context menu ---
  const tickCtxMenu = $('tick-ctx-menu');

  function openTickCtxMenu(e) {
    closeAllPopovers();
    // Sync current values
    $tickMajorShow.checked = tickCfg.majorShow;
    $tickMajorDirection.value = tickCfg.majorDirection || 'out';
    $tickMinorDirection.value = tickCfg.minorDirection || 'out';
    $tickMajorInterval.value = tickCfg.majorInterval;
    $tickMajorLen.value = tickCfg.majorLen;
    $('tick-major-len-num').value = tickCfg.majorLen;
    $tickMajorWidth.value = tickCfg.majorWidth;
    $('tick-major-width-num').value = tickCfg.majorWidth;
    $tickMajorColor.value = tickCfg.majorColor;
    $tickMajorLabels.checked = tickCfg.majorLabels;
    $tickLabelFormat.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.fmt === (tickCfg.labelFormat || 'short')));
    $tickLabelSize.value = tickCfg.labelSize;
    $('tick-label-size-num').value = tickCfg.labelSize;
    $tickLabelColor.value = tickCfg.labelColor;
    $tickMinorShow.checked = tickCfg.minorShow;
    $tickMinorInterval.value = tickCfg.minorInterval;
    $tickMinorLen.value = tickCfg.minorLen;
    $('tick-minor-len-num').value = tickCfg.minorLen;
    $tickMinorWidth.value = tickCfg.minorWidth;
    $('tick-minor-width-num').value = tickCfg.minorWidth;
    $tickMinorColor.value = tickCfg.minorColor;
    $tickMinorLabelColor.value = tickCfg.minorLabelColor || '#94a3b8';
    $tickMinorLabels.checked = tickCfg.minorLabels;

    positionCtxMenu(tickCtxMenu, e, 260);
  }

  function closeTickCtxMenu() {
    closePopover(tickCtxMenu);
    document.querySelectorAll('.tick-hover-ring').forEach(r => {
      r.classList.remove('visible');
      r.style.opacity = '0';
    });
  }

  $('tick-ctx-close').addEventListener('click', closeTickCtxMenu);

  // Tick context menu tab switching
  document.querySelectorAll('#tick-ctx-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tick-ctx-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('#tick-ctx-menu .popover-tab-pane').forEach(p => p.classList.remove('active'));
      $(btn.dataset.tickTab).classList.add('active');
    });
  });

  registerDismiss(tickCtxMenu, closeTickCtxMenu, ['.tick-hit', '#color-picker-popover']);

  // Close context menus when interacting with the sidebar panel
  $panel.addEventListener('mousedown', () => {
    closeAllPopovers();
  });

  // --- Theme selector ---
  const themePopover = $('theme-popover');
  const infoPopover = $('info-popover');
  const THEMES = ['light', 'dark', 'midnight', 'solarized', 'nature', 'rose', 'lavender', 'dracula', 'nord', 'catppuccin'];

  function applyTheme(name) {
    if (!THEMES.includes(name)) name = 'light';
    document.documentElement.setAttribute('data-theme', name);
    themePopover.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pickTheme === name);
    });
    try { localStorage.setItem('plasmid-theme', name); } catch(e) {}
  }

  // Restore saved theme on load
  (function() {
    const saved = localStorage.getItem('plasmid-theme');
    if (saved && THEMES.includes(saved)) applyTheme(saved);
  })();

  // --- Search filter ---
  $('toolbar-theme').addEventListener('click', e => {
    e.stopPropagation();
    const wasOpen = themePopover.classList.contains('open');
    closeAllPopovers();
    if (!wasOpen) themePopover.classList.add('open');
  });
  $('theme-close').addEventListener('click', () => {
    themePopover.classList.remove('open');
  });
  themePopover.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.pickTheme);
    });
  });
  registerDismiss(themePopover, () => themePopover.classList.remove('open'), ['#toolbar-theme']);

  // --- Info popover ---
  $('toolbar-info').addEventListener('click', e => {
    e.stopPropagation();
    const wasOpen = infoPopover.classList.contains('open');
    closeAllPopovers();
    if (!wasOpen) infoPopover.classList.add('open');
  });

  $('info-close').addEventListener('click', () => {
    infoPopover.classList.remove('open');
  });
  const shortcutsToggle = $('shortcuts-toggle');
  shortcutsToggle.setAttribute('role', 'button');
  shortcutsToggle.setAttribute('tabindex', '0');
  shortcutsToggle.setAttribute('aria-expanded', !shortcutsToggle.classList.contains('collapsed'));
  const toggleShortcuts = () => {
    const body = $('shortcuts-body');
    const collapsing = !body.classList.contains('collapsed');
    if (collapsing) {
      body.style.maxHeight = body.scrollHeight + 'px';
      body.offsetHeight; // force reflow
      body.classList.add('collapsed');
      body.style.maxHeight = '';
    } else {
      body.classList.remove('collapsed');
      body.style.maxHeight = body.scrollHeight + 'px';
      body.addEventListener('transitionend', function handler() {
        body.removeEventListener('transitionend', handler);
        if (!body.classList.contains('collapsed')) body.style.maxHeight = 'none';
      }, { once: true });
    }
    shortcutsToggle.classList.toggle('collapsed');
    shortcutsToggle.setAttribute('aria-expanded', !shortcutsToggle.classList.contains('collapsed'));
  };
  shortcutsToggle.addEventListener('click', toggleShortcuts);
  shortcutsToggle.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleShortcuts(); }
  });
  registerDismiss(infoPopover, () => infoPopover.classList.remove('open'), ['#toolbar-info', '#panel-cite-link']);

  // --- Cite link in sidebar footer ---
  $('panel-cite-link').addEventListener('click', () => {
    themePopover.classList.remove('open');
    infoPopover.classList.add('open');
    const cite = infoPopover.querySelector('.info-cite');
    if (cite) {
      const body = infoPopover.querySelector('.info-body');
      if (body) body.scrollTop = cite.offsetTop - body.offsetTop;
    }
  });

  // --- Copy citation ---
  $('copy-citation').addEventListener('click', function() {
    const cite = 'Acatay, C. (2026). PlasmidStudio: an interactive plasmid map editor. Available at https://plasmidstudio.app';
    navigator.clipboard.writeText(cite).then(() => {
      this.textContent = 'Copied!';
      setTimeout(() => { this.textContent = 'Copy citation'; }, 1500);
    });
  });

  $('reset-onboarding').addEventListener('click', function() {
    try { localStorage.removeItem(WT_KEY); _wtTriggered = false; } catch(e) {}
    this.textContent = 'Tips reset!';
    setTimeout(() => { this.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Reset onboarding tips';
    }, 1500);
    setTimeout(startWalkthrough, 500);
  });

  // --- Undo/Redo toolbar buttons ---
  $('toolbar-undo').addEventListener('click', undo);
  $('toolbar-redo').addEventListener('click', redo);

  // --- Tooltip ---
  const tooltip = $('tooltip');
  function showTooltip(e, f) {
    const isMarker = f.type === 'marker';

    // Name + type badge
    const nameEl = tooltip.querySelector('.tt-name');
    nameEl.innerHTML = '';
    nameEl.appendChild(document.createTextNode(f.name));
    const badge = document.createElement('span');
    badge.className = 'tt-type';
    badge.textContent = (f.type === 'marker' && f.enzyme) ? 'enzyme' : f.type;
    nameEl.appendChild(badge);

    const metaEl = tooltip.querySelector('.tt-meta');
    const rangeEl = tooltip.querySelector('.tt-range');
    const seqEl = tooltip.querySelector('.tt-seq');
    const proteinEl = tooltip.querySelector('.tt-protein');

    if (isMarker) {
      metaEl.textContent = '';
      const posSpan = document.createElement('span');
      posSpan.textContent = 'Position: ' + f.start + ' bp';
      metaEl.appendChild(posSpan);
      rangeEl.textContent = '';
      if (f.enzyme) {
        const cutDiv = document.createElement('div');
        cutDiv.className = 'tt-re-cut';
        cutDiv.innerHTML = buildCutDiagramHTML(f.enzyme);
        rangeEl.textContent = '';
        rangeEl.appendChild(cutDiv);
      }
      seqEl.classList.remove('visible');
      proteinEl.classList.remove('visible');
    } else {
      // Meta line: direction + length
      const total = getLength();
      let len = f.end >= f.start ? f.end - f.start + 1 : total - f.start + 1 + f.end;
      const dirLabel = f.direction === 1 ? 'Forward' : (f.direction === -1 ? 'Reverse' : 'None');
      metaEl.textContent = '';
      const dirSpan = document.createElement('span');
      dirSpan.textContent = dirLabel;
      const sep = document.createElement('span');
      sep.className = 'tt-sep';
      const lenSpan = document.createElement('span');
      lenSpan.textContent = len + ' bp';
      metaEl.append(dirSpan, sep, lenSpan);

      // Range line
      rangeEl.textContent = `[${f.start}] Start \u2013 [${f.end}] End`;

      // Sequence (only when in sequence mode)
      if (inputMode === 'sequence') {
        const fullSeq = getSequence().toUpperCase();
        if (fullSeq.length > 0) {
          let subSeq;
          if (f.end >= f.start) {
            subSeq = fullSeq.slice(f.start - 1, f.end);
          } else {
            subSeq = fullSeq.slice(f.start - 1) + fullSeq.slice(0, f.end);
          }
          // Format in groups of 10, show up to 200 bp
          const maxShow = 200;
          let display = subSeq.slice(0, maxShow).replace(/(.{10})/g, '$1 ').trim();
          if (subSeq.length > maxShow) display += ' …';
          seqEl.textContent = display;
          seqEl.classList.add('visible');

          // Protein translation for CDS-like features
          const isCDS = f.type === 'gene' || f.type === 'resistance';
          if (isCDS && subSeq.length >= 3) {
            const codingSeq = f.direction === -1 ? reverseComplement(subSeq) : subSeq;
            const protein = translateDNA(codingSeq);
            const maxAA = 80;
            let protDisplay = protein.slice(0, maxAA).replace(/(.{10})/g, '$1 ').trim();
            if (protein.length > maxAA) protDisplay += ' …';
            proteinEl.textContent = protDisplay + '  (' + protein.length + ' aa)';
            proteinEl.classList.add('visible');
          } else {
            proteinEl.classList.remove('visible');
          }
        } else {
          seqEl.classList.remove('visible');
          proteinEl.classList.remove('visible');
        }
      } else {
        seqEl.classList.remove('visible');
        proteinEl.classList.remove('visible');
      }
    }

    tooltip.style.opacity = '1';
    moveTooltip(e);
  }
  // --- Feature right-click (tooltip expansion) ---
  let tooltipPinned = false;
  let pinnedFeatureIdx = -1;

  function moveTooltip(e) {
    if (tooltipPinned) return;
    const rect = $mapContainer.getBoundingClientRect();
    let left = e.clientX - rect.left + 14;
    let top = e.clientY - rect.top - 10;
    const tw = tooltip.offsetWidth || 200;
    const th = tooltip.offsetHeight || 80;
    if (left + tw > rect.width - 8) left = e.clientX - rect.left - tw - 14;
    if (top + th > rect.height - 8) top = rect.height - th - 8;
    if (top < 8) top = 8;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }
  function hideTooltip() {
    if (tooltipPinned) return;
    tooltip.style.opacity = '0';
  }

  function getFeatureSequence(f) {
    const fullSeq = getSequence().toUpperCase();
    if (!fullSeq) return '';
    if (f.end >= f.start) return fullSeq.slice(f.start - 1, f.end);
    return fullSeq.slice(f.start - 1) + fullSeq.slice(0, f.end);
  }

  function complementBase(c) {
    return { A: 'T', T: 'A', G: 'C', C: 'G' }[c] || c;
  }

  function complement(seq) {
    return seq.split('').map(complementBase).join('');
  }

  function reverseComplement(seq) {
    return complement(seq).split('').reverse().join('');
  }

  // Standard codon table (NCBI translation table 1)
  const CODON_TABLE = {
    TTT:'F',TTC:'F',TTA:'L',TTG:'L',CTT:'L',CTC:'L',CTA:'L',CTG:'L',
    ATT:'I',ATC:'I',ATA:'I',ATG:'M',GTT:'V',GTC:'V',GTA:'V',GTG:'V',
    TCT:'S',TCC:'S',TCA:'S',TCG:'S',CCT:'P',CCC:'P',CCA:'P',CCG:'P',
    ACT:'T',ACC:'T',ACA:'T',ACG:'T',GCT:'A',GCC:'A',GCA:'A',GCG:'A',
    TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',
    AAT:'N',AAC:'N',AAA:'K',AAG:'K',GAT:'D',GAC:'D',GAA:'E',GAG:'E',
    TGT:'C',TGC:'C',TGA:'*',TGG:'W',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
    AGT:'S',AGC:'S',AGA:'R',AGG:'R',GGT:'G',GGC:'G',GGA:'G',GGG:'G',
  };

  function translateDNA(seq) {
    const codingSeq = seq.toUpperCase().replace(/[^ATGC]/g, '');
    let protein = '';
    for (let i = 0; i + 2 < codingSeq.length; i += 3) {
      const codon = codingSeq.substring(i, i + 3);
      protein += CODON_TABLE[codon] || '?';
    }
    return protein;
  }

  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('tt-action-copied');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('tt-action-copied'); }, 800);
      }
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  function pinTooltip(e, idx) {
    e.preventDefault();
    const f = features[idx];
    if (!f) return;

    closeAllPopovers();
    // Temporarily unpin so showTooltip can reposition
    tooltipPinned = false;
    pinnedFeatureIdx = idx;

    // Show the tooltip with feature info (reuse showTooltip)
    showTooltip(e, f);
    tooltipPinned = true;

    // Expand: show actions, make interactive
    tooltip.classList.add('tt-expanded');
    tooltip.style.pointerEvents = 'auto';

    // Clamp tooltip to viewport on all four edges
    requestAnimationFrame(() => {
      const ttRect = tooltip.getBoundingClientRect();
      const containerRect = $mapContainer.getBoundingClientRect();
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      const pad = 8;

      // Vertical: prefer below cursor, flip above if overflows bottom
      if (ttRect.bottom > viewH - pad) {
        const above = e.clientY - containerRect.top - ttRect.height - 6;
        tooltip.style.top = Math.max(pad - containerRect.top, above) + 'px';
      }
      // If still overflows top after flip, clamp to top
      const ttRect2 = tooltip.getBoundingClientRect();
      if (ttRect2.top < pad) {
        tooltip.style.top = (pad - containerRect.top) + 'px';
      }

      // Horizontal: prefer right of cursor, flip left if overflows
      if (ttRect.right > viewW - pad) {
        const left = e.clientX - containerRect.left - ttRect.width - 14;
        tooltip.style.left = Math.max(pad - containerRect.left, left) + 'px';
      }
      const ttRect3 = tooltip.getBoundingClientRect();
      if (ttRect3.left < pad) {
        tooltip.style.left = (pad - containerRect.left) + 'px';
      }
    });

    // Update action states
    const actionsEl = tooltip.querySelector('.tt-actions');
    const hasSeq = inputMode === 'sequence' && getSequence().length > 0;
    actionsEl.querySelectorAll('[data-action="copy-seq"],[data-action="copy-comp"],[data-action="copy-revcomp"],[data-action="copy-fasta"],[data-action="copy-protein"]').forEach(btn => {
      btn.disabled = !hasSeq;
      btn.title = hasSeq ? '' : 'Requires sequence input mode';
    });
    // Copy Protein only for CDS-like features
    const proteinBtn = actionsEl.querySelector('[data-action="copy-protein"]');
    if (proteinBtn) {
      const isCDS = f.type === 'gene' || f.type === 'resistance';
      proteinBtn.style.display = isCDS ? '' : 'none';
    }

    // Update visibility toggle label
    const visBtn = actionsEl.querySelector('[data-action="toggle-vis"]');
    const hidden = f.visible === false;
    visBtn.textContent = hidden ? 'Show' : 'Hide';
  }

  function unpinTooltip() {
    tooltipPinned = false;
    pinnedFeatureIdx = -1;
    tooltip.classList.remove('tt-expanded');
    tooltip.style.pointerEvents = 'none';
    hideTooltip();
  }

  // Right-click on feature arcs
  $svg.addEventListener('contextmenu', e => {
    if ($svg.classList.contains('pan-mode')) return;
    const arc = e.target.closest('.feature-arc');
    if (arc) {
      const idx = parseInt(arc.dataset.idx);
      if (!isNaN(idx) && features[idx]) {
        pinTooltip(e, idx);
        return;
      }
    }
    // Right-click elsewhere - unpin if pinned
    if (tooltipPinned) unpinTooltip();
  });

  // Handle action clicks inside the expanded tooltip
  tooltip.querySelector('.tt-actions').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    if (pinnedFeatureIdx < 0 || !features[pinnedFeatureIdx]) return;
    const f = features[pinnedFeatureIdx];

    switch (action) {
      case 'copy-seq':
        copyToClipboard(getFeatureSequence(f), btn);
        break;
      case 'copy-comp':
        copyToClipboard(complement(getFeatureSequence(f)), btn);
        break;
      case 'copy-revcomp':
        copyToClipboard(reverseComplement(getFeatureSequence(f)), btn);
        break;
      case 'copy-fasta': {
        const fastaSeq = getFeatureSequence(f);
        const wrapped = fastaSeq.match(/.{1,70}/g)?.join('\n') || '';
        copyToClipboard(`>${f.name} ${f.start}..${f.end}\n${wrapped}`, btn);
        break;
      }
      case 'copy-protein': {
        const seq = getFeatureSequence(f);
        const codingSeq = f.direction === -1 ? reverseComplement(seq) : seq;
        copyToClipboard(translateDNA(codingSeq), btn);
        break;
      }
      case 'copy-name':
        copyToClipboard(f.name, btn);
        break;
      case 'copy-range':
        copyToClipboard(`${f.start}..${f.end}`, btn);
        break;
      case 'duplicate': {
        pushUndo();
        const clone = JSON.parse(JSON.stringify(f));
        clone.name = f.name + ' copy';
        features.splice(pinnedFeatureIdx + 1, 0, clone);
        unpinTooltip();
        selectFeature(pinnedFeatureIdx + 1);
        break;
      }
      case 'toggle-vis':
        pushUndo();
        f.visible = f.visible === false ? true : false;
        unpinTooltip();
        renderFeatureList();
        render();
        break;
      case 'delete': {
        const dName = f.name;
        const dIdx = pinnedFeatureIdx;
        showConfirm(`Delete <strong>${escHtml(dName)}</strong>?`, () => {
          pushUndo();
          unpinTooltip();
          features.splice(dIdx, 1);
          if (selectedIdx === dIdx) { selectedIdx = -1; }
          else if (selectedIdx > dIdx) { selectedIdx--; }
          renderFeatureList();
          render();
        });
        break;
      }
    }
  });

  // Close expanded tooltip on outside click
  document.addEventListener('mousedown', e => {
    if (tooltipPinned && !tooltip.contains(e.target)) {
      unpinTooltip();
    }
  });

  // --- Feature list ---
  let dragFromIdx = -1;

  function moveFeature(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    if (fromIdx >= features.length || toIdx >= features.length) return;
    pushUndo();
    const item = features.splice(fromIdx, 1)[0];
    features.splice(toIdx, 0, item);
    // Update selectedIdx to follow the moved feature
    if (selectedIdx === fromIdx) {
      selectedIdx = toIdx;
    } else if (selectedIdx > fromIdx && selectedIdx <= toIdx) {
      selectedIdx--;
    } else if (selectedIdx < fromIdx && selectedIdx >= toIdx) {
      selectedIdx++;
    }
    renderFeatureList();
    render();
  }

  function moveMarker(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    if (fromIdx >= markers.length || toIdx >= markers.length) return;
    pushUndo();
    const item = markers.splice(fromIdx, 1)[0];
    markers.splice(toIdx, 0, item);
    if (selectedMarkerIdx === fromIdx) {
      selectedMarkerIdx = toIdx;
    } else if (selectedMarkerIdx > fromIdx && selectedMarkerIdx <= toIdx) {
      selectedMarkerIdx--;
    } else if (selectedMarkerIdx < fromIdx && selectedMarkerIdx >= toIdx) {
      selectedMarkerIdx++;
    }
    renderMarkerList();
    render();
  }

  function renderFeatureList() {
    // Clamp keyboard focus
    if (kbFocusList === 'features' && kbFocusIdx >= features.length) {
      kbFocusIdx = features.length - 1;
    }
    const ul = $featureList;
    cleanupFontPickers(ul);
    ul.innerHTML = '';

    // Show/hide search bar
    const searchWrap = $('feature-search-wrap');
    const searchInput = $('feature-search');
    if (features.length >= FEATURE_SEARCH_THRESHOLD) {
      searchWrap.style.display = '';
      searchInput.value = _featureFilter;
      searchWrap.classList.toggle('has-value', _featureFilter.length > 0);
    } else {
      searchWrap.style.display = 'none';
      _featureFilter = '';
    }

    if (features.length === 0) {
      ul.innerHTML = '<li class="empty-state"><div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg></div><div class="empty-text">No features yet</div><div class="empty-hint">Use the form above to add annotations</div></li>';
      return;
    }

    const filterLc = _featureFilter.toLowerCase();
    const frag = document.createDocumentFragment();
    let matchCount = 0;
    features.forEach((f, i) => {
      const nameMatches = !filterLc || f.name.toLowerCase().includes(filterLc);
      const matchesFilter = nameMatches || i === selectedIdx;
      if (nameMatches) matchCount++;
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.fidx = i;
      if (!matchesFilter) li.style.display = 'none';
      if (i === selectedIdx) li.classList.add('selected');
      if (kbFocusList === 'features' && i === kbFocusIdx) li.classList.add('kb-focused');
      const hidden = f.visible === false;
      if (hidden) li.classList.add('item-hidden');
      const trackLabel = (f.track || 0) !== 0
        ? `<span class="track-badge" title="Track ${f.track > 0 ? 'Outer ' + f.track : 'Inner ' + Math.abs(f.track)}">${f.track > 0 ? 'O' + f.track : 'I' + Math.abs(f.track)}</span>`
        : '';
      const typeIcon = TYPE_ICONS[f.type] || TYPE_ICONS.misc;
      li.innerHTML = `<span class="drag-handle" title="Drag to reorder">\u2261</span>
        <div class="swatch" style="background:${f.color}"></div>
        <span class="ftype-icon" title="${escHtml(f.type)}">${typeIcon}</span>
        <span class="fname">${escHtml(f.name)}</span>${trackLabel}
        <span class="frange">${f.start}-${f.end}</span>
        <span class="frange">${f.direction === 1 ? '\u27A1' : (f.direction === -1 ? '\u2B05' : '\u2014')}</span>
        <span class="item-actions">
          <button class="btn-vis" title="${hidden ? 'Show' : 'Hide'}" aria-label="${hidden ? 'Show' : 'Hide'}" data-idx="${i}">${hidden ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
          <button class="btn-dup" title="Duplicate" aria-label="Duplicate" data-idx="${i}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/><line x1="15.5" y1="13.5" x2="15.5" y2="18.5"/><line x1="13" y1="16" x2="18" y2="16"/></svg></button>
          <button class="btn-move-up" title="Move up" aria-label="Move up" data-idx="${i}">\u25B2</button>
          <button class="btn-move-down" title="Move down" aria-label="Move down" data-idx="${i}">\u25BC</button>
          <button class="btn-danger" title="Delete" aria-label="Delete" data-idx="${i}">\u2715</button>
        </span>`;
      frag.appendChild(li);
      if (i === selectedIdx) frag.appendChild(buildInlineEditPanel(f));
    });

    // "No matches" message when search filter hides all items
    if (filterLc && matchCount === 0) {
      const noMatch = document.createElement('li');
      noMatch.className = 'empty-state';
      noMatch.innerHTML = '<div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div class="empty-text">No matching features</div><div class="empty-hint">Try a different search term</div>';
      frag.appendChild(noMatch);
    }

    ul.appendChild(frag);
  }

  let openBulkStyleDialog; // set by bulk-style IIFE below

  // Delegated event handlers for feature list (bound once, not per-render)
  (function() {
    const ul = $featureList;

    function idxFromEvent(e) {
      const li = e.target.closest('li[data-fidx]');
      return li ? parseInt(li.dataset.fidx) : -1;
    }

    ul.addEventListener('click', e => {
      const i = idxFromEvent(e);
      if (i < 0 || i >= features.length) return;
      e.stopPropagation();
      const f = features[i];
      if (e.target.closest('.btn-danger')) {
        const di = i;
        showConfirm(`Delete <strong>${escHtml(f.name)}</strong>?`, () => {
          pushUndo();
          features.splice(di, 1);
          if (selectedIdx === di) deselectFeature();
          else { if (selectedIdx > di) selectedIdx--; renderFeatureList(); render(); }
        });
      } else if (e.target.closest('.btn-vis')) {
        pushUndo();
        f.visible = f.visible === false ? true : false;
        renderFeatureList(); render();
      } else if (e.target.closest('.btn-dup')) {
        pushUndo();
        const clone = JSON.parse(JSON.stringify(f));
        clone.name = f.name + ' copy';
        features.splice(i + 1, 0, clone);
        selectFeature(i + 1);
      } else if (e.target.closest('.btn-move-up')) {
        if (i > 0) moveFeature(i, i - 1);
      } else if (e.target.closest('.btn-move-down')) {
        if (i < features.length - 1) moveFeature(i, i + 1);
      } else if (!e.target.closest('.drag-handle') && !e.target.closest('.inline-edit')) {
        if (selectedIdx === i) deselectFeature(); else selectFeature(i);
      }
    });

    ul.addEventListener('dragstart', e => {
      const i = idxFromEvent(e);
      if (i < 0) return;
      dragFromIdx = i;
      e.target.closest('li').classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    ul.addEventListener('dragend', e => {
      const li = e.target.closest('li');
      if (li) li.classList.remove('dragging');
      dragFromIdx = -1;
      ul.querySelectorAll('.drag-insert-before,.drag-insert-after').forEach(el => {
        el.classList.remove('drag-insert-before', 'drag-insert-after');
      });
    });
    ul.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const li = e.target.closest('li[data-fidx]');
      if (!li) return;
      const thisIdx = parseInt(li.dataset.fidx);
      if (thisIdx === dragFromIdx) return;
      const rect = li.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      li.classList.toggle('drag-insert-before', e.clientY < midY);
      li.classList.toggle('drag-insert-after', e.clientY >= midY);
    });
    ul.addEventListener('dragleave', e => {
      const li = e.target.closest('li[data-fidx]');
      if (li) li.classList.remove('drag-insert-before', 'drag-insert-after');
    });
    ul.addEventListener('drop', e => {
      e.preventDefault();
      const li = e.target.closest('li[data-fidx]');
      if (!li) return;
      const before = li.classList.contains('drag-insert-before');
      li.classList.remove('drag-insert-before', 'drag-insert-after');
      let toIdx = parseInt(li.dataset.fidx);
      if (!before && toIdx < dragFromIdx) toIdx++;
      else if (before && toIdx > dragFromIdx) toIdx--;
      if (dragFromIdx >= 0 && dragFromIdx !== toIdx) {
        moveFeature(dragFromIdx, toIdx);
      }
      dragFromIdx = -1;
    });

    // Right-click context menu on feature list items
    const featCtxMenu = $('feat-ctx-menu');
    let _featCtxIdx = -1;

    function showFeatContextMenu(idx, e) {
      _featCtxIdx = idx;
      const f = features[idx];
      if (!f) return;
      const typeName = f.type.charAt(0).toUpperCase() + f.type.slice(1);
      const typeCount = features.filter(x => x.type === f.type).length;
      const allHidden = features.filter(x => x.type === f.type).every(x => x.visible === false);
      $('feat-ctx-style-label').textContent = `Style all ${typeName}s (${typeCount})`;
      $('feat-ctx-hide-label').textContent = allHidden ? `Show all ${typeName}s` : `Hide all ${typeName}s`;
      let left = e.clientX;
      let top = e.clientY;
      // Clamp to viewport
      left = Math.min(left, window.innerWidth - 180);
      top = Math.min(top, window.innerHeight - 200);
      featCtxMenu.style.left = left + 'px';
      featCtxMenu.style.top = top + 'px';
      featCtxMenu.classList.add('open');
    }

    function dismissFeatCtxMenu() {
      featCtxMenu.classList.remove('open');
      _featCtxIdx = -1;
    }

    ul.addEventListener('contextmenu', e => {
      const li = e.target.closest('li[data-fidx]');
      if (!li) return;
      e.preventDefault();
      e.stopPropagation();
      dismissFeatCtxMenu();
      closeAllPopovers();
      showFeatContextMenu(parseInt(li.dataset.fidx), e);
    });

    $('feat-ctx-select').addEventListener('click', () => {
      const idx = _featCtxIdx;
      dismissFeatCtxMenu();
      if (idx >= 0 && idx < features.length) selectFeature(idx);
    });

    $('feat-ctx-duplicate').addEventListener('click', () => {
      const idx = _featCtxIdx;
      dismissFeatCtxMenu();
      if (idx < 0 || idx >= features.length) return;
      pushUndo();
      const clone = JSON.parse(JSON.stringify(features[idx]));
      clone.name = features[idx].name + ' copy';
      features.splice(idx + 1, 0, clone);
      selectFeature(idx + 1);
    });

    $('feat-ctx-delete').addEventListener('click', () => {
      const idx = _featCtxIdx;
      const f = features[idx];
      dismissFeatCtxMenu();
      if (!f) return;
      showConfirm(`Delete <strong>${escHtml(f.name)}</strong>?`, () => {
        pushUndo();
        features.splice(idx, 1);
        if (selectedIdx === idx) deselectFeature();
        else { if (selectedIdx > idx) selectedIdx--; renderFeatureList(); render(); }
      });
    });

    $('feat-ctx-hide-type').addEventListener('click', () => {
      const idx = _featCtxIdx;
      const f = features[idx];
      dismissFeatCtxMenu();
      if (!f) return;
      const type = f.type;
      const allHidden = features.filter(x => x.type === type).every(x => x.visible === false);
      pushUndo();
      features.forEach(x => { if (x.type === type) x.visible = allHidden; });
      renderFeatureList(); render();
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      showToast(`${allHidden ? 'Showing' : 'Hiding'} all ${typeName} features`, 'success');
    });

    $('feat-ctx-style-type').addEventListener('click', () => {
      const idx = _featCtxIdx;
      const f = features[idx];
      dismissFeatCtxMenu();
      if (!f) return;
      openBulkStyleDialog(f.type);
    });

    registerDismiss(featCtxMenu, dismissFeatCtxMenu, []);
    document.addEventListener('mousedown', e => {
      if (featCtxMenu.classList.contains('open') && !featCtxMenu.contains(e.target)) {
        dismissFeatCtxMenu();
      }
    });
  })();

  // --- Bulk style by type dialog ---
  (function() {
    const overlay = $('bulk-style-overlay');
    const dialog = $('bulk-style-dialog');
    const body = $('bulk-style-body');
    const titleEl = $('bulk-style-title');
    const countEl = $('bulk-style-count');
    let _bulkType = '';
    let _bulkSnapshot = null; // for live preview + cancel

    const BULK_STYLE_PROPS = [
      'color', 'opacity', 'border', 'borderColor', 'borderStyle',
      'arrow', 'arrowStyle', 'tailCut',
      'showLabel', 'labelPos', 'labelOrientation', 'labelColor', 'labelSize', 'labelFont', 'leaderLine'
    ];

    openBulkStyleDialog = function(type) {
      _bulkType = type;
      const matching = features.filter(f => f.type === type);
      if (matching.length === 0) return;
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      titleEl.textContent = `Style all ${typeName}s`;
      countEl.textContent = `${matching.length} feature${matching.length > 1 ? 's' : ''}`;

      // Snapshot for cancel/revert
      _bulkSnapshot = features.map(f => ({ ...f }));

      // Use the first matching feature as the reference for initial values
      const ref = matching[0];

      body.innerHTML = '';
      const html = `
        <div class="bulk-row">
          <label>Color</label>
          <div id="bulk-color-picker" class="bulk-color-picker"></div>
        </div>
        <div class="bulk-row">
          <label>Opacity</label>
          <div class="bulk-range-row">
            <input type="range" id="bulk-opacity" min="0" max="100" value="${Math.round(ref.opacity * 100)}">
            <span id="bulk-opacity-val">${Math.round(ref.opacity * 100)}%</span>
          </div>
        </div>
        <div class="bulk-row">
          <label>Border</label>
          <div class="bulk-range-row">
            <input type="range" id="bulk-border" min="0" max="4" step="0.5" value="${ref.border}">
            <span id="bulk-border-val">${ref.border}</span>
          </div>
        </div>
        <div class="bulk-row bulk-two-col">
          <div>
            <label>Border style</label>
            <select id="bulk-border-style">
              <option value="solid"${ref.borderStyle === 'solid' ? ' selected' : ''}>Solid</option>
              <option value="dashed"${ref.borderStyle === 'dashed' ? ' selected' : ''}>Dashed</option>
              <option value="dotted"${ref.borderStyle === 'dotted' ? ' selected' : ''}>Dotted</option>
            </select>
          </div>
          <div>
            <label>Border color</label>
            <input type="color" id="bulk-border-color" value="${ref.borderColor}">
          </div>
        </div>
        <div class="bulk-row bulk-two-col">
          <div>
            <label>Arrow head</label>
            <select id="bulk-arrow-style">
              <option value="flat"${!ref.arrow ? ' selected' : ''}>Flat</option>
              <option value="pointed"${ref.arrow && ref.arrowStyle === 'pointed' ? ' selected' : ''}>Pointed</option>
              <option value="flared"${ref.arrow && ref.arrowStyle === 'flared' ? ' selected' : ''}>Flared</option>
              <option value="interior"${ref.arrow && ref.arrowStyle === 'interior' ? ' selected' : ''}>Interior</option>
            </select>
          </div>
          <div>
            <label>Tail</label>
            <select id="bulk-tail">
              <option value="flat"${!ref.tailCut ? ' selected' : ''}>Flat</option>
              <option value="notched"${ref.tailCut ? ' selected' : ''}>Notched</option>
            </select>
          </div>
        </div>
        <hr class="bulk-divider">
        <div class="bulk-row">
          <label class="bulk-check"><input type="checkbox" id="bulk-show-label"${ref.showLabel ? ' checked' : ''}> Show labels</label>
        </div>
        <div id="bulk-label-opts"${ref.showLabel ? '' : ' style="display:none"'}>
          <div class="bulk-row bulk-two-col">
            <div>
              <label>Label position</label>
              <select id="bulk-label-pos">
                <option value="on"${ref.labelPos === 'on' ? ' selected' : ''}>On feature</option>
                ${viewMode === 'linear'
                  ? `<option value="inside"${ref.labelPos === 'inside' ? ' selected' : ''}>Below</option>`
                  : `<option value="inside"${ref.labelPos === 'inside' ? ' selected' : ''}>Inside ring</option>
                <option value="outside"${ref.labelPos === 'outside' ? ' selected' : ''}>Outside ring</option>`}
              </select>
            </div>
            <div>
              <label>Orientation</label>
              <select id="bulk-label-orient">
                <option value="curved"${ref.labelOrientation === 'curved' ? ' selected' : ''}>Curved</option>
                <option value="horizontal"${ref.labelOrientation === 'horizontal' ? ' selected' : ''}>Horizontal</option>
              </select>
            </div>
          </div>
          <div class="bulk-row bulk-two-col">
            <div>
              <label>Label color</label>
              <input type="color" id="bulk-label-color" value="${ref.labelColor}">
            </div>
            <div>
              <label>Label size</label>
              <input type="number" id="bulk-label-size" min="6" max="24" value="${ref.labelSize}">
            </div>
          </div>
          <div class="bulk-row bulk-two-col">
            <div>
              <label>Leader line</label>
              <select id="bulk-leader-line">
                <option value="never"${ref.leaderLine === 'never' ? ' selected' : ''}>Never</option>
                <option value="auto"${ref.leaderLine === 'auto' ? ' selected' : ''}>Auto</option>
                <option value="always"${ref.leaderLine === 'always' ? ' selected' : ''}>Always</option>
              </select>
            </div>
            <div>
              <label>Font</label>
              <select id="bulk-label-font">
                <option value="sans-serif"${ref.labelFont === 'sans-serif' ? ' selected' : ''}>Sans-serif</option>
                <option value="serif"${ref.labelFont === 'serif' ? ' selected' : ''}>Serif</option>
                <option value="monospace"${ref.labelFont === 'monospace' ? ' selected' : ''}>Monospace</option>
              </select>
            </div>
          </div>
        </div>
      `;
      body.innerHTML = html;

      // Build color picker
      buildColorPicker(body.querySelector('#bulk-color-picker'), ref.color, c => {
        applyBulkPreview();
      });

      // Show label toggle
      const showLabelCheck = body.querySelector('#bulk-show-label');
      const labelOpts = body.querySelector('#bulk-label-opts');
      showLabelCheck.addEventListener('change', () => {
        labelOpts.style.display = showLabelCheck.checked ? '' : 'none';
        applyBulkPreview();
      });

      // Live preview on all inputs
      body.querySelectorAll('input[type="range"], input[type="number"], select, input[type="color"]').forEach(el => {
        const evt = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evt, () => applyBulkPreview());
      });

      // Display value updates for sliders
      const opSlider = body.querySelector('#bulk-opacity');
      const opVal = body.querySelector('#bulk-opacity-val');
      opSlider.addEventListener('input', () => { opVal.textContent = opSlider.value + '%'; });
      const bSlider = body.querySelector('#bulk-border');
      const bVal = body.querySelector('#bulk-border-val');
      bSlider.addEventListener('input', () => { bVal.textContent = bSlider.value; });

      overlay.classList.add('open');
    };

    function readBulkValues() {
      const hexInp = body.querySelector('#bulk-color-picker .cp-hex-input');
      let color = null;
      if (hexInp && /^#[0-9a-fA-F]{6}$/.test(hexInp.value)) {
        color = hexInp.value.toLowerCase();
      } else {
        const active = body.querySelector('#bulk-color-picker .color-opt.active');
        if (active && active.dataset.color) color = active.dataset.color;
      }

      const arrowVal = body.querySelector('#bulk-arrow-style').value;
      return {
        color: color,
        opacity: parseFloat(body.querySelector('#bulk-opacity').value) / 100,
        border: parseFloat(body.querySelector('#bulk-border').value),
        borderColor: body.querySelector('#bulk-border-color').value,
        borderStyle: body.querySelector('#bulk-border-style').value,
        arrow: arrowVal !== 'flat',
        arrowStyle: arrowVal === 'flared' ? 'flared' : (arrowVal === 'interior' ? 'interior' : 'pointed'),
        tailCut: body.querySelector('#bulk-tail').value === 'notched',
        showLabel: body.querySelector('#bulk-show-label').checked,
        labelPos: body.querySelector('#bulk-label-pos').value,
        labelOrientation: body.querySelector('#bulk-label-orient').value,
        labelColor: body.querySelector('#bulk-label-color').value,
        labelSize: parseInt(body.querySelector('#bulk-label-size').value) || 11,
        labelFont: body.querySelector('#bulk-label-font').value,
        leaderLine: body.querySelector('#bulk-leader-line').value,
      };
    }

    function applyBulkPreview() {
      const vals = readBulkValues();
      features.forEach(f => {
        if (f.type !== _bulkType) return;
        BULK_STYLE_PROPS.forEach(k => { if (vals[k] != null) f[k] = vals[k]; });
      });
      renderFeatureList();
      render();
    }

    function closeBulkStyleDialog(revert) {
      if (revert && _bulkSnapshot) {
        // Restore original feature state
        _bulkSnapshot.forEach((snap, i) => {
          if (i < features.length) Object.assign(features[i], snap);
        });
        renderFeatureList();
        render();
      }
      _bulkSnapshot = null;
      _bulkType = '';
      overlay.classList.remove('open');
      body.innerHTML = '';
    }

    $('bulk-style-apply').addEventListener('click', () => {
      // Revert to snapshot, push undo, then re-apply
      const vals = readBulkValues();
      const type = _bulkType;
      if (_bulkSnapshot) {
        _bulkSnapshot.forEach((snap, i) => {
          if (i < features.length) Object.assign(features[i], snap);
        });
      }
      pushUndo();
      features.forEach(f => {
        if (f.type !== type) return;
        BULK_STYLE_PROPS.forEach(k => { if (vals[k] != null) f[k] = vals[k]; });
      });
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      const count = features.filter(f => f.type === type).length;
      closeBulkStyleDialog(false);
      showToast(`Styled ${count} ${typeName} feature${count > 1 ? 's' : ''}`, 'success');
    });

    $('bulk-style-cancel').addEventListener('click', () => closeBulkStyleDialog(true));
    $('bulk-style-close').addEventListener('click', () => closeBulkStyleDialog(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeBulkStyleDialog(true); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        e.preventDefault();
        closeBulkStyleDialog(true);
      }
    });
  })();

  // --- Bulk marker style dialog ---
  let openBulkMarkerDialog;
  (function() {
    const overlay = $('bulk-marker-overlay');
    const body = $('bulk-marker-body');
    const titleEl = $('bulk-marker-title');
    const countEl = $('bulk-marker-count');
    let _snapshot = null;
    let _reOnly = false; // true = only RE markers, false = all markers

    const BULK_MARKER_PROPS = [
      'color', 'lineLen', 'lineWidth', 'lineStyle',
      'outerLabel', 'outerSize', 'outerColor', 'outerFont', 'outerOrientation',
      'innerLabel', 'innerSize', 'innerColor', 'innerFont', 'innerOrientation'
    ];

    function matchingMarkers() {
      return markers.filter(m => _reOnly ? m.enzyme : true);
    }

    openBulkMarkerDialog = function(reOnly) {
      _reOnly = !!reOnly;
      const matching = matchingMarkers();
      if (matching.length === 0) return;
      titleEl.textContent = _reOnly ? 'Style all RE markers' : 'Style all markers';
      countEl.textContent = `${matching.length} marker${matching.length > 1 ? 's' : ''}`;

      _snapshot = markers.map(m => ({ ...m }));
      const ref = matching[0];

      body.innerHTML = `
        <div class="bulk-row">
          <label>Line color</label>
          <div id="bm-color-picker" class="bulk-color-picker"></div>
        </div>
        <div class="bulk-row bulk-two-col">
          <div>
            <label>Line length</label>
            <input type="number" id="bm-line-len" min="4" max="60" value="${ref.lineLen || 18}">
          </div>
          <div>
            <label>Line width</label>
            <input type="number" id="bm-line-width" min="0.5" max="6" step="0.5" value="${ref.lineWidth || 1.5}">
          </div>
        </div>
        <div class="bulk-row">
          <label>Line style</label>
          <select id="bm-line-style">
            <option value="solid"${(ref.lineStyle||'solid')==='solid'?' selected':''}>Solid</option>
            <option value="dashed"${ref.lineStyle==='dashed'?' selected':''}>Dashed</option>
            <option value="dotted"${ref.lineStyle==='dotted'?' selected':''}>Dotted</option>
          </select>
        </div>
        <hr class="bulk-divider">
        <div class="bulk-row">
          <label class="bulk-check"><input type="checkbox" id="bm-outer-show"${ref.outerLabel?' checked':''}> Outer label</label>
        </div>
        <div id="bm-outer-opts"${ref.outerLabel?'':' style="display:none"'}>
          <div class="bulk-row bulk-two-col">
            <div><label>Size</label><input type="number" id="bm-outer-size" min="6" max="20" value="${ref.outerSize || 10}"></div>
            <div><label>Color</label><input type="color" id="bm-outer-color" value="${ref.outerColor || '#1e293b'}"></div>
          </div>
          <div class="bulk-row bulk-two-col">
            <div><label>Font</label>
              <select id="bm-outer-font">
                <option value="sans-serif"${(ref.outerFont||'sans-serif')==='sans-serif'?' selected':''}>Sans-serif</option>
                <option value="serif"${ref.outerFont==='serif'?' selected':''}>Serif</option>
                <option value="monospace"${ref.outerFont==='monospace'?' selected':''}>Monospace</option>
              </select>
            </div>
            <div><label>Orientation</label>
              <select id="bm-outer-orient">
                <option value="curved"${(ref.outerOrientation||'curved')==='curved'?' selected':''}>Follow arc</option>
                <option value="horizontal"${ref.outerOrientation==='horizontal'?' selected':''}>Horizontal</option>
              </select>
            </div>
          </div>
        </div>
        <hr class="bulk-divider">
        <div class="bulk-row">
          <label class="bulk-check"><input type="checkbox" id="bm-inner-show"${ref.innerLabel?' checked':''}> Inner label</label>
        </div>
        <div id="bm-inner-opts"${ref.innerLabel?'':' style="display:none"'}>
          <div class="bulk-row bulk-two-col">
            <div><label>Size</label><input type="number" id="bm-inner-size" min="6" max="20" value="${ref.innerSize || 9}"></div>
            <div><label>Color</label><input type="color" id="bm-inner-color" value="${ref.innerColor || '#94a3b8'}"></div>
          </div>
          <div class="bulk-row bulk-two-col">
            <div><label>Font</label>
              <select id="bm-inner-font">
                <option value="sans-serif"${(ref.innerFont||'sans-serif')==='sans-serif'?' selected':''}>Sans-serif</option>
                <option value="serif"${ref.innerFont==='serif'?' selected':''}>Serif</option>
                <option value="monospace"${ref.innerFont==='monospace'?' selected':''}>Monospace</option>
              </select>
            </div>
            <div><label>Orientation</label>
              <select id="bm-inner-orient">
                <option value="curved"${(ref.innerOrientation||'curved')==='curved'?' selected':''}>Follow arc</option>
                <option value="horizontal"${ref.innerOrientation==='horizontal'?' selected':''}>Horizontal</option>
              </select>
            </div>
          </div>
        </div>
      `;

      buildColorPicker(body.querySelector('#bm-color-picker'), ref.color, () => applyBmPreview());

      // Toggle label sections
      const outerCheck = body.querySelector('#bm-outer-show');
      const outerOpts = body.querySelector('#bm-outer-opts');
      outerCheck.addEventListener('change', () => { outerOpts.style.display = outerCheck.checked ? '' : 'none'; applyBmPreview(); });
      const innerCheck = body.querySelector('#bm-inner-show');
      const innerOpts = body.querySelector('#bm-inner-opts');
      innerCheck.addEventListener('change', () => { innerOpts.style.display = innerCheck.checked ? '' : 'none'; applyBmPreview(); });

      // Live preview
      body.querySelectorAll('input[type="number"], input[type="color"], select').forEach(el => {
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => applyBmPreview());
      });

      overlay.classList.add('open');
    };

    function readBmValues() {
      const hexInp = body.querySelector('#bm-color-picker .cp-hex-input');
      let color = null;
      if (hexInp && /^#[0-9a-fA-F]{6}$/.test(hexInp.value)) {
        color = hexInp.value.toLowerCase();
      } else {
        const active = body.querySelector('#bm-color-picker .color-opt.active');
        if (active && active.dataset.color) color = active.dataset.color;
      }
      return {
        color,
        lineLen: parseFloat(body.querySelector('#bm-line-len').value) || 18,
        lineWidth: parseFloat(body.querySelector('#bm-line-width').value) || 1.5,
        lineStyle: body.querySelector('#bm-line-style').value,
        outerLabel: body.querySelector('#bm-outer-show').checked,
        outerSize: parseInt(body.querySelector('#bm-outer-size').value) || 10,
        outerColor: body.querySelector('#bm-outer-color').value,
        outerFont: body.querySelector('#bm-outer-font').value,
        outerOrientation: body.querySelector('#bm-outer-orient').value,
        innerLabel: body.querySelector('#bm-inner-show').checked,
        innerSize: parseInt(body.querySelector('#bm-inner-size').value) || 9,
        innerColor: body.querySelector('#bm-inner-color').value,
        innerFont: body.querySelector('#bm-inner-font').value,
        innerOrientation: body.querySelector('#bm-inner-orient').value,
      };
    }

    function applyBmPreview() {
      const vals = readBmValues();
      markers.forEach(m => {
        if (_reOnly && !m.enzyme) return;
        BULK_MARKER_PROPS.forEach(k => { if (vals[k] != null) m[k] = vals[k]; });
      });
      renderMarkerList();
      render();
    }

    function closeBmDialog(revert) {
      if (revert && _snapshot) {
        _snapshot.forEach((snap, i) => { if (i < markers.length) Object.assign(markers[i], snap); });
        renderMarkerList();
        render();
      }
      _snapshot = null;
      overlay.classList.remove('open');
      body.innerHTML = '';
    }

    $('bulk-marker-apply').addEventListener('click', () => {
      const vals = readBmValues();
      if (_snapshot) {
        _snapshot.forEach((snap, i) => { if (i < markers.length) Object.assign(markers[i], snap); });
      }
      pushUndo();
      markers.forEach(m => {
        if (_reOnly && !m.enzyme) return;
        BULK_MARKER_PROPS.forEach(k => { if (vals[k] != null) m[k] = vals[k]; });
      });
      const count = matchingMarkers().length;
      closeBmDialog(false);
      showToast(`Styled ${count} marker${count > 1 ? 's' : ''}`, 'success');
    });

    $('bulk-marker-cancel').addEventListener('click', () => closeBmDialog(true));
    $('bulk-marker-close').addEventListener('click', () => closeBmDialog(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeBmDialog(true); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        e.preventDefault();
        closeBmDialog(true);
      }
    });
  })();

  // Feature search/filter
  (function() {
    const input = $('feature-search');
    const clearBtn = $('feature-search-clear');
    const wrap = $('feature-search-wrap');

    function applyFilter() {
      const filterLc = _featureFilter.toLowerCase();
      let matchCount = 0;
      $featureList.querySelectorAll('li[data-fidx]').forEach(li => {
        const idx = parseInt(li.dataset.fidx);
        const f = features[idx];
        if (!f) return;
        const nameMatches = !filterLc || f.name.toLowerCase().includes(filterLc);
        const show = nameMatches || idx === selectedIdx;
        li.style.display = show ? '' : 'none';
        if (nameMatches) matchCount++;
        // Also hide/show the inline edit panel that follows this li
        if (idx === selectedIdx) {
          const next = li.nextElementSibling;
          if (next && next.classList.contains('inline-edit')) next.style.display = show ? '' : 'none';
        }
      });
      // Show/remove "no matches" message
      const existing = $featureList.querySelector('.empty-state');
      if (existing) existing.remove();
      if (filterLc && matchCount === 0) {
        const noMatch = document.createElement('li');
        noMatch.className = 'empty-state';
        noMatch.innerHTML = '<div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div class="empty-text">No matching features</div><div class="empty-hint">Try a different search term</div>';
        $featureList.appendChild(noMatch);
      }
    }

    input.addEventListener('input', () => {
      _featureFilter = input.value;
      wrap.classList.toggle('has-value', _featureFilter.length > 0);
      applyFilter();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        _featureFilter = '';
        input.value = '';
        wrap.classList.remove('has-value');
        applyFilter();
        input.blur();
      }
    });

    clearBtn.addEventListener('click', () => {
      _featureFilter = '';
      input.value = '';
      wrap.classList.remove('has-value');
      applyFilter();
      input.focus();
    });
  })();

  // Click on empty SVG area deselects
  // Deselect feature/marker when clicking anywhere outside editing-related UI
  document.addEventListener('click', e => {
    if (selectedIdx < 0 && selectedMarkerIdx < 0) return;
    // Don't deselect if clicking inside these areas
    if (e.target.closest('.feature-arc') || e.target.closest('.marker-group')) return;
    if (e.target.closest('#feature-list') || e.target.closest('#marker-list') || e.target.closest('#feature-search-wrap')) return;
    if (e.target.closest('.popover') || e.target.closest('.modal')) return;
    if (e.target.closest('.center-hit') || e.target.closest('.tick-hit')) return;
    if (e.target.closest('.backbone-hit') || e.target.closest('.ring-hit')) return;
    if (e.target.closest('#tab-ctx-menu') || e.target.closest('#close-confirm')) return;
    if (selectedIdx >= 0) deselectFeature();
    if (selectedMarkerIdx >= 0) deselectMarker();
  });

  // --- Markers ---
  function showMarkerError(msg) {
    const el = $('add-marker-error');
    el.textContent = msg; el.style.display = 'block';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  $('add-marker-btn').addEventListener('click', () => {
    const name = $('m-name').value.trim();
    const pos = parseInt($('m-pos').value);
    const color = $('m-color').value;
    const outerLabel = $('m-outer').checked;
    const innerLabel = $('m-inner').checked;
    const len = getLength();
    if (!name) { showMarkerError('Marker name is required.'); return; }
    if (isNaN(pos) || pos < 1 || pos > len) { showMarkerError('Position must be between 1 and ' + len + '.'); return; }
    pushUndo();
    markers.push({
      name, position: pos, color, ...MARKER_DEFAULTS,
      outerLabel, outerText: name, innerLabel, innerText: String(pos)
    });
    $('m-name').value = '';
    renderMarkerList(); render();
  });

  function selectMarker(idx) {
    if (idx < 0 || idx >= markers.length) return;
    if (selectedIdx >= 0) deselectFeature();
    if ($panel.classList.contains('re-expanded')) closeReModal();
    closeAllPopovers();
    ensurePanelSectionsVisible();
    collapseGcTrack();
    selectedMarkerIdx = idx;
    kbFocusList = 'markers';
    kbFocusIdx = idx;
    markerEditSnapshot = Object.assign({}, markers[idx]);
    switchTab('markers-tab');
    renderMarkerList();
    requestAnimationFrame(() => {
      const li = $markerList.querySelector(`li[data-midx="${idx}"]`);
      if (li) scrollIntoPane(li, 'start');
    });
    render();
  }

  let markerEditSnapshot = null;

  function deselectMarker() {
    cleanupFontPickers($markerList);
    selectedMarkerIdx = -1;
    markerEditSnapshot = null;
    renderMarkerList(); render();
  }

  function applyMarkerEdits() {
    if (selectedMarkerIdx < 0) return;
    pushUndoDebounced();
    const m = markers[selectedMarkerIdx];
    const panel = $('inline-marker-edit');
    if (!panel) return;
    const oldName = m.name;
    const oldPos = String(m.position);
    m.name = panel.querySelector('#me-name').value.trim() || m.name;
    m.position = parseInt(panel.querySelector('#me-pos').value) || m.position;
    m.color = panel.querySelector('#me-color').value;
    m.lineLen = parseFloat(panel.querySelector('#me-line-len').value) || 18;
    m.lineWidth = parseFloat(panel.querySelector('#me-line-width').value) || 1.5;
    m.lineStyle = panel.querySelector('#me-line-style').value;
    m.span = panel.querySelector('#me-span').value;
    m.spanFrom = parseInt(panel.querySelector('#me-span-from')?.value) || 0;
    m.spanTo = parseInt(panel.querySelector('#me-span-to')?.value) || 0;
    m.outerLabel = panel.querySelector('#me-outer').checked;
    m.outerSize = parseInt(panel.querySelector('#me-outer-size').value) || 10;
    m.outerColor = panel.querySelector('#me-outer-color').value;
    m.outerFont = panel.querySelector('#me-outer-font').value;
    m.outerOrientation = panel.querySelector('#me-outer-orient').value;
    m.innerLabel = panel.querySelector('#me-inner').checked;
    m.innerSize = parseInt(panel.querySelector('#me-inner-size').value) || 9;
    m.innerColor = panel.querySelector('#me-inner-color').value;
    m.innerFont = panel.querySelector('#me-inner-font').value;
    m.innerOrientation = panel.querySelector('#me-inner-orient').value;

    // Read label text from inputs, syncing based on display mode
    const outerTextEl = panel.querySelector('#me-outer-text');
    const innerTextEl = panel.querySelector('#me-inner-text');
    const outerMode = panel.querySelector('#me-outer-mode');
    const innerMode = panel.querySelector('#me-inner-mode');

    if (outerMode && outerMode.value === 'name') { outerTextEl.value = m.name; }
    else if (outerMode && outerMode.value === 'position') { outerTextEl.value = String(m.position); }

    if (innerMode && innerMode.value === 'name') { innerTextEl.value = m.name; }
    else if (innerMode && innerMode.value === 'position') { innerTextEl.value = String(m.position); }

    m.outerText = outerTextEl.value;
    m.innerText = innerTextEl.value;

    // Update the sidebar list item to reflect name/position changes
    const li = document.querySelector(`#marker-list li[data-midx="${selectedMarkerIdx}"]`);
    if (li) {
      const nameSpan = li.querySelector('.fname');
      const rangeSpan = li.querySelector('.frange');
      if (nameSpan) nameSpan.textContent = m.name;
      if (rangeSpan) rangeSpan.textContent = m.position + ' bp';
    }

    debouncedRender();
  }

  function buildMarkerEditPanel(m) {
    const div = document.createElement('li');
    div.id = 'inline-marker-edit';
    div.className = 'inline-edit';
    div.addEventListener('click', e => e.stopPropagation());

    const isEnzyme = !!m.enzyme;
    // Build track options for span selects
    const _usedTracks = [...getUsedTracks()].sort((a, b) => a - b);
    function trackName(t) { return t === 0 ? 'Backbone' : t > 0 ? 'Outer ' + t : 'Inner ' + Math.abs(t); }
    const _trackOpts = _usedTracks.map(t => `<option value="${t}">${trackName(t)}</option>`).join('');
    const _spanFrom = m.spanFrom || 0, _spanTo = m.spanTo || 0;
    const _spanCustom = (m.span || 'all') === 'custom';
    div.innerHTML = `
      <h3>Edit: ${escHtml(m.name)}${isEnzyme ? ' <span class="re-badge">enzyme</span>' : ''}</h3>
      ${isEnzyme ? `<div class="re-cut-diagram">${buildCutDiagramHTML(m.enzyme)}</div>` : ''}
      <label>Name</label>
      <input type="text" id="me-name" value="${escHtml(m.name)}" maxlength="60"${isEnzyme ? ' readonly' : ''}>
      <div class="two-col">
        <div><label>Position (bp)</label><input type="number" id="me-pos" min="1" value="${m.position}"${isEnzyme ? ' readonly' : ''}></div>
        <div><label>Line color</label><input type="color" id="me-color" value="${m.color}"></div>
      </div>
      <div class="two-col">
        <div>
          <label>Line length</label>
          <div class="slider-num-row">
            <input type="range" id="me-line-len" min="4" max="40" value="${m.lineLen}">
            <input type="number" id="me-line-len-num" min="4" max="40" value="${m.lineLen}">
          </div>
        </div>
        <div>
          <label>Line width</label>
          <div class="slider-num-row">
            <input type="range" id="me-line-width" min="0.5" max="4" step="0.5" value="${m.lineWidth}" list="ticks-05-4">
            <input type="number" id="me-line-width-num" min="0.5" max="4" step="0.5" value="${m.lineWidth}">
          </div>
        </div>
      </div>
      <label>Line style</label>
      <select id="me-line-style">
        <option value="solid"${m.lineStyle==='solid'?' selected':''}>Solid</option>
        <option value="dashed"${m.lineStyle==='dashed'?' selected':''}>Dashed</option>
        <option value="dotted"${m.lineStyle==='dotted'?' selected':''}>Dotted</option>
      </select>
      <label>Span</label>
      <select id="me-span">
        <option value="all"${(m.span||'all')==='all'?' selected':''}>All tracks</option>
        <option value="backbone"${m.span==='backbone'?' selected':''}>Backbone only</option>
        <option value="custom"${m.span==='custom'?' selected':''}>Custom range</option>
      </select>
      <div id="me-span-range" class="two-col" style="display:${_spanCustom?'flex':'none'}">
        <div><label>From</label><select id="me-span-from">${_trackOpts}</select></div>
        <div><label>To</label><select id="me-span-to">${_trackOpts}</select></div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border-light);margin:8px 0">
      <div class="check-row"><input type="checkbox" id="me-outer"${m.outerLabel?' checked':''}><label for="me-outer">Outer label</label></div>
      <div id="me-outer-fields" style="display:${m.outerLabel?'block':'none'}">
      <div class="two-col"><div><label>Display</label>
      <select id="me-outer-mode">
        <option value="name"${(m.outerText || m.name) === m.name ? ' selected' : ''}>Name</option>
        <option value="position"${m.outerText === String(m.position) ? ' selected' : ''}>Position</option>
        <option value="custom"${m.outerText && m.outerText !== m.name && m.outerText !== String(m.position) ? ' selected' : ''}>Custom</option>
      </select></div>
      <div><label>Text</label>
      <input type="text" id="me-outer-text" value="${escHtml(m.outerText || m.name)}"${(m.outerText || m.name) === m.name || m.outerText === String(m.position) ? ' readonly' : ''}></div></div>
      <div class="two-col">
        <div><label>Size</label><input type="number" id="me-outer-size" min="6" max="20" value="${m.outerSize}"></div>
        <div><label>Color</label><input type="color" id="me-outer-color" value="${m.outerColor}"></div>
      </div>
      <label>Font</label>
      <select id="me-outer-font">
        ${FONTS.map(fn => `<option value="${fn}"${(m.outerFont||'sans-serif')===fn?' selected':''}>${fn}</option>`).join('')}
      </select>
      <label>Orientation</label>
      <select id="me-outer-orient">
        <option value="curved"${(m.outerOrientation||'curved')==='curved' || m.outerOrientation==='rotated'?' selected':''}>Follow arc</option>
        <option value="horizontal"${m.outerOrientation==='horizontal'?' selected':''}>Horizontal</option>
      </select>
      </div>
      <hr style="border:none;border-top:1px solid var(--border-light);margin:8px 0">
      <div class="check-row"><input type="checkbox" id="me-inner"${m.innerLabel?' checked':''}><label for="me-inner">Inner label</label></div>
      <div id="me-inner-fields" style="display:${m.innerLabel?'block':'none'}">
      <div class="two-col"><div><label>Display</label>
      <select id="me-inner-mode">
        <option value="position"${(m.innerText || String(m.position)) === String(m.position) ? ' selected' : ''}>Position</option>
        <option value="name"${m.innerText === m.name ? ' selected' : ''}>Name</option>
        <option value="custom"${m.innerText && m.innerText !== m.name && m.innerText !== String(m.position) ? ' selected' : ''}>Custom</option>
      </select></div>
      <div><label>Text</label>
      <input type="text" id="me-inner-text" value="${escHtml(m.innerText || String(m.position))}"${(m.innerText || String(m.position)) === String(m.position) || m.innerText === m.name ? ' readonly' : ''}></div></div>
      <div class="two-col">
        <div><label>Size</label><input type="number" id="me-inner-size" min="6" max="20" value="${m.innerSize}"></div>
        <div><label>Color</label><input type="color" id="me-inner-color" value="${m.innerColor}"></div>
      </div>
      <label>Font</label>
      <select id="me-inner-font">
        ${FONTS.map(fn => `<option value="${fn}"${(m.innerFont||'sans-serif')===fn?' selected':''}>${fn}</option>`).join('')}
      </select>
      <label>Orientation</label>
      <select id="me-inner-orient">
        <option value="curved"${(m.innerOrientation||'curved')==='curved' || m.outerOrientation==='rotated'?' selected':''}>Follow arc</option>
        <option value="horizontal"${m.innerOrientation==='horizontal'?' selected':''}>Horizontal</option>
      </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn-primary btn-sm" id="me-done-btn" style="flex:1">Done</button>
        <button class="btn-secondary btn-sm" id="me-cancel-btn" style="flex:1">Cancel</button>
        <button class="btn-danger btn-sm" id="me-delete-btn">Delete</button>
      </div>
    `;

    // Sync slider+number pairs
    [['me-line-len','me-line-len-num'],['me-line-width','me-line-width-num']].forEach(([s,n]) => {
      div.querySelector('#'+s).addEventListener('input', () => { div.querySelector('#'+n).value = div.querySelector('#'+s).value; applyMarkerEdits(); });
      div.querySelector('#'+n).addEventListener('input', () => { div.querySelector('#'+s).value = div.querySelector('#'+n).value; applyMarkerEdits(); });
    });

    // Font pickers for marker labels
    fontPicker(div.querySelector('#me-outer-font'));
    fontPicker(div.querySelector('#me-inner-font'));

    // Span controls: set from/to values and toggle visibility
    const _spanFromSel = div.querySelector('#me-span-from');
    const _spanToSel = div.querySelector('#me-span-to');
    if (_spanFromSel) _spanFromSel.value = String(_spanFrom);
    if (_spanToSel) _spanToSel.value = String(_spanTo);
    const _spanSel = div.querySelector('#me-span');
    const _spanRange = div.querySelector('#me-span-range');
    if (_spanSel) _spanSel.addEventListener('change', () => {
      _spanRange.style.display = _spanSel.value === 'custom' ? 'flex' : 'none';
    });

    // Toggle outer/inner label field visibility
    const _outerCheck = div.querySelector('#me-outer');
    const _outerFields = div.querySelector('#me-outer-fields');
    _outerCheck.addEventListener('change', () => {
      _outerFields.style.display = _outerCheck.checked ? 'block' : 'none';
    });
    const _innerCheck = div.querySelector('#me-inner');
    const _innerFields = div.querySelector('#me-inner-fields');
    _innerCheck.addEventListener('change', () => {
      _innerFields.style.display = _innerCheck.checked ? 'block' : 'none';
    });

    // Label display mode dropdowns
    const _outerMode = div.querySelector('#me-outer-mode');
    const _outerText = div.querySelector('#me-outer-text');
    const _innerMode = div.querySelector('#me-inner-mode');
    const _innerText = div.querySelector('#me-inner-text');
    function syncLabelMode(modeEl, textEl, marker) {
      const mode = modeEl.value;
      if (mode === 'name') { textEl.value = marker.name; textEl.readOnly = true; }
      else if (mode === 'position') { textEl.value = String(marker.position); textEl.readOnly = true; }
      else { textEl.readOnly = false; textEl.focus(); }
      applyMarkerEdits();
    }
    _outerMode.addEventListener('change', () => syncLabelMode(_outerMode, _outerText, m));
    _innerMode.addEventListener('change', () => syncLabelMode(_innerMode, _innerText, m));

    // Live update all inputs
    div.querySelectorAll('input, select').forEach(el => {
      const evt = (el.type === 'checkbox' || el.type === 'color' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evt, applyMarkerEdits);
    });

    div.querySelector('#me-done-btn').addEventListener('click', e => { e.stopPropagation(); markerEditSnapshot = null; deselectMarker(); });
    div.querySelector('#me-cancel-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (selectedMarkerIdx >= 0 && markerEditSnapshot) Object.assign(markers[selectedMarkerIdx], markerEditSnapshot);
      deselectMarker();
    });
    div.querySelector('#me-delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      showConfirm(`Delete <strong>${escHtml(m.name)}</strong>?`, () => {
        pushUndo(); markers.splice(selectedMarkerIdx, 1); markerEditSnapshot = null; deselectMarker();
      });
    });

    return div;
  }

  function renderMarkerList() {
    // Clamp keyboard focus
    if (kbFocusList === 'markers' && kbFocusIdx >= markers.length) {
      kbFocusIdx = markers.length - 1;
    }
    const _mActions = $('marker-list-actions');
    if (_mActions) {
      _mActions.style.display = markers.length > 0 ? '' : 'none';
      const _reBtn = $('bulk-re-btn');
      if (_reBtn) _reBtn.style.display = markers.some(m => m.enzyme) ? '' : 'none';
    }
    const ul = $markerList;
    cleanupFontPickers(ul);
    ul.innerHTML = '';
    if (markers.length === 0) {
      ul.innerHTML = '<li class="empty-state"><div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><circle cx="12" cy="12" r="3"/></svg></div><div class="empty-text">No markers yet</div><div class="empty-hint">Add restriction sites or points of interest</div></li>';
      return;
    }
    const frag = document.createDocumentFragment();
    markers.forEach((m, i) => {
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.midx = i;
      if (i === selectedMarkerIdx) li.classList.add('selected');
      if (kbFocusList === 'markers' && i === kbFocusIdx) li.classList.add('kb-focused');
      const mHidden = m.visible === false;
      if (mHidden) li.classList.add('item-hidden');
      li.innerHTML = `<span class="drag-handle" title="Drag to reorder">\u2261</span>
        <div class="swatch" style="background:${m.color}"></div>
        <span class="fname">${escHtml(m.name)}</span>${m.enzyme ? '<span class="re-badge">RE</span>' : ''}
        <span class="frange">${m.position}</span>
        <span class="item-actions">
          <button class="btn-vis" title="${mHidden ? 'Show' : 'Hide'}" aria-label="${mHidden ? 'Show' : 'Hide'}" data-idx="${i}">${mHidden ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
          ${m.enzyme ? '' : '<button class="btn-dup" title="Duplicate" aria-label="Duplicate" data-idx="' + i + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/><line x1="15.5" y1="13.5" x2="15.5" y2="18.5"/><line x1="13" y1="16" x2="18" y2="16"/></svg></button>'}
          <button class="btn-danger" title="Delete" aria-label="Delete" data-idx="${i}">\u2715</button>
        </span>`;
      frag.appendChild(li);
      if (i === selectedMarkerIdx) frag.appendChild(buildMarkerEditPanel(m));
    });
    ul.appendChild(frag);
  }

  // Delegated event handlers for marker list (bound once)
  (function() {
    const ul = $markerList;

    function idxFromEvent(e) {
      const li = e.target.closest('li[data-midx]');
      return li ? parseInt(li.dataset.midx) : -1;
    }

    ul.addEventListener('click', e => {
      const i = idxFromEvent(e);
      if (i < 0 || i >= markers.length) return;
      e.stopPropagation();
      const m = markers[i];
      if (e.target.closest('.btn-danger')) {
        const di = i;
        showConfirm(`Delete <strong>${escHtml(m.name)}</strong>?`, () => {
          pushUndo();
          markers.splice(di, 1);
          if (selectedMarkerIdx === di) deselectMarker();
          else { if (selectedMarkerIdx > di) selectedMarkerIdx--; renderMarkerList(); render(); }
        });
      } else if (e.target.closest('.btn-vis')) {
        pushUndo();
        m.visible = m.visible === false ? true : false;
        renderMarkerList(); render();
      } else if (e.target.closest('.btn-dup')) {
        pushUndo();
        const clone = JSON.parse(JSON.stringify(m));
        clone.name = m.name + ' copy';
        if (clone.outerText === m.name) clone.outerText = clone.name;
        if (clone.innerText === m.name) clone.innerText = clone.name;
        markers.splice(i + 1, 0, clone);
        selectMarker(i + 1);
      } else if (!e.target.closest('.drag-handle') && !e.target.closest('.inline-edit')) {
        if (selectedMarkerIdx === i) deselectMarker(); else selectMarker(i);
      }
    });

    let markerDragFrom = -1;
    ul.addEventListener('dragstart', e => {
      const i = idxFromEvent(e);
      if (i < 0) return;
      markerDragFrom = i;
      e.target.closest('li').classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    ul.addEventListener('dragend', e => {
      const li = e.target.closest('li');
      if (li) li.classList.remove('dragging');
      markerDragFrom = -1;
      ul.querySelectorAll('.drag-insert-before,.drag-insert-after').forEach(el => {
        el.classList.remove('drag-insert-before', 'drag-insert-after');
      });
    });
    ul.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const li = e.target.closest('li[data-midx]');
      if (!li) return;
      const thisIdx = parseInt(li.dataset.midx);
      if (thisIdx === markerDragFrom) return;
      const rect = li.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      li.classList.toggle('drag-insert-before', e.clientY < midY);
      li.classList.toggle('drag-insert-after', e.clientY >= midY);
    });
    ul.addEventListener('dragleave', e => {
      const li = e.target.closest('li[data-midx]');
      if (li) li.classList.remove('drag-insert-before', 'drag-insert-after');
    });
    ul.addEventListener('drop', e => {
      e.preventDefault();
      const li = e.target.closest('li[data-midx]');
      if (!li) return;
      const before = li.classList.contains('drag-insert-before');
      li.classList.remove('drag-insert-before', 'drag-insert-after');
      let toIdx = parseInt(li.dataset.midx);
      if (!before && toIdx < markerDragFrom) toIdx++;
      else if (before && toIdx > markerDragFrom) toIdx--;
      if (markerDragFrom >= 0 && markerDragFrom !== toIdx) {
        moveMarker(markerDragFrom, toIdx);
      }
      markerDragFrom = -1;
    });
  })();

  // Bulk marker style buttons
  $('bulk-marker-btn').addEventListener('click', () => openBulkMarkerDialog(false));
  $('bulk-re-btn').addEventListener('click', () => openBulkMarkerDialog(true));

  // --- Export popover ---
  const exportFab = $('export-fab');
  const exportPopover = $('export-popover');

  exportFab.addEventListener('click', () => {
    const wasOpen = exportPopover.classList.contains('open');
    closeAllPopovers();
    if (!wasOpen) exportPopover.classList.add('open');
  });
  $('export-close').addEventListener('click', () => {
    closePopover(exportPopover);
  });
  registerDismiss(exportPopover, () => closePopover(exportPopover), ['#export-fab']);

  // --- Export ---
  function getSvgSource(tight) {
    const isLinear = viewMode === 'linear';
    const svg = $(isLinear ? 'linear-svg' : 'plasmid-svg');
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.style.removeProperty('display');
    if (!isLinear) {
      if (tight) {
        // Compute bounding box, then build a square centered on the
        // plasmid center (cx, cy) so the ring is always centered.
        const origVB = svg.getAttribute('viewBox');
        svg.setAttribute('viewBox', `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
        const bbox = svg.getBBox();
        svg.setAttribute('viewBox', origVB || `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
        const pad = 15;
        // Max extent from center in each direction
        const extLeft   = cx - bbox.x + pad;
        const extRight  = (bbox.x + bbox.width) - cx + pad;
        const extTop    = cy - bbox.y + pad;
        const extBottom = (bbox.y + bbox.height) - cy + pad;
        // Use the largest extent so all sides get equal space
        const half = Math.max(extLeft, extRight, extTop, extBottom);
        const side = half * 2;
        clone.setAttribute('viewBox', `${cx - half} ${cy - half} ${side} ${side}`);
        clone.setAttribute('width', String(side));
        clone.setAttribute('height', String(side));
      } else {
        clone.setAttribute('viewBox', `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
      }
    }
    // Remove invisible hit-area elements (used only for click detection)
    clone.querySelectorAll('.backbone-hit, .tick-hit, .center-hit, .ring-hit, .backbone-hover-ring, .tick-hover-ring, .ring-hover-ring, .selection-ring').forEach(el => el.remove());
    // Strip interactive attributes from feature arcs and markers
    clone.querySelectorAll('.feature-arc').forEach(el => {
      el.removeAttribute('class');
      el.removeAttribute('data-idx');
      el.style.cursor = '';
    });
    clone.querySelectorAll('.marker-group').forEach(el => {
      el.removeAttribute('data-marker-idx');
      el.style.cursor = '';
    });
    clone.querySelectorAll('.center-name-text').forEach(el => {
      el.removeAttribute('class');
      el.removeAttribute('style');
    });
    clone.querySelectorAll('.center-len-text').forEach(el => {
      el.style.cursor = '';
      el.style.pointerEvents = '';
    });
    // Resolve CSS variables so exports work outside the browser context
    _resolveCssVars(clone);
    return clone;
  }

  function _resolveCssVars(svgClone) {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    // Serialize, replace all var(--name, fallback) with resolved values
    const attrs = ['fill', 'stroke', 'color', 'stop-color', 'flood-color'];
    svgClone.querySelectorAll('*').forEach(el => {
      attrs.forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && val.includes('var(')) {
          const resolved = val.replace(/var\(\s*--([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g, (_, name, fallback) => {
            const v = style.getPropertyValue('--' + name).trim();
            return v || (fallback ? fallback.trim() : '');
          });
          el.setAttribute(attr, resolved);
        }
      });
      // Also check inline style
      if (el.style && el.style.cssText && el.style.cssText.includes('var(')) {
        el.style.cssText = el.style.cssText.replace(/var\(\s*--([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g, (_, name, fallback) => {
          const v = style.getPropertyValue('--' + name).trim();
          return v || (fallback ? fallback.trim() : '');
        });
      }
    });
    // Handle font attributes that reference CSS vars
    svgClone.querySelectorAll('text, tspan').forEach(el => {
      ['font-size', 'font-family', 'font-weight'].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && val.includes('var(')) {
          const resolved = val.replace(/var\(\s*--([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g, (_, name, fallback) => {
            const v = style.getPropertyValue('--' + name).trim();
            return v || (fallback ? fallback.trim() : '');
          });
          el.setAttribute(attr, resolved);
        }
      });
    });
  }

  // --- Toast notifications ---
  const toastContainer = $('toast-container');
  function showToast(message, type) {
    type = type || 'info';
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || icons.info;
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    el.appendChild(iconSpan);
    el.appendChild(msgSpan);
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => el.remove());
    }, 2500);
  }

  // Styled replacement for native confirm() and alert().
  // onConfirm=null → alert mode (OK button only).
  // opts.okLabel, opts.cancelLabel, opts.okClass override defaults.
  const _confirmOverlay = $('confirm-overlay');
  const _confirmMsg = $('confirm-msg');
  const _confirmActions = $('confirm-actions');
  const _confirmOk = $('confirm-ok');
  const _confirmCancel = $('confirm-cancel');
  let _confirmCb = null;

  function showConfirm(message, onConfirm, opts) {
    opts = opts || {};
    _confirmMsg.innerHTML = message;
    _confirmCb = onConfirm;
    if (onConfirm) {
      _confirmCancel.style.display = '';
      _confirmCancel.textContent = opts.cancelLabel || 'Cancel';
      _confirmOk.textContent = opts.okLabel || 'Delete';
      _confirmOk.className = opts.okClass || 'danger';
    } else {
      // Alert mode - single OK button
      _confirmCancel.style.display = 'none';
      _confirmOk.textContent = opts.okLabel || 'OK';
      _confirmOk.className = opts.okClass || 'primary';
    }
    _confirmOverlay.classList.add('open');
    _confirmOk.focus();
  }

  function _dismissConfirm() {
    _confirmOverlay.classList.remove('open');
    _confirmCb = null;
  }

  _confirmOk.addEventListener('click', () => {
    const cb = _confirmCb;
    _dismissConfirm();
    if (cb) cb();
  });
  _confirmCancel.addEventListener('click', _dismissConfirm);
  _confirmOverlay.addEventListener('click', e => { if (e.target === _confirmOverlay) _dismissConfirm(); });
  _confirmOverlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') _dismissConfirm();
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getPlasmidFilename() {
    let name = ($plasmidName.value || '').trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')   // filesystem-illegal chars
      .replace(/\.+$/g, '')                        // trailing dots (Windows)
      .replace(/_+/g, '_')                         // collapse runs of underscores
      .replace(/^_|_$/g, '');                      // trim leading/trailing underscores
    return name || 'plasmid';
  }

  function flashExport() {
    const mc = $mapContainer;
    mc.classList.remove('export-flash');
    void mc.offsetWidth; // force reflow to restart animation
    mc.classList.add('export-flash');
    mc.addEventListener('animationend', () => mc.classList.remove('export-flash'), { once: true });
  }

  // SVG export (no background)
  $('export-svg-btn').addEventListener('click', () => {
    const clone = getSvgSource(true);
    const serializer = new XMLSerializer();
    const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, getPlasmidFilename() + '.svg');
    flashExport();
    showToast('SVG exported', 'success');
  });

  // PNG export
  $('export-png-btn').addEventListener('click', () => {
    const scale = parseInt($('png-scale').value) || 2;
    const withBg = $('png-bg').checked;
    const clone = getSvgSource(true);

    // Read the tight dimensions from the clone
    const vb = clone.getAttribute('viewBox').split(' ').map(Number);
    const exportSize = vb[2]; // square side length

    // If background requested, insert a white rect covering the viewBox
    if (withBg) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(vb[0]));
      rect.setAttribute('y', String(vb[1]));
      rect.setAttribute('width', String(vb[2]));
      rect.setAttribute('height', String(vb[3]));
      rect.setAttribute('fill', '#ffffff');
      clone.insertBefore(rect, clone.firstChild);
    }

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = exportSize * scale;
      canvas.height = exportSize * scale;
      const ctx = canvas.getContext('2d');
      if (withBg) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        downloadBlob(blob, getPlasmidFilename() + '.png');
        flashExport();
        showToast('PNG exported', 'success');
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); showToast('PNG export failed', 'error'); };
    img.src = url;
  });

  // PDF export
  // Lazy-load jsPDF on first PDF export
  let _jsPdfLoaded = !!window.jspdf;
  function loadJsPdf() {
    if (_jsPdfLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.integrity = 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk';
      s.crossOrigin = 'anonymous';
      s.onload = () => { _jsPdfLoaded = true; resolve(); };
      s.onerror = () => reject(new Error('Failed to load jsPDF'));
      document.head.appendChild(s);
    });
  }

  $('export-pdf-btn').addEventListener('click', async () => {
    try {
      await loadJsPdf();
    } catch (e) {
      showToast('Failed to load PDF library', 'error');
      return;
    }
    const pageSize = $('pdf-page-size').value;
    const includeTitle = $('pdf-title').checked;
    const includeMeta = $('pdf-meta').checked;
    const name = $plasmidName.value || 'Untitled Plasmid';
    const total = getLength();

    const clone = getSvgSource(true);
    const pdfVb = clone.getAttribute('viewBox').split(' ').map(Number);
    const pdfExportSize = pdfVb[2];
    // Add white background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(pdfVb[0]));
    bgRect.setAttribute('y', String(pdfVb[1]));
    bgRect.setAttribute('width', String(pdfVb[2]));
    bgRect.setAttribute('height', String(pdfVb[3]));
    bgRect.setAttribute('fill', '#ffffff');
    clone.insertBefore(bgRect, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Render SVG to canvas at high resolution
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = pdfExportSize * scale;
      canvas.height = pdfExportSize * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      // Page dimensions in mm
      let pageW, pageH, orientation;
      if (pageSize === 'letter') {
        pageW = 215.9; pageH = 279.4; orientation = 'portrait';
      } else if (pageSize === 'a4') {
        pageW = 210; pageH = 297; orientation = 'portrait';
      } else {
        // Square - fit to map with small margin
        pageW = 200; pageH = 200; orientation = 'landscape';
      }

      const jsPDF = window.jspdf.jsPDF;
      const pdf = new jsPDF({
        orientation: pageSize === 'square' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: pageSize === 'square' ? [pageW, pageH] : pageSize
      });

      const margin = 15;
      const usableW = pageW - margin * 2;
      let cursorY = margin;

      // Title
      if (includeTitle) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(30, 41, 59);
        pdf.text(name, pageW / 2, cursorY + 6, { align: 'center' });
        cursorY += 10;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text(total.toLocaleString() + ' bp', pageW / 2, cursorY + 4, { align: 'center' });
        cursorY += 10;
      }

      // Map image - fit to available width, keep square aspect
      const availH = includeMeta ? (pageH - cursorY - margin - 60) : (pageH - cursorY - margin);
      const mapSize = Math.min(usableW, availH);
      const mapX = (pageW - mapSize) / 2;
      pdf.addImage(imgData, 'JPEG', mapX, cursorY, mapSize, mapSize);
      cursorY += mapSize + 8;

      // Feature table
      if (includeMeta && features.length > 0) {
        const visibleFeatures = features.filter(f => f.visible !== false);
        if (visibleFeatures.length > 0) {
          // Check if we need a new page
          if (cursorY + 20 > pageH - margin) {
            pdf.addPage();
            cursorY = margin;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(99, 102, 241);
          pdf.text('FEATURES', margin, cursorY + 4);
          cursorY += 7;

          // Table header
          pdf.setFillColor(241, 245, 249);
          pdf.rect(margin, cursorY, usableW, 6, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(71, 85, 105);
          const cols = [margin + 2, margin + 52, margin + 82, margin + 112, margin + 142];
          pdf.text('Name', cols[0], cursorY + 4);
          pdf.text('Range', cols[1], cursorY + 4);
          pdf.text('Length', cols[2], cursorY + 4);
          pdf.text('Direction', cols[3], cursorY + 4);
          pdf.text('Type', cols[4], cursorY + 4);
          cursorY += 7;

          // Table rows
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(51, 65, 85);
          visibleFeatures.forEach((f, i) => {
            if (cursorY + 5 > pageH - margin) {
              pdf.addPage();
              cursorY = margin;
            }
            // Alternating row background
            if (i % 2 === 0) {
              pdf.setFillColor(248, 250, 252);
              pdf.rect(margin, cursorY, usableW, 5, 'F');
            }
            // Color swatch
            const hex = f.color || '#6366f1';
            const r = parseInt(hex.slice(1,3), 16);
            const g = parseInt(hex.slice(3,5), 16);
            const b = parseInt(hex.slice(5,7), 16);
            pdf.setFillColor(r, g, b);
            pdf.circle(cols[0] + 1, cursorY + 2.5, 1.5, 'F');

            pdf.text(f.name || '–', cols[0] + 5, cursorY + 3.5);
            pdf.text(f.start + '–' + f.end, cols[1], cursorY + 3.5);
            const len = f.end >= f.start ? f.end - f.start + 1 : total - f.start + 1 + f.end;
            pdf.text(len + ' bp', cols[2], cursorY + 3.5);
            pdf.text(f.direction === -1 ? 'Reverse' : 'Forward', cols[3], cursorY + 3.5);
            pdf.text(f.type || 'gene', cols[4], cursorY + 3.5);
            cursorY += 5;
          });
        }
      }

      // Footer
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Generated by PlasmidStudio - plasmidstudio.app', pageW / 2, pageH - 8, { align: 'center' });

      pdf.save(getPlasmidFilename() + '.pdf');
      flashExport();
      showToast('PDF exported', 'success');
    };
    img.onerror = () => { URL.revokeObjectURL(url); showToast('PDF export failed', 'error'); };
    img.src = url;
  });

  // GenBank export
  function generateGenBank() {
    const fullName = ($plasmidName.value || 'Untitled').replace(/\s+/g, '_');
    const name = fullName.substring(0, 16);
    if (fullName.length > 16) {
      showToast('Plasmid name truncated to 16 chars for GenBank format', 'info');
    }
    const total = getLength();
    const seq = getSequence().toUpperCase();
    const date = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const dateStr = date.getDate().toString().padStart(2,'0') + '-' + months[date.getMonth()] + '-' + date.getFullYear();

    let gb = '';

    // LOCUS line: name, length, type, topology, date
    const namePad = name.padEnd(16);
    const lenStr = total.toString().padStart(11);
    gb += `LOCUS       ${namePad}${lenStr} bp    DNA     circular     ${dateStr}\n`;
    gb += `DEFINITION  ${name}.\n`;
    gb += `ACCESSION   .\n`;
    gb += `VERSION     .\n`;
    gb += `SOURCE      .\n`;
    gb += `  ORGANISM  .\n`;
    gb += `COMMENT     Exported from PlasmidStudio.\n`;

    // FEATURES
    if (features.length > 0) {
      gb += `FEATURES             Location/Qualifiers\n`;

      const typeReverseMap = {
        gene: 'CDS', promoter: 'promoter', terminator: 'terminator',
        origin: 'rep_origin', resistance: 'CDS', misc: 'misc_feature'
      };

      for (const f of features) {
        if (f.visible === false) continue;
        const gbType = (typeReverseMap[f.type] || 'misc_feature').padEnd(16);
        let location;
        if (f.end >= f.start) {
          location = `${f.start}..${f.end}`;
        } else {
          location = `join(${f.start}..${total},1..${f.end})`;
        }
        if (f.direction === -1) {
          location = `complement(${location})`;
        }

        gb += `     ${gbType}${location}\n`;
        gb += `                     /label="${f.name}"\n`;
        if (f.type === 'gene' || f.type === 'resistance') {
          gb += `                     /gene="${f.name}"\n`;
        }
        if (f.color) {
          gb += `                     /ApEinfo_fwdcolor="${f.color}"\n`;
          gb += `                     /ApEinfo_revcolor="${f.color}"\n`;
        }
      }
    }

    // ORIGIN
    if (seq) {
      gb += `ORIGIN\n`;
      for (let i = 0; i < seq.length; i += 60) {
        const lineNum = (i + 1).toString().padStart(9);
        let line = lineNum;
        for (let j = 0; j < 60 && i + j < seq.length; j += 10) {
          line += ' ' + seq.substring(i + j, Math.min(i + j + 10, seq.length));
        }
        gb += line + '\n';
      }
    }

    gb += '//\n';
    return gb;
  }

  $('export-gb-btn').addEventListener('click', () => {
    const gb = generateGenBank();
    const blob = new Blob([gb], { type: 'text/plain' });
    downloadBlob(blob, getPlasmidFilename() + '.gb');
    flashExport();
    showToast('GenBank exported', 'success');
  });

  // JSON export
  $('export-json-btn').addEventListener('click', () => {
    const state = JSON.parse(captureState());
    state._format = 'PlasmidStudio';
    state._version = 1;
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, getPlasmidFilename() + '.json');
    flashExport();
    showToast('Project saved', 'success');
  });

  // --- Share link ---
  async function compressState(json) {
    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const buf = await new Response(stream).arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return 'z:' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    // Fallback: raw base64url
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return 'r:' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function decompressState(encoded) {
    const prefix = encoded.slice(0, 2);
    let b64 = encoded.slice(2).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    if (prefix === 'z:') {
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return await new Response(stream).text();
    }
    return decodeURIComponent(escape(atob(b64)));
  }

  // Strip default values and use short keys to minimize share URL length.
  // Restoring expands short keys back and merges defaults.
  const _SK = { // short key map for features
    name:'n', type:'t', start:'s', end:'e', direction:'d', color:'c', track:'k',
    opacity:'o', border:'b', borderColor:'bc', borderStyle:'bs',
    arrow:'a', arrowStyle:'as', tailCut:'tc', tailStyle:'ts',
    startArrow:'sa', startArrowStyle:'ss', endNotch:'en',
    showLabel:'sl', labelPos:'lp', labelOrientation:'lo', labelColor:'lc', labelSize:'ls', labelFont:'lf', labelMaxWidth:'lw', leaderLine:'ld',
    visible:'v',
  };
  const _SKm = { // short key map for markers
    name:'n', position:'p', color:'c', visible:'v',
    lineLen:'ll', lineWidth:'lw', lineStyle:'ly',
    span:'sp', spanFrom:'sf', spanTo:'st',
    outerLabel:'ol', outerText:'ot', outerSize:'os', outerColor:'oc', outerFont:'of', outerOrientation:'oo',
    innerLabel:'il', innerText:'it', innerSize:'is', innerColor:'ic', innerFont:'if', innerOrientation:'io',
    enzyme:'ez',
  };
  const _SKr = Object.fromEntries(Object.entries(_SK).map(([k,v])=>[v,k]));
  const _SKmr = Object.fromEntries(Object.entries(_SKm).map(([k,v])=>[v,k]));

  function compactStateForShare(state) {
    const s = {};
    // Features - strip defaults, use short keys
    s.f = (state.features || []).map(f => {
      const o = {};
      for (const [k, v] of Object.entries(f)) {
        if (k in FEATURE_DEFAULTS && FEATURE_DEFAULTS[k] === v) continue;
        o[_SK[k] || k] = v;
      }
      return o;
    });
    // Markers
    if (state.markers && state.markers.length) {
      s.m = state.markers.map(m => {
        const o = {};
        for (const [k, v] of Object.entries(m)) {
          if (k in MARKER_DEFAULTS && MARKER_DEFAULTS[k] === v) continue;
          o[_SKm[k] || k] = v;
        }
        return o;
      });
    }
    // Config - only include non-default values
    s.pn = state.plasmidName;
    s.sl = state.seqLength;
    s.im = state.inputMode;
    if (state.viewMode === 'linear') s.vm = 'linear';
    if (state.seqInput) s.si = state.seqInput;
    if (state.R !== 225) s.R = state.R;
    if (state.trackW !== 28) s.tW = state.trackW;
    if (state.trackSpacing !== 6) s.tS = state.trackSpacing;
    if (state.mapRotation) s.mr = state.mapRotation;
    if (!state.showCenterName) s.scn = false;
    if (!state.showCenterLength) s.scl = false;
    if (state.lengthFormat !== 'bp') s.lf = state.lengthFormat;
    // Always include configs that have many sub-fields (they compress well)
    s.bb = state.bbCfg;
    s.tk = state.tickCfg;
    s.gc = state.gcTrackCfg;
    if (state.ringStyles && Object.keys(state.ringStyles).length) s.rs = state.ringStyles;
    s.cs = state.centerStyle;
    if (state.linearCfg && (state.linearCfg.bpPerRow || state.linearCfg.bbHeight)) s.lc = state.linearCfg;
    if (state.linearTickCfg) s.lt = state.linearTickCfg;
    return s;
  }

  function expandSharedState(s) {
    const state = {};
    state.features = (s.f || []).map(o => {
      const f = { ...FEATURE_DEFAULTS };
      for (const [k, v] of Object.entries(o)) {
        f[_SKr[k] || k] = v;
      }
      return f;
    });
    state.markers = (s.m || []).map(o => {
      const m = { ...MARKER_DEFAULTS };
      for (const [k, v] of Object.entries(o)) {
        m[_SKmr[k] || k] = v;
      }
      return m;
    });
    state.plasmidName = s.pn || 'Untitled';
    state.seqLength = s.sl || '3000';
    state.inputMode = s.im || 'length';
    state.viewMode = s.vm || 'circular';
    state.seqInput = s.si || '';
    state.R = s.R || 225;
    state.trackW = s.tW || 28;
    state.trackSpacing = s.tS || 6;
    state.mapRotation = s.mr || 0;
    state.showCenterName = s.scn !== false;
    state.showCenterLength = s.scl !== false;
    state.lengthFormat = s.lf || 'bp';
    state.bbCfg = s.bb || {};
    state.tickCfg = s.tk || {};
    state.gcTrackCfg = s.gc || {};
    state.ringStyles = s.rs || {};
    state.centerStyle = s.cs || {};
    state.linearCfg = s.lc || { bpPerRow: 0, bbHeight: 4 };
    state.linearTickCfg = s.lt || {};
    return state;
  }

  $('share-link-btn').addEventListener('click', async () => {
    try {
      const state = JSON.parse(captureState());
      const compact = compactStateForShare(state);
      const encoded = await compressState(JSON.stringify(compact));
      const base = location.href.replace(/#.*$/, '');
      const url = base + '#' + encoded;
      if (url.length > 32000) {
        showToast('Plasmid too large to share via URL - use JSON export instead', 'error');
        return;
      }
      await navigator.clipboard.writeText(url);
      flashExport();
      showToast('Share link copied to clipboard', 'success');
    } catch(e) {
      showToast('Failed to generate share link', 'error');
    }
  });

  // --- File parsers ---

  // SnapGene .dna binary parser
  function parseSnapGene(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    // Validate header: first byte 0x09, then 4-byte length (14), then "SnapGene"
    if (bytes[0] !== 0x09) throw new Error('Not a valid SnapGene file.');
    const headerLen = view.getUint32(1, false);
    if (headerLen !== 14) throw new Error('Not a valid SnapGene file.');
    const title = String.fromCharCode(...bytes.slice(5, 13));
    if (title !== 'SnapGene') throw new Error('Not a valid SnapGene file.');
    // Skip header: 1 + 4 + 14 = 19 bytes
    let offset = 19;
    let sequence = '';
    let isCircular = true;
    let name = '';
    const featureList = [];
    const strandMap = { '0': 0, '1': 1, '2': -1, '3': 0 };
    while (offset < buffer.byteLength) {
      const blockType = bytes[offset];
      offset += 1;
      if (offset + 4 > buffer.byteLength) break;
      const blockSize = view.getUint32(offset, false);
      offset += 4;
      if (offset + blockSize > buffer.byteLength) break;

      if (blockType === 0) {
        // DNA sequence block: first byte = properties, rest = sequence
        const props = bytes[offset];
        isCircular = (props & 0x01) !== 0;
        sequence = String.fromCharCode(...bytes.slice(offset + 1, offset + blockSize));
      } else if (blockType === 5) {
        // Primers - skip
      } else if (blockType === 6) {
        // Notes block (XML) - try to extract name
        try {
          const xml = new TextDecoder().decode(bytes.slice(offset, offset + blockSize));
          const doc = new DOMParser().parseFromString(xml, 'text/xml');
          // Prefer CustomMapLabel (the short plasmid name) over Description
          const labelEl = doc.querySelector('Notes > CustomMapLabel');
          if (labelEl && labelEl.textContent.trim()) {
            name = labelEl.textContent.trim();
          }
          if (!name) {
            const descEl = doc.querySelector('Notes > Description');
            if (descEl && descEl.textContent) {
              // Description may contain HTML markup - parse it to extract plain text
              const descRaw = descEl.textContent.trim();
              const descDoc = new DOMParser().parseFromString(descRaw, 'text/html');
              name = (descDoc.body.textContent || descRaw).trim();
            }
          }
        } catch (_) {}
      } else if (blockType === 10) {
        // Features block (XML)
        try {
          const xml = new TextDecoder().decode(bytes.slice(offset, offset + blockSize));
          const doc = new DOMParser().parseFromString(xml, 'text/xml');
          const featureEls = doc.querySelectorAll('Features > Feature');
          featureEls.forEach(fe => {
            const feName = fe.getAttribute('name') || 'feature';
            const feType = fe.getAttribute('type') || 'misc_feature';
            const dir = strandMap[fe.getAttribute('directionality') || '0'];
            const segments = fe.querySelectorAll('Segment');
            let start = Infinity, end = 0, color = '#64748b';
            segments.forEach(seg => {
              const range = seg.getAttribute('range') || '';
              const segColor = seg.getAttribute('color');
              if (segColor) color = segColor;
              const parts = range.split('-').map(Number);
              if (parts.length === 2) {
                if (parts[0] < start) start = parts[0];
                if (parts[1] > end) end = parts[1];
              }
            });
            if (start === Infinity || end === 0) return;
            const mappedType = FEATURE_TYPE_MAP[feType] || 'misc';
            featureList.push({
              name: feName,
              type: mappedType,
              start: start,
              end: end,
              direction: dir === -1 ? -1 : 1,
              color: color,
              ...FEATURE_DEFAULTS
            });
          });
        } catch (_) {}
      }
      offset += blockSize;
    }
    return { name, sequence, features: featureList, isCircular };
  }

  // GenBank parser: extracts LOCUS name, sequence, and FEATURES
  // Handles multi-record files (uses first record), flexible indentation,
  // multi-line qualifiers, single-position features, and embedded quotes.
  function parseGenBank(text) {
    // Multi-record: split on // and use the first non-empty record
    const records = text.split(/^\/\/\s*$/m).filter(r => r.trim());
    const record = records[0] || text;

    const result = { name: '', sequence: '', features: [] };

    // LOCUS line - first word after LOCUS on the same line is the name
    const locusMatch = record.match(/^LOCUS[ \t]+(\S+)/m);
    if (locusMatch) {
      result.name = locusMatch[1];
    }

    // DEFINITION line (fallback for name)
    if (!result.name) {
      const defMatch = record.match(/^DEFINITION\s+(.+)/m);
      if (defMatch) result.name = defMatch[1].replace(/\.$/, '').trim();
    }

    // ORIGIN section - extract sequence (tolerant of missing // at end)
    const originIdx = record.search(/^ORIGIN\b/m);
    if (originIdx >= 0) {
      let seqBlock = record.slice(originIdx).replace(/^ORIGIN[^\n]*\n/, '');
      seqBlock = seqBlock.replace(/^\/\/[\s\S]*/m, ''); // strip trailing // and beyond
      result.sequence = seqBlock.replace(/[\s\d]/g, '').toUpperCase();
    }

    // FEATURES section - flexible header matching
    // Extract FEATURES block - terminated by ORIGIN, CONTIG, BASE COUNT, or end of record
    const featIdx = record.search(/^FEATURES\s/m);
    if (featIdx >= 0) {
      const afterFeatHeader = record.slice(featIdx);
      const headerEnd = afterFeatHeader.indexOf('\n');
      const featBody = afterFeatHeader.slice(headerEnd + 1);
      const bodyEnd = featBody.search(/^(?:ORIGIN|CONTIG|BASE COUNT)\b/m);
      const featBlock = bodyEnd >= 0 ? featBody.slice(0, bodyEnd) : featBody;
      const featEntries = [];
      const lines = featBlock.split('\n');
      let _currentQualKey = null; // track multi-line qualifier state

      for (const line of lines) {
        if (!line.trim()) continue;

        // Feature key line: 3-7 spaces, then key, then spaces, then location
        const keyMatch = line.match(/^ {3,7}(\S+)\s+(.+)$/);
        if (keyMatch && !line.match(/^ {10,}/)) {
          featEntries.push({ key: keyMatch[1], location: keyMatch[2].trim(), qualifiers: {}, _qualOrder: [] });
          _currentQualKey = null;
          continue;
        }

        if (featEntries.length === 0) continue;
        const lastFeat = featEntries[featEntries.length - 1];

        // Qualifier line: 10+ spaces, then /qualifier or /qualifier="value" or /qualifier=number
        const qualMatch = line.match(/^\s{10,}\/(\w[\w-]*)(?:=(.*))?$/);
        if (qualMatch) {
          const qKey = qualMatch[1];
          let qVal = qualMatch[2] || '';
          // Strip leading quote
          if (qVal.startsWith('"')) qVal = qVal.slice(1);
          // Check for closing quote (but not escaped "")
          // A value is closed if it ends with " but not ""
          if (qVal.endsWith('"') && !qVal.endsWith('""')) {
            qVal = qVal.slice(0, -1);
            _currentQualKey = null;
          } else {
            _currentQualKey = qKey; // value continues on next line
          }
          // Handle embedded "" as literal quote
          qVal = qVal.replace(/""/g, '"');

          // Handle duplicate qualifier keys (e.g., multiple /note)
          if (lastFeat.qualifiers[qKey] != null) {
            lastFeat.qualifiers[qKey] += ' ' + qVal;
          } else {
            lastFeat.qualifiers[qKey] = qVal;
            lastFeat._qualOrder.push(qKey);
          }
          continue;
        }

        // Continuation line (10+ spaces, no /)
        const contMatch = line.match(/^\s{10,}(\S.*)$/);
        if (contMatch) {
          let contVal = contMatch[1];
          if (_currentQualKey) {
            // Continuing a multi-line qualifier value
            const qk = _currentQualKey;
            if (contVal.endsWith('"')) { contVal = contVal.slice(0, -1); _currentQualKey = null; }
            // Handle embedded "" as literal quote
            contVal = contVal.replace(/""/g, '"');
            lastFeat.qualifiers[qk] += ' ' + contVal;
          } else if (!lastFeat._qualOrder.length) {
            // Continuation of location (before any qualifiers)
            lastFeat.location += contVal.trim();
          }
          continue;
        }
      }

      // Convert to plasmid features
      for (const fe of featEntries) {
        if (fe.key === 'source') continue;

        // Parse location: complement(123..456), join(2315..2686,1..217), <1..206, 123
        const isComplement = fe.location.includes('complement');
        const isJoin = fe.location.includes('join');
        const locClean = fe.location.replace(/complement\(|\)|join\(|order\(|<|>/g, '');

        // Match ranges (123..456) and single positions (123)
        const allRanges = [...locClean.matchAll(/(\d+)(?:\.\.(\d+))?/g)];
        if (allRanges.length === 0) continue;

        let start, end;
        if (isJoin && allRanges.length > 1) {
          // Origin-wrapping: join(2315..2686,1..217) → start=2315, end=217
          start = parseInt(allRanges[0][1]);
          const lastRange = allRanges[allRanges.length - 1];
          end = parseInt(lastRange[2] || lastRange[1]);
        } else {
          start = parseInt(allRanges[0][1]);
          end = parseInt(allRanges[0][2] || allRanges[0][1]); // single position: start == end
        }

        const name = fe.qualifiers.label || fe.qualifiers.gene || fe.qualifiers.product || fe.qualifiers.note || fe.key;
        // Truncate long names (some GenBank files have very long /note values)
        const cleanName = name.length > 60 ? name.substring(0, 57) + '...' : name;
        const type = FEATURE_TYPE_MAP[fe.key] || 'misc';
        // Use embedded color if present, otherwise fall back to type default
        let color = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.misc;
        const noteColor = (fe.qualifiers.note || '').match(/color:\s*(#[0-9a-fA-F]{6})/);
        const labelColor = (fe.qualifiers.label || '').match(/color:\s*(#[0-9a-fA-F]{6})/);
        if (fe.qualifiers.ApEinfo_fwdcolor) color = fe.qualifiers.ApEinfo_fwdcolor;
        else if (fe.qualifiers.ApEinfo_revcolor && isComplement) color = fe.qualifiers.ApEinfo_revcolor;
        else if (noteColor) color = noteColor[1];
        else if (labelColor) color = labelColor[1];

        result.features.push({
          name: cleanName,
          type: type,
          start: start,
          end: end,
          direction: isComplement ? -1 : 1,
          color: color,
          ...FEATURE_DEFAULTS,
        });
      }
    }

    return result;
  }

  // FASTA parser: extracts name from header and sequence
  function parseFasta(text) {
    const lines = text.trim().split('\n');
    let name = 'Imported';
    let seq = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        // Header line - take first word or full description
        name = trimmed.substring(1).trim().split(/\s+/)[0] || 'Imported';
      } else if (trimmed && !trimmed.startsWith(';')) {
        seq += trimmed.replace(/[\s\d]/g, '').toUpperCase();
      }
    }

    return { name, sequence: seq };
  }

  // JSON import (toolbar button)
  const importFileInput = $('import-json-file');
  // Validate and clamp feature/marker coordinates against sequence length.
  // start > end is valid (origin-wrapping feature on a circular plasmid).
  function validateImportedState(s) {
    const total = parseInt(s.seqLength) || 1;
    let warnings = 0;
    // Clamp plasmid name
    if (s.plasmidName && s.plasmidName.length > 80) s.plasmidName = s.plasmidName.substring(0, 80);
    if (Array.isArray(s.features)) {
      s.features = s.features.filter(f => {
        if (!f.name || typeof f.start !== 'number' || typeof f.end !== 'number') return false;
        if (f.name.length > 60) f.name = f.name.substring(0, 60);
        if (f.start < 0 || f.end < 0) { warnings++; return false; }
        let clamped = false;
        if (f.start > total) { f.start = total; clamped = true; }
        if (f.end > total) { f.end = total; clamped = true; }
        if (clamped) warnings++;
        return true;
      });
    }
    if (Array.isArray(s.markers)) {
      s.markers = s.markers.filter(m => {
        if (!m.name || typeof m.position !== 'number') return false;
        if (m.name.length > 60) m.name = m.name.substring(0, 60);
        if (m.position < 0) { warnings++; return false; }
        if (m.position > total) { m.position = total; warnings++; }
        return true;
      });
    }
    return warnings;
  }

  function buildStateFromImport(text, ext, arrayBuffer) {
    let s;
    if (ext === 'dna') {
      if (!arrayBuffer) throw new Error('SnapGene .dna files must be read as binary.');
      const sg = parseSnapGene(arrayBuffer);
      if (!sg.sequence && sg.features.length === 0) throw new Error('Could not parse SnapGene file.');
      s = getBlankState(sg.name || 'Imported');
      if (sg.sequence) {
        s.seqInput = sg.sequence;
        s.seqLength = String(sg.sequence.length);
        s.inputMode = 'sequence';
      }
      if (sg.features.length > 0) s.features = sg.features;
      s.markers = [];
    } else if (ext === 'json') {
      s = JSON.parse(text);
      if (!s.features || !Array.isArray(s.features)) throw new Error('Invalid project file: missing features array.');
    } else if (ext === 'gb' || ext === 'gbk' || ext === 'genbank' || text.match(/^LOCUS\s+/m)) {
      const gb = parseGenBank(text);
      if (!gb.sequence && gb.features.length === 0) throw new Error('Could not parse GenBank file.');
      s = getBlankState(gb.name || 'Imported');
      if (gb.sequence) {
        s.seqInput = gb.sequence;
        s.seqLength = String(gb.sequence.length);
        s.inputMode = 'sequence';
      }
      if (gb.features.length > 0) s.features = gb.features;
      s.markers = [];
    } else if (ext === 'fasta' || ext === 'fa' || ext === 'fna' || ext === 'fsa' || text.startsWith('>')) {
      const fa = parseFasta(text);
      if (!fa.sequence) throw new Error('Could not parse FASTA file.');
      s = getBlankState(fa.name || 'Imported');
      s.seqInput = fa.sequence;
      s.seqLength = String(fa.sequence.length);
      s.inputMode = 'sequence';
    } else {
      throw new Error('Unsupported file format. Use .json, .gb/.gbk, .fasta/.fa, or .dna files.');
    }
    const warnings = validateImportedState(s);
    if (warnings > 0) {
      showToast(warnings + ' feature(s) had out-of-range coordinates and were clamped', 'info');
    }
    return JSON.stringify(s);
  }

  function handleImportFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (ext === 'dna') {
          const state = buildStateFromImport(null, ext, reader.result);
          addProject(state);
        } else {
          const state = buildStateFromImport(reader.result, ext);
          addProject(state);
        }
      } catch (e) {
        showToast('Import failed: ' + e.message, 'error');
      }
    };
    if (ext === 'dna') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  importFileInput.addEventListener('change', () => {
    handleImportFile(importFileInput.files[0]);
    importFileInput.value = '';
  });

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', e => {
    // Undo/redo work globally, even in inputs
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey)) ) {
      e.preventDefault();
      redo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    // Ctrl+S / Ctrl+E - open export popover
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'e')) {
      e.preventDefault();
      const wasOpen = exportPopover.classList.contains('open');
      closeAllPopovers();
      if (!wasOpen) exportPopover.classList.add('open');
      return;
    }

    

    // Ctrl+D - duplicate selected feature or marker
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (selectedIdx >= 0 && selectedIdx < features.length) {
        pushUndo();
        const clone = JSON.parse(JSON.stringify(features[selectedIdx]));
        clone.name = clone.name + ' copy';
        features.splice(selectedIdx + 1, 0, clone);
        selectFeature(selectedIdx + 1);
      } else if (selectedMarkerIdx >= 0 && selectedMarkerIdx < markers.length) {
        pushUndo();
        const m = markers[selectedMarkerIdx];
        const clone = JSON.parse(JSON.stringify(m));
        clone.name = m.name + ' copy';
        if (clone.outerText === m.name) clone.outerText = clone.name;
        if (clone.innerText === m.name) clone.innerText = clone.name;
        markers.splice(selectedMarkerIdx + 1, 0, clone);
        selectMarker(selectedMarkerIdx + 1);
      }
      return;
    }

    // Don't intercept other keys when typing in an input/textarea/select
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // --- Sidebar list keyboard navigation ---
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const list = kbFocusList === 'markers' ? markers : features;
      if (list.length === 0) return;
      e.preventDefault();
      if (kbFocusIdx < 0) {
        // Start focus from current selection or beginning
        if (kbFocusList === 'features' && selectedIdx >= 0) kbFocusIdx = selectedIdx;
        else if (kbFocusList === 'markers' && selectedMarkerIdx >= 0) kbFocusIdx = selectedMarkerIdx;
        else kbFocusIdx = e.key === 'ArrowDown' ? 0 : list.length - 1;
      } else {
        kbFocusIdx += e.key === 'ArrowDown' ? 1 : -1;
        // Wrap around
        if (kbFocusIdx >= list.length) kbFocusIdx = 0;
        if (kbFocusIdx < 0) kbFocusIdx = list.length - 1;
      }
      // Ensure the correct tab is visible
      const tabId = kbFocusList === 'markers' ? 'markers-tab' : 'features-tab';
      if (!$(tabId).classList.contains('active')) {
        switchTab(tabId);
      }
      if (kbFocusList === 'features') renderFeatureList(); else renderMarkerList();
      // Scroll focused item into view
      const listId = kbFocusList === 'markers' ? 'marker-list' : 'feature-list';
      const focused = document.querySelector(`#${listId} .kb-focused`);
      if (focused) scrollIntoPane(focused, 'nearest');
      return;
    }

    // Tab / Shift+Tab: switch focus between features and markers lists
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
      // Only intercept when we have an active keyboard focus
      if (kbFocusIdx >= 0 || selectedIdx >= 0 || selectedMarkerIdx >= 0) {
        e.preventDefault();
        const targetList = (kbFocusList === 'features') ? 'markers' : 'features';
        const targetItems = targetList === 'markers' ? markers : features;
        if (targetItems.length === 0) return;
        kbFocusList = targetList;
        kbFocusIdx = 0;
        switchTab(kbFocusList === 'markers' ? 'markers-tab' : 'features-tab');
        renderFeatureList();
        renderMarkerList();
        const listId = kbFocusList === 'markers' ? 'marker-list' : 'feature-list';
        const focused = document.querySelector(`#${listId} .kb-focused`);
        if (focused) scrollIntoPane(focused, 'nearest');
        return;
      }
    }

    // Enter: select/deselect the focused item
    if (e.key === 'Enter' && kbFocusIdx >= 0) {
      e.preventDefault();
      if (kbFocusList === 'features') {
        if (selectedIdx === kbFocusIdx) deselectFeature();
        else selectFeature(kbFocusIdx);
      } else {
        if (selectedMarkerIdx === kbFocusIdx) deselectMarker();
        else selectMarker(kbFocusIdx);
      }
      return;
    }

    // Space: toggle visibility of the focused item
    if (e.key === ' ' && kbFocusIdx >= 0) {
      e.preventDefault();
      pushUndo();
      if (kbFocusList === 'features' && kbFocusIdx < features.length) {
        const f = features[kbFocusIdx];
        f.visible = f.visible === false ? true : false;
        renderFeatureList();
        render();
      } else if (kbFocusList === 'markers' && kbFocusIdx < markers.length) {
        const m = markers[kbFocusIdx];
        m.visible = m.visible === false ? true : false;
        renderMarkerList();
        render();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (kbFocusIdx >= 0) {
        kbFocusIdx = -1;
        renderFeatureList();
        renderMarkerList();
      }
      if (selectedIdx >= 0) { deselectFeature(); }
      else if (selectedMarkerIdx >= 0) { deselectMarker(); }
      // Close all popovers and context menus
      closeAllPopovers();
      if (cepPopover.classList.contains('open')) closeCenterEditPopover();
      if (bbCtxMenu.classList.contains('open')) closeBbCtxMenu();
      if (tickCtxMenu.classList.contains('open')) closeTickCtxMenu();
      closeNewModal();
    }

    // Move selected feature to a different ring with +/-
    if ((e.key === '+' || e.key === '=') && selectedIdx >= 0) {
      const f = features[selectedIdx];
      const cur = f.track || 0;
      if (cur >= 2) return;
      e.preventDefault();
      pushUndo();
      f.track = cur + 1;
      renderFeatureList();
      render();
      flashFeatureArc(selectedIdx);
      const t = f.track;
      const ring = t === 0 ? 'Backbone' : t > 0 ? 'Outer ' + t : 'Inner ' + Math.abs(t);
      showToast('Moved ' + f.name + ' to ' + ring, 'success');
      return;
    }
    if ((e.key === '-' || e.key === '_') && selectedIdx >= 0) {
      const f = features[selectedIdx];
      const cur = f.track || 0;
      if (cur <= -2) return;
      e.preventDefault();
      pushUndo();
      f.track = cur - 1;
      renderFeatureList();
      render();
      flashFeatureArc(selectedIdx);
      const t = f.track;
      const ring = t === 0 ? 'Backbone' : t > 0 ? 'Outer ' + t : 'Inner ' + Math.abs(t);
      showToast('Moved ' + f.name + ' to ' + ring, 'success');
      return;
    }

    if (e.key === 'l' || e.key === 'L') {
      setViewMode(viewMode === 'circular' ? 'linear' : 'circular');
      return;
    }

    if (e.key === 'r' || e.key === 'R') {
      if (mapRotation !== 0) {
        pushUndo();
        mapRotation = 0;
        $rotationSlider.value = 0;
        $rotationNum.value = 0;
        render();
        showToast('Rotation reset', 'success');
      }
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIdx >= 0) {
        const f = features[selectedIdx];
        const di = selectedIdx;
        showConfirm(`Delete <strong>${escHtml(f.name)}</strong>?`, () => {
          pushUndo();
          features.splice(di, 1);
          deselectFeature();
          render();
          renderFeatureList();
        });
      } else if (selectedMarkerIdx >= 0) {
        const m = markers[selectedMarkerIdx];
        const di = selectedMarkerIdx;
        showConfirm(`Delete <strong>${escHtml(m.name)}</strong>?`, () => {
          pushUndo();
          markers.splice(di, 1);
          deselectMarker();
          render();
          renderMarkerList();
        });
      }
    }
  });



  // --- Persistence ---
  const STORAGE_KEY = 'plasmidStudio_projects';
  const MAX_TABS = 10;
  let projects = [];
  let activeProjectIdx = 0;
  let _projectIdCounter = 1;

  function generateProjectId() { return 'p' + (_projectIdCounter++) + '_' + Date.now(); }

  function getBlankState(name, seqLen) {
    return {
      features: [], markers: [],
      inputMode: 'length',
      R: 220, trackW: 28, trackSpacing: 30,
      bbCfg: { fill:'#e2e8f0', edge:'#cbd5e1', edgeWidth:1, opacity:1 },
      tickCfg: {
        majorShow:true, majorInterval:0, majorLabels:true, majorLen:8, majorWidth:1.5, majorColor:'#94a3b8',
        labelSize:10, labelColor:'#64748b',
        minorShow:true, minorInterval:0, minorLabels:false, minorLen:4, minorWidth:1, minorColor:'#cbd5e1', minorLabelColor:'#94a3b8',
        majorDirection:'out', minorDirection:'out',
      },
      gcTrackCfg: { show:false, windowSize:50, radius:0, height:30, colorAbove:'#22c55e', colorBelow:'#ef4444', opacity:0.5 },
      ringStyles: {},
      centerStyle: { nameSize:16, nameColor:'#1e293b', nameFont:'sans-serif', lenSize:13, lenColor:'#64748b', lenFont:'sans-serif' },
      showCenterName: true, showCenterLength: true, lengthFormat: 'auto', mapRotation: 0,
      plasmidName: name || 'Untitled',
      seqLength: seqLen || '3000',
      seqInput: '',
    };
  }

  function getDefaultState(name) {
    const s = getBlankState(name || 'pUC19', '2686');
    s.features = [
      { name:'lacZ-alpha', type:'gene', start:396, end:816, direction:1, color:'#16a34a', ...FEATURE_DEFAULTS },
      { name:'Amp(R)', type:'resistance', start:1629, end:2489, direction:-1, color:'#db2777', ...FEATURE_DEFAULTS },
      { name:'ori', type:'origin', start:817, end:1464, direction:1, color:'#2563eb', ...FEATURE_DEFAULTS },
      { name:'lac promoter', type:'promoter', start:210, end:395, direction:1, color:'#ea580c', ...FEATURE_DEFAULTS },
    ];
    s.markers = [
      { name:'EcoRI', position:450, color:'#dc2626', ...MARKER_DEFAULTS, outerText:'EcoRI', innerText:'450' },
    ];
    return s;
  }

  // Templates
  const TEMPLATES = {
    'pUC19': () => getDefaultState('pUC19'),
    'pBR322': () => ({
      ...getBlankState('pBR322'),
      seqLength: '4361',
      features: [
        { name:'tet(R)', type:'resistance', start:86, end:1276, direction:1, color:'#9333ea', ...FEATURE_DEFAULTS },
        { name:'amp(R)', type:'resistance', start:3293, end:4153, direction:-1, color:'#db2777', ...FEATURE_DEFAULTS },
        { name:'ori', type:'origin', start:1629, end:2274, direction:1, color:'#2563eb', ...FEATURE_DEFAULTS },
      ],
      markers: [
        { name:'EcoRI', position:4361, color:'#dc2626', ...MARKER_DEFAULTS, outerText:'EcoRI', innerText:'4361' },
        { name:'BamHI', position:375, color:'#ea580c', ...MARKER_DEFAULTS, outerText:'BamHI', innerText:'375' },
      ],
    }),
    'pET-28a': () => ({
      ...getBlankState('pET-28a(+)'),
      seqLength: '5369',
      features: [
        { name:'T7 promoter', type:'promoter', start:370, end:386, direction:1, color:'#ea580c', ...FEATURE_DEFAULTS },
        { name:'His-tag', type:'gene', start:270, end:287, direction:1, color:'#0891b2', ...FEATURE_DEFAULTS },
        { name:'MCS', type:'misc', start:158, end:269, direction:1, color:'#64748b', ...FEATURE_DEFAULTS },
        { name:'T7 terminator', type:'terminator', start:26, end:73, direction:1, color:'#dc2626', ...FEATURE_DEFAULTS },
        { name:'kan(R)', type:'resistance', start:3995, end:4807, direction:1, color:'#db2777', ...FEATURE_DEFAULTS },
        { name:'ori', type:'origin', start:4620, end:5234, direction:-1, color:'#2563eb', ...FEATURE_DEFAULTS },
        { name:'lacI', type:'gene', start:773, end:1855, direction:1, color:'#16a34a', ...FEATURE_DEFAULTS },
      ],
      markers: [
        { name:'NcoI', position:296, color:'#dc2626', ...MARKER_DEFAULTS, outerText:'NcoI', innerText:'296' },
        { name:'XhoI', position:158, color:'#ea580c', ...MARKER_DEFAULTS, outerText:'XhoI', innerText:'158' },
      ],
    }),
    'Empty (3 kb)': () => getBlankState('Untitled'),
  };

  function saveCurrentProjectState() {
    if (!projects[activeProjectIdx]) return;
    projects[activeProjectIdx].state = captureState();
    projects[activeProjectIdx].name = $plasmidName.value || 'Untitled';
    projects[activeProjectIdx].undoStack = [...undoStack];
    projects[activeProjectIdx].redoStack = [...redoStack];
  }

  function loadProjectState(idx) {
    if (!projects[idx]) return;
    // Close RE panel if open when switching plasmids
    if ($panel.classList.contains('re-expanded')) closeReModal();
    activeProjectIdx = idx;
    restoreState(projects[idx].state);
    undoStack = projects[idx].undoStack ? [...projects[idx].undoStack] : [];
    redoStack = projects[idx].redoStack ? [...projects[idx].redoStack] : [];
    updateUndoRedoButtons();
    renderTabBar();
  }

  function addProject(state, switchTo) {
    if (projects.length >= MAX_TABS) {
      showConfirm(`Maximum of ${MAX_TABS} plasmids can be open at once. Close a tab first.`, null);
      return null;
    }
    hideEmptyState();
    const name = JSON.parse(state).plasmidName || 'Untitled';
    const proj = { id: generateProjectId(), name, state, undoStack: [], redoStack: [] };
    projects.push(proj);
    if (switchTo !== false) {
      if (activeProjectIdx >= 0) saveCurrentProjectState();
      loadProjectState(projects.length - 1);
    }
    renderTabBar();
    updateTabAddBtn();
    saveAllProjects();
    maybeStartWalkthrough();
    return proj;
  }

  function updateTabAddBtn() {
    const atLimit = projects.length >= MAX_TABS;
    tabAddBtn.disabled = atLimit;
    tabAddBtn.title = atLimit ? `Maximum of ${MAX_TABS} plasmids reached` : 'New plasmid';
  }

  function closeProject(idx) {
    projects.splice(idx, 1);
    if (projects.length === 0) {
      activeProjectIdx = -1;
      showEmptyState();
      saveAllProjects();
      renderTabBar();
      updateTabAddBtn();
      openNewModal();
      return;
    }
    if (activeProjectIdx >= projects.length) activeProjectIdx = projects.length - 1;
    if (activeProjectIdx === idx || idx < activeProjectIdx) {
      activeProjectIdx = Math.min(activeProjectIdx, projects.length - 1);
    }
    loadProjectState(activeProjectIdx);
    updateTabAddBtn();
    saveAllProjects();
  }

  // Close confirmation
  const closeConfirm = $('close-confirm');
  const closeConfirmName = $('close-confirm-name');
  let _pendingCloseIdx = -1;

  function confirmCloseProject(idx, anchorEl) {
    _pendingCloseIdx = idx;
    closeConfirmName.textContent = projects[idx].name || 'Untitled';

    // Position near the close button
    const rect = anchorEl.getBoundingClientRect();
    const containerRect = $mapContainer.getBoundingClientRect();
    let left = rect.left - containerRect.left - 80;
    const top = rect.bottom - containerRect.top + 6;
    left = Math.max(8, Math.min(left, containerRect.width - 230));
    closeConfirm.style.left = left + 'px';
    closeConfirm.style.top = top + 'px';
    closeConfirm.classList.add('open');
  }

  function dismissCloseConfirm() {
    closeConfirm.classList.remove('open');
    _pendingCloseIdx = -1;
  }

  $('close-confirm-cancel').addEventListener('click', dismissCloseConfirm);
  $('close-confirm-ok').addEventListener('click', () => {
    const idx = _pendingCloseIdx;
    dismissCloseConfirm();
    if (idx >= 0) closeProject(idx);
  });
  registerDismiss(closeConfirm, dismissCloseConfirm, ['.tab-close']);

  // Tab context menu
  const tabCtxMenu = $('tab-ctx-menu');
  let _tabCtxIdx = -1;

  function showTabContextMenu(idx, e) {
    _tabCtxIdx = idx;
    const containerRect = $mapContainer.getBoundingClientRect();
    let left = e.clientX - containerRect.left;
    let top = e.clientY - containerRect.top;
    left = Math.max(8, Math.min(left, containerRect.width - 150));
    tabCtxMenu.style.left = left + 'px';
    tabCtxMenu.style.top = top + 'px';
    tabCtxMenu.classList.add('open');
  }

  function dismissTabCtxMenu() {
    tabCtxMenu.classList.remove('open');
    _tabCtxIdx = -1;
  }

  $('tab-ctx-duplicate').addEventListener('click', () => {
    const idx = _tabCtxIdx;
    dismissTabCtxMenu();
    if (idx < 0 || idx >= projects.length) return;
    // Save current project first if duplicating the active one
    if (idx === activeProjectIdx) saveCurrentProjectState();
    const src = projects[idx];
    const srcState = JSON.parse(src.state);
    srcState.plasmidName = (srcState.plasmidName || 'Untitled') + ' (copy)';
    const newState = JSON.stringify(srcState);
    if (addProject(newState)) {
      showToast('Duplicated ' + src.name, 'success');
    }
  });

  $('tab-ctx-close').addEventListener('click', () => {
    const idx = _tabCtxIdx;
    dismissTabCtxMenu();
    if (idx < 0 || idx >= projects.length) return;
    const name = projects[idx].name || 'Untitled';
    showConfirm(`Close "${name}"?`, () => closeProject(idx));
  });

  registerDismiss(tabCtxMenu, dismissTabCtxMenu, []);

  let _quotaWarned = 0;
  let _quotaHighWarned = 0;
  function _checkStorageQuota() {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        used += key.length + (localStorage.getItem(key) || '').length;
      }
      const usedMB = (used * 2) / (1024 * 1024); // UTF-16 = 2 bytes per char
      const limitMB = 5; // standard localStorage limit
      const pct = usedMB / limitMB;
      if (pct > 0.8) {
        const now = Date.now();
        if (now - _quotaHighWarned > 300000) { // warn at most every 5 min
          _quotaHighWarned = now;
          showToast(`Storage ${Math.round(pct * 100)}% full (${usedMB.toFixed(1)}/${limitMB} MB). Export projects to avoid data loss.`, 'error');
        }
      }
    } catch (e) { /* ignore */ }
  }
  function saveAllProjects() {
    try {
      saveCurrentProjectState();
      const data = { activeIdx: activeProjectIdx, idCounter: _projectIdCounter, projects: projects.map(p => ({ id: p.id, name: p.name, state: p.state })) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      _checkStorageQuota();
    } catch (e) {
      const now = Date.now();
      if (now - _quotaWarned > 30000) {
        _quotaWarned = now;
        showToast('Storage full - changes may not be saved. Export your project to avoid data loss.', 'error');
      }
    }
  }

  function saveState() { saveAllProjects(); }

  function loadAllProjects() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      // Migrate from old single-state format
      if (data.features || data.plasmidName) {
        const state = JSON.stringify(data);
        projects = [{ id: generateProjectId(), name: data.plasmidName || 'pUC19', state, undoStack: [], redoStack: [] }];
        activeProjectIdx = 0;
        return true;
      }

      if (!data.projects) return false;
      if (data.projects.length === 0) {
        projects = [];
        activeProjectIdx = -1;
        return 'empty';
      }
      _projectIdCounter = data.idCounter || data.projects.length + 1;
      projects = data.projects.map(p => ({ ...p, undoStack: [], redoStack: [] }));
      activeProjectIdx = Math.min(data.activeIdx || 0, projects.length - 1);
      return true;
    } catch (e) { return false; }
  }

  function loadState() {
    const loaded = loadAllProjects();
    if (!loaded || loaded === 'empty') {
      // First visit or all projects closed - show empty state + modal
      projects = [];
      activeProjectIdx = -1;
      showEmptyState();
      renderTabBar();
      setTimeout(openNewModal, 100);
      return;
    }
    restoreState(projects[activeProjectIdx].state);
    renderTabBar();
    updateTabAddBtn();
  }

  // --- Tab bar rendering & interaction ---
  const tabList = $('tab-list');
  const tabAddBtn = $('tab-add');
  const tabScrollLeft = $('tab-scroll-left');
  const tabScrollRight = $('tab-scroll-right');
  const newModal = $('new-plasmid-modal');

  function updateTabScrollArrows() {
    const canScrollLeft = tabList.scrollLeft > 1;
    const canScrollRight = tabList.scrollLeft < tabList.scrollWidth - tabList.clientWidth - 1;
    tabScrollLeft.style.display = canScrollLeft ? '' : 'none';
    tabScrollRight.style.display = canScrollRight ? '' : 'none';
  }

  tabScrollLeft.addEventListener('click', () => {
    tabList.scrollBy({ left: -120, behavior: 'smooth' });
  });
  tabScrollRight.addEventListener('click', () => {
    tabList.scrollBy({ left: 120, behavior: 'smooth' });
  });
  tabList.addEventListener('scroll', updateTabScrollArrows);
  window.addEventListener('resize', updateTabScrollArrows);

  function renderTabBar() {
    tabList.innerHTML = '';
    projects.forEach((proj, i) => {
      const tab = document.createElement('div');
      tab.className = 'tab-item' + (i === activeProjectIdx ? ' active' : '');
      tab.dataset.idx = i;

      const displayName = proj.name || 'Untitled';
      tab.title = displayName;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'tab-name';
      nameSpan.textContent = displayName;
      tab.appendChild(nameSpan);

      // Show bp count from saved state
      try {
        const s = JSON.parse(proj.state);
        const bp = s.inputMode === 'sequence' && s.seqInput ? s.seqInput.replace(/[^a-zA-Z]/g,'').length : parseInt(s.seqLength) || 0;
        if (bp > 0) {
          const bpSpan = document.createElement('span');
          bpSpan.className = 'tab-bp';
          bpSpan.textContent = bp.toLocaleString('en-US');
          tab.appendChild(bpSpan);
        }
      } catch(e) {}

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '<svg width="8" height="8" viewBox="0 0 8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/></svg>';
      closeBtn.title = 'Close';
      closeBtn.addEventListener('click', e => { e.stopPropagation(); confirmCloseProject(i, closeBtn); });
      tab.appendChild(closeBtn);

      // Right-click context menu
      tab.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        showTabContextMenu(i, e);
      });

      // Click to switch
      tab.addEventListener('click', () => {
        if (i === activeProjectIdx) return;
        saveCurrentProjectState();
        loadProjectState(i);
      });

      // Double-click to rename
      tab.addEventListener('dblclick', e => {
        e.stopPropagation();
        startTabRename(i, nameSpan);
      });

      // Drag to reorder
      tab.draggable = true;
      tab.addEventListener('dragstart', e => {
        _tabDragIdx = i;
        tab.classList.add('tab-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
      });
      tab.addEventListener('dragend', () => {
        tab.classList.remove('tab-dragging');
        _tabDragIdx = -1;
        tabList.querySelectorAll('.tab-item').forEach(t => t.classList.remove('tab-drop-before', 'tab-drop-after'));
      });
      tab.addEventListener('dragover', e => {
        if (_tabDragIdx < 0) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = tab.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        tabList.querySelectorAll('.tab-item').forEach(t => t.classList.remove('tab-drop-before', 'tab-drop-after'));
        tab.classList.add(e.clientX < mid ? 'tab-drop-before' : 'tab-drop-after');
      });
      tab.addEventListener('dragleave', () => {
        tab.classList.remove('tab-drop-before', 'tab-drop-after');
      });
      tab.addEventListener('drop', e => {
        e.preventDefault();
        tab.classList.remove('tab-drop-before', 'tab-drop-after');
        if (_tabDragIdx < 0 || _tabDragIdx === i) return;
        const rect = tab.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        let toIdx = e.clientX < mid ? i : i + 1;
        if (_tabDragIdx < toIdx) toIdx--;
        if (_tabDragIdx === toIdx) return;
        // Reorder projects array
        const [moved] = projects.splice(_tabDragIdx, 1);
        projects.splice(toIdx, 0, moved);
        // Update activeProjectIdx
        if (activeProjectIdx === _tabDragIdx) {
          activeProjectIdx = toIdx;
        } else if (_tabDragIdx < activeProjectIdx && toIdx >= activeProjectIdx) {
          activeProjectIdx--;
        } else if (_tabDragIdx > activeProjectIdx && toIdx <= activeProjectIdx) {
          activeProjectIdx++;
        }
        _tabDragIdx = -1;
        renderTabBar();
        saveAllProjects();
      });

      tabList.appendChild(tab);
    });

    // Scroll active tab into view and update arrow visibility
    requestAnimationFrame(() => {
      const activeTab = tabList.querySelector('.tab-item.active');
      if (activeTab) activeTab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      updateTabScrollArrows();
    });
  }
  let _tabDragIdx = -1;

  function startTabRename(idx, nameSpan) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-name-input';
    input.maxLength = 80;
    input.value = projects[idx].name;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
      const val = input.value.trim() || 'Untitled';
      projects[idx].name = val;
      if (idx === activeProjectIdx) {
        $plasmidName.value = val;
        if ($cepName) $cepName.value = val;
        scheduleRender();
      }
      // Update saved state name
      try {
        const s = JSON.parse(projects[idx].state);
        s.plasmidName = val;
        projects[idx].state = JSON.stringify(s);
      } catch(e) {}
      renderTabBar();
      saveAllProjects();
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); renderTabBar(); }
    });
    input.addEventListener('blur', commit);
  }

  // --- Restriction Enzyme Finder Modal ---
  const rePanel = $('re-panel');
  const reResults = $('re-results');
  const reSearch = $('re-search');
  const reCutFilter = $('re-cut-filter');
  const reSelectAll = $('re-select-all');
  const reAddSelected = $('re-add-selected');
  const reSummary = $('re-summary');
  const reEmpty = $('re-empty');

  let _reCache = []; // cached scan results: { enzyme, sites[] }

  function openReModal() {
    if (inputMode !== 'sequence' || getSequence().length === 0) return;
    _reScan();
    reSearch.value = '';
    reCutFilter.value = 'all';
    reSelectAll.checked = false;
    _reRender();
    // Hide normal panel content, show RE panel, widen sidebar
    $panel.querySelector('h2').style.display = 'none';
    document.querySelector('.panel-top').style.display = 'none';
    document.querySelector('.panel-bottom').style.display = 'none';
    document.querySelector('.panel-footer').style.display = 'none';
    rePanel.style.display = 'flex';
    $panel.classList.add('re-expanded');
    reSearch.focus();
  }

  function closeReModal() {
    _reClearHighlight();
    _reHoveredIdx = -1;
    rePanel.style.display = 'none';
    $panel.querySelector('h2').style.display = '';
    document.querySelector('.panel-top').style.display = '';
    document.querySelector('.panel-bottom').style.display = '';
    document.querySelector('.panel-footer').style.display = '';
    $panel.classList.remove('re-expanded');
  }

  function _reScan() {
    const seq = getSequence();
    _reCache = RE_ENZYMES.map(enz => ({
      enzyme: enz,
      sites: findCutSites(enz, seq)
    }));
  }

  function _reFilteredResults() {
    const query = reSearch.value.trim().toLowerCase();
    const cutVal = reCutFilter.value;
    return _reCache.filter(r => {
      // Name or sequence search
      if (query && !r.enzyme.name.toLowerCase().includes(query) &&
          !r.enzyme.seq.toLowerCase().includes(query)) return false;
      // Cut count filter
      const n = r.sites.length;
      if (cutVal === '0') return n === 0;
      if (cutVal === '1') return n === 1;
      if (cutVal === '2') return n === 2;
      if (cutVal === '3') return n <= 3;
      if (cutVal === '6') return n <= 6;
      return true; // 'all'
    });
  }

  function _reRender() {
    const filtered = _reFilteredResults();
    const len = getLength();
    let html = '';
    filtered.forEach((r, i) => {
      const n = r.sites.length;
      const posStr = n === 0 ? '<span class="re-none">–</span>' :
        r.sites.map(p => p.toLocaleString()).join(', ');
      const cutClass = n === 0 ? 're-cuts-zero' : n === 1 ? 're-cuts-one' : '';
      const oh = getOverhangInfo(r.enzyme);
      const ohClass = oh.type === 'blunt' ? 're-oh-blunt' : oh.type === "5\u2032" ? 're-oh-5' : 're-oh-3';
      html += `<tr data-re-idx="${i}">
        <td class="re-td-check"><input type="checkbox" class="re-row-check" ${n === 0 ? 'disabled' : ''} aria-label="Select ${escHtml(r.enzyme.name)}"></td>
        <td class="re-td-name">${escHtml(r.enzyme.name)}</td>
        <td class="re-td-seq"><code>${escHtml(r.enzyme.seq)}</code></td>
        <td class="re-td-oh ${ohClass}">${oh.label}</td>
        <td class="re-td-cuts ${cutClass}">${n}</td>
        <td class="re-td-pos">${posStr}</td>
        <td class="re-td-action">${n > 0 ? `<button class="btn-sm re-add-one" data-ridx="${i}" title="Add ${escHtml(r.enzyme.name)} as marker${n > 1 ? 's' : ''}">Add</button>` : ''}</td>
      </tr>`;
    });
    reResults.innerHTML = html;
    reEmpty.style.display = filtered.length === 0 ? '' : 'none';
    const withCuts = filtered.filter(r => r.sites.length > 0).length;
    reSummary.textContent = `${filtered.length} enzyme${filtered.length !== 1 ? 's' : ''} shown \u00b7 ${withCuts} with cuts`;
    _reUpdateSelectAll();
    _reUpdateAddSelected();

    // Individual add buttons
    reResults.querySelectorAll('.re-add-one').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.ridx);
        const r = filtered[idx];
        if (!r || r.sites.length === 0) return;
        _reAddEnzyme(r);
        btn.textContent = 'Added';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = 'Add'; btn.disabled = false; }, 1200);
      });
    });

    // Row checkboxes
    reResults.querySelectorAll('.re-row-check').forEach(cb => {
      cb.addEventListener('change', () => {
        _reUpdateSelectAll();
        _reUpdateAddSelected();
      });
    });
  }

  function _reUpdateSelectAll() {
    const boxes = reResults.querySelectorAll('.re-row-check:not(:disabled)');
    const checked = reResults.querySelectorAll('.re-row-check:checked');
    reSelectAll.checked = boxes.length > 0 && checked.length === boxes.length;
    reSelectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
  }

  function _reUpdateAddSelected() {
    const checked = reResults.querySelectorAll('.re-row-check:checked');
    reAddSelected.disabled = checked.length === 0;
    reAddSelected.textContent = checked.length > 0 ? `Add selected (${checked.length})` : 'Add selected';
  }

  function _reAddEnzyme(r) {
    pushUndo();
    const color = '#dc2626';
    r.sites.forEach(pos => {
      // Skip if a marker with same name at same position already exists
      if (markers.some(m => m.name === r.enzyme.name && m.position === pos)) return;
      markers.push({
        name: r.enzyme.name, position: pos, color, ...MARKER_DEFAULTS,
        outerLabel: true, outerText: r.enzyme.name,
        innerLabel: true, innerText: String(pos),
        enzyme: { seq: r.enzyme.seq, cut: r.enzyme.cut, cut3: r.enzyme.cut3 != null ? r.enzyme.cut3 : r.enzyme.seq.length - r.enzyme.cut }
      });
    });
    renderMarkerList();
    render();
  }

  // Select all checkbox
  reSelectAll.addEventListener('change', () => {
    const boxes = reResults.querySelectorAll('.re-row-check:not(:disabled)');
    boxes.forEach(cb => { cb.checked = reSelectAll.checked; });
    _reUpdateAddSelected();
  });

  // Add selected button
  reAddSelected.addEventListener('click', () => {
    const filtered = _reFilteredResults();
    const rows = reResults.querySelectorAll('tr[data-re-idx]');
    let added = 0;
    rows.forEach(row => {
      const cb = row.querySelector('.re-row-check');
      if (!cb || !cb.checked) return;
      const idx = parseInt(row.dataset.reIdx);
      const r = filtered[idx];
      if (!r || r.sites.length === 0) return;
      _reAddEnzyme(r);
      added++;
      cb.checked = false;
    });
    _reUpdateSelectAll();
    _reUpdateAddSelected();
    if (added > 0) {
      showToast(`Added ${added} enzyme${added > 1 ? 's' : ''} as markers`, 'success');
    }
  });

  // Highlight cut positions on map when hovering enzyme rows
  let _reHighlightGroup = null;

  function _reShowHighlight(sites) {
    _reClearHighlight();
    if (!sites || sites.length === 0) return;
    const total = getLength();
    if (total <= 0) return;

    const svg = viewMode === 'linear' ? $linearSvg : $svg;
    if (!svg) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 're-highlight-group');
    g.setAttribute('pointer-events', 'none');

    if (viewMode !== 'linear') {
      // Circular view - draw radial lines at each cut position
      const ro = R + trackW / 2 + 12;
      const ri = R - trackW / 2 - 6;
      sites.forEach(pos => {
        const angle = ((pos / total) * 360 - 90) * Math.PI / 180;
        const x1 = cx + ro * Math.cos(angle);
        const y1 = cy + ro * Math.sin(angle);
        const x2 = cx + ri * Math.cos(angle);
        const y2 = cy + ri * Math.sin(angle);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#dc2626');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.6');
        line.setAttribute('stroke-dasharray', '4,3');
        g.appendChild(line);
        // Small diamond at cut position on backbone
        const mx = cx + R * Math.cos(angle);
        const my = cy + R * Math.sin(angle);
        const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        diamond.setAttribute('cx', mx); diamond.setAttribute('cy', my);
        diamond.setAttribute('r', '3.5');
        diamond.setAttribute('fill', '#dc2626');
        diamond.setAttribute('opacity', '0.7');
        g.appendChild(diamond);
      });
    }

    svg.appendChild(g);
    _reHighlightGroup = g;
  }

  function _reClearHighlight() {
    if (_reHighlightGroup) {
      _reHighlightGroup.remove();
      _reHighlightGroup = null;
    }
  }

  // Delegated hover on results table
  let _reHoveredIdx = -1;
  reResults.addEventListener('mouseover', e => {
    const row = e.target.closest('tr[data-re-idx]');
    if (!row) { if (_reHoveredIdx >= 0) { _reClearHighlight(); _reHoveredIdx = -1; } return; }
    const idx = parseInt(row.dataset.reIdx);
    if (idx === _reHoveredIdx) return;
    _reHoveredIdx = idx;
    const filtered = _reFilteredResults();
    const r = filtered[idx];
    if (r && r.sites.length > 0) _reShowHighlight(r.sites);
    else _reClearHighlight();
  });

  reResults.addEventListener('mouseleave', () => { _reClearHighlight(); _reHoveredIdx = -1; });

  // Search and filter
  reSearch.addEventListener('input', _reRender);
  reCutFilter.addEventListener('change', _reRender);

  // Open/close
  $('open-re-finder').addEventListener('click', openReModal);
  $('re-panel-back').addEventListener('click', closeReModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $panel.classList.contains('re-expanded')) {
      e.preventDefault(); closeReModal();
    }
  });

  // --- Feature Style Theme Modal ---
  const styleThemeModal = $('style-theme-modal');
  const styleThemeGrid = $('style-theme-grid');

  // Render a mini plasmid ring SVG showing the theme's colors
  function renderThemePreview(theme) {
    const size = 80, cx = 40, cy = 40, r = 28, w = 10;
    const types = ['gene', 'promoter', 'terminator', 'origin', 'resistance', 'regulatory', 'primer', 'misc'];
    const segAngle = 360 / types.length;
    let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
    // Backbone ring
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-light, #e2e8f0)" stroke-width="1.5"/>`;
    // Feature arcs
    types.forEach((type, i) => {
      const rule = theme.rules[type] || {};
      const color = rule.color || '#94a3b8';
      const opacity = rule.opacity || 0.85;
      const startDeg = i * segAngle - 90 + 3; // 3° gap between segments
      const endDeg = (i + 1) * segAngle - 90 - 3;
      const startRad = startDeg * Math.PI / 180;
      const endRad = endDeg * Math.PI / 180;
      const ro = r + w / 2, ri = r - w / 2;
      const x1o = cx + ro * Math.cos(startRad), y1o = cy + ro * Math.sin(startRad);
      const x2o = cx + ro * Math.cos(endRad), y2o = cy + ro * Math.sin(endRad);
      const x1i = cx + ri * Math.cos(endRad), y1i = cy + ri * Math.sin(endRad);
      const x2i = cx + ri * Math.cos(startRad), y2i = cy + ri * Math.sin(startRad);
      const large = (endDeg - startDeg) > 180 ? 1 : 0;

      if (rule.arrow) {
        // Draw arc with arrowhead at end
        const arrowDeg = 8;
        const bodyEndRad = (endDeg - arrowDeg) * Math.PI / 180;
        const bx1o = cx + ro * Math.cos(bodyEndRad), by1o = cy + ro * Math.sin(bodyEndRad);
        const bx1i = cx + ri * Math.cos(bodyEndRad), by1i = cy + ri * Math.sin(bodyEndRad);
        const tipRad = endDeg * Math.PI / 180;
        const tipX = cx + r * Math.cos(tipRad), tipY = cy + r * Math.sin(tipRad);
        const bodyLarge = ((endDeg - arrowDeg) - startDeg) > 180 ? 1 : 0;
        svg += `<path d="M ${x1o} ${y1o} A ${ro} ${ro} 0 ${bodyLarge} 1 ${bx1o} ${by1o} L ${tipX} ${tipY} L ${bx1i} ${by1i} A ${ri} ${ri} 0 ${bodyLarge} 0 ${x2i} ${y2i} Z" fill="${color}" opacity="${opacity}"/>`;
      } else {
        svg += `<path d="M ${x1o} ${y1o} A ${ro} ${ro} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${ri} ${ri} 0 ${large} 0 ${x2i} ${y2i} Z" fill="${color}" opacity="${opacity}"/>`;
      }
    });
    svg += '</svg>';
    return svg;
  }

  function populateStyleThemeGrid() {
    styleThemeGrid.innerHTML = '';
    STYLE_THEMES.forEach(theme => {
      const card = document.createElement('div');
      card.className = 'style-theme-item';
      card.dataset.themeId = theme.id;
      card.innerHTML = `
        <div class="style-theme-preview">${renderThemePreview(theme)}</div>
        <div class="style-theme-name">${theme.name}</div>
        <div class="style-theme-desc">${theme.desc}</div>
      `;
      card.addEventListener('click', () => {
        applyStyleTheme(theme.id);
        closeStyleThemeModal();
      });
      styleThemeGrid.appendChild(card);
    });
  }

  function applyStyleTheme(themeId) {
    const theme = STYLE_THEMES.find(t => t.id === themeId);
    if (!theme) return;
    pushUndo();
    features.forEach(f => {
      const rule = theme.rules[f.type] || theme.rules.misc || {};
      const defs = theme.defaults || {};
      // Apply color and shape properties from the rule
      if (rule.color) f.color = rule.color;
      if (rule.opacity != null) f.opacity = rule.opacity;
      if (rule.arrow != null) f.arrow = rule.arrow;
      if (rule.arrowStyle) f.arrowStyle = rule.arrowStyle;
      if (rule.tailCut != null) f.tailCut = rule.tailCut;
      if (rule.labelColor) f.labelColor = rule.labelColor;
      // Apply defaults
      if (defs.labelFont) f.labelFont = defs.labelFont;
      if (defs.labelSize) f.labelSize = defs.labelSize;
      if (defs.border != null) f.border = defs.border;
      if (defs.labelColor) f.labelColor = defs.labelColor;
    });
    renderFeatureList();
    render();
    showToast(`Applied "${theme.name}" style`, 'success');
  }

  function openStyleThemeModal() {
    populateStyleThemeGrid();
    styleThemeModal.classList.add('open');
    const first = styleThemeGrid.querySelector('.style-theme-item');
    if (first) first.focus();
  }

  function closeStyleThemeModal() {
    closeModal(styleThemeModal);
  }

  $('style-theme-close').addEventListener('click', closeStyleThemeModal);
  styleThemeModal.addEventListener('click', e => { if (e.target === styleThemeModal) closeStyleThemeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && styleThemeModal.classList.contains('open')) {
      e.preventDefault(); closeStyleThemeModal();
    }
  });
  $('open-style-themes').addEventListener('click', openStyleThemeModal);

  // --- New Plasmid Modal ---
  let _modalReturnFocus = null;
  function openNewModal() {
    if (projects.length >= MAX_TABS) {
      showConfirm(`Maximum of ${MAX_TABS} plasmids can be open at once. Close a tab first.`, null);
      return;
    }
    _modalReturnFocus = document.activeElement;
    newModal.classList.add('open');
    // Focus first actionable element
    const first = newModal.querySelector('.modal-option, button');
    if (first) first.focus();
  }
  function closeNewModal() {
    closeModal(newModal);
    if (_modalReturnFocus) { _modalReturnFocus.focus(); _modalReturnFocus = null; }
  }

  tabAddBtn.addEventListener('click', openNewModal);
  $('empty-new-btn').addEventListener('click', openNewModal);
  $('new-modal-close').addEventListener('click', closeNewModal);
  newModal.addEventListener('click', e => { if (e.target === newModal) closeNewModal(); });

  // Focus trap for modal
  newModal.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeNewModal(); return; }
    if (e.key !== 'Tab') return;
    const focusable = newModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Drag-and-drop on the new plasmid modal
  const modalDropZone = $('modal-drop-zone');
  const modalCard = newModal.querySelector('.modal-card');
  let _dragCounter = 0;

  newModal.addEventListener('dragenter', e => {
    e.preventDefault();
    _dragCounter++;
    modalDropZone.classList.add('visible');
  });
  newModal.addEventListener('dragleave', e => {
    e.preventDefault();
    _dragCounter--;
    if (_dragCounter <= 0) { _dragCounter = 0; modalDropZone.classList.remove('visible', 'drag-over'); }
  });
  newModal.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    modalDropZone.classList.add('drag-over');
  });
  newModal.addEventListener('drop', e => {
    e.preventDefault();
    _dragCounter = 0;
    modalDropZone.classList.remove('visible', 'drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      closeNewModal();
      handleImportFile(file);
    }
  });

  // Also support drag-and-drop on the main map area when no modal is open
  const mapDropOverlay = $('map-drop-overlay');
  let _mapDragCounter = 0;
  $mapContainer.addEventListener('dragenter', e => {
    e.preventDefault();
    if (_tabDragIdx >= 0) return;
    _mapDragCounter++;
    mapDropOverlay.classList.add('visible');
  });
  $mapContainer.addEventListener('dragleave', e => {
    e.preventDefault();
    if (_tabDragIdx >= 0) return;
    _mapDragCounter--;
    if (_mapDragCounter <= 0) { _mapDragCounter = 0; mapDropOverlay.classList.remove('visible', 'drag-over'); }
  });
  $mapContainer.addEventListener('dragover', e => {
    e.preventDefault();
    if (_tabDragIdx >= 0) return;
    e.dataTransfer.dropEffect = 'copy';
    mapDropOverlay.classList.add('drag-over');
  });
  $mapContainer.addEventListener('drop', e => {
    e.preventDefault();
    if (_tabDragIdx >= 0) return;
    _mapDragCounter = 0;
    mapDropOverlay.classList.remove('visible', 'drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  });

  // Blank
  newModal.querySelector('[data-action="blank"]').addEventListener('click', () => {
    closeNewModal();
    const state = JSON.stringify(getBlankState('Untitled'));
    addProject(state);
  });

  // Templates
  newModal.querySelectorAll('.modal-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeNewModal();
      const tplName = btn.dataset.template;
      const tplFn = TEMPLATES[tplName];
      if (tplFn) {
        const state = JSON.stringify(tplFn());
        addProject(state);
      }
    });
  });

  // Import via modal
  newModal.querySelector('[data-action="import"]').addEventListener('click', () => {
    closeNewModal();
    $('import-json-file').click();
  });

  // Fetch from NCBI / AddGene
  $fetchBtn.addEventListener('click', async () => {
    const input = $('fetch-accession');
    const status = $('fetch-status');
    const btn = $fetchBtn;
    const raw = input.value.trim();
    if (!raw) { status.textContent = 'Enter an accession or AddGene ID.'; return; }

    btn.disabled = true;
    status.textContent = 'Fetching\u2026';

    try {
      let gbText = '';
      // Detect AddGene numeric ID
      const isAddGene = /^\d{4,6}$/.test(raw);
      if (isAddGene) {
        const url = `https://www.addgene.org/browse/sequence/${raw}/?format=genbank`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('AddGene returned ' + resp.status + '. Check the plasmid ID.');
        gbText = await resp.text();
      } else {
        // NCBI E-utilities efetch
        const acc = encodeURIComponent(raw);
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=${acc}&rettype=gb&retmode=text`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('NCBI returned ' + resp.status + '. Check the accession number.');
        gbText = await resp.text();
        if (!gbText.match(/^LOCUS\s+/m)) throw new Error('No GenBank record found for "' + raw + '".');
      }
      const state = buildStateFromImport(gbText, 'gb');
      addProject(state);
      closeNewModal();
      input.value = '';
      status.textContent = '';
      showToast('Imported ' + (isAddGene ? 'AddGene #' : '') + raw, 'success');
    } catch (e) {
      status.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  });
  // Allow Enter key in the fetch input
  $('fetch-accession').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $fetchBtn.click(); }
  });

  // Sync tab name when plasmid name input changes
  $plasmidName.addEventListener('input', () => {
    const name = $plasmidName.value;
    if (projects[activeProjectIdx]) {
      projects[activeProjectIdx].name = name;
      renderTabBar();
    }
  });

  // Debounced auto-save after any render
  let _saveTimer = null;
  const _origRender = _render;
  _render = function() {
    _origRender();
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(saveState, 500);
  };

  // --- Zoom & Pan ---
  (function() {
    const circSvg = $svg;
    const linSvg = $linearSvg;
    const toggleBtn = $('toolbar-pan-toggle');
    const resetBtn = $('toolbar-pan-reset');

    let panMode = false;
    // Circular state
    let cZoom = 1, cPanX = 0, cPanY = 0;
    // Linear state
    let lZoom = 1, lPanX = 0, lPanY = 0;
    let _linW = 0, _linH = 0; // natural dimensions of linear SVG
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 8;

    function _activeSvg() { return viewMode === 'linear' ? linSvg : circSvg; }

    // Re-apply zoom after linear re-render (which resets viewBox)
    _afterLinearRender = function(w, h) {
      _linW = w; _linH = h;
      if (panMode && (lZoom !== 1 || lPanX !== 0 || lPanY !== 0)) {
        applyViewBox();
      }
    };

    function applyViewBox() {
      if (viewMode === 'linear') {
        if (!linSvg) return;
        if (!_linW || !_linH) {
          const vb = linSvg.getAttribute('viewBox');
          if (vb) { const p = vb.split(/\s+/).map(Number); _linW = p[2]; _linH = p[3]; }
        }
        if (!_linW || !_linH) return;
        const w = _linW / lZoom, h = _linH / lZoom;
        const vx = (_linW - w) / 2 + lPanX;
        const vy = (_linH - h) / 2 + lPanY;
        linSvg.setAttribute('viewBox', `${vx} ${vy} ${w} ${h}`);
      } else {
        const size = SVG_SIZE / cZoom;
        const vx = (SVG_SIZE - size) / 2 + cPanX;
        const vy = (SVG_SIZE - size) / 2 + cPanY;
        circSvg.setAttribute('viewBox', `${vx} ${vy} ${size} ${size}`);
      }
    }



    function resetView() {
      if (viewMode === 'linear') {
        lZoom = 1; lPanX = 0; lPanY = 0;
        // Restore natural viewBox
        if (linSvg && _linW && _linH) linSvg.setAttribute('viewBox', `0 0 ${_linW} ${_linH}`);
      } else {
        cZoom = 1; cPanX = 0; cPanY = 0;
        circSvg.setAttribute('viewBox', `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
      }
      resetBtn.style.display = 'none';
      resetBtn.classList.remove('toolbar-btn-accent');
    }

    function _zoom() { return viewMode === 'linear' ? lZoom : cZoom; }
    function _panXY() { return viewMode === 'linear' ? [lPanX, lPanY] : [cPanX, cPanY]; }

    function showResetBtn() {
      const z = _zoom(), [px, py] = _panXY();
      if (z !== 1 || px !== 0 || py !== 0) {
        resetBtn.style.display = '';
        resetBtn.classList.add('toolbar-btn-accent');
      } else {
        resetBtn.style.display = 'none';
        resetBtn.classList.remove('toolbar-btn-accent');
      }
    }

    // Toggle pan mode
    toggleBtn.addEventListener('click', () => {
      panMode = !panMode;
      toggleBtn.classList.toggle('toolbar-btn-active', panMode);
      circSvg.classList.toggle('pan-mode', panMode && viewMode === 'circular');
      if (linSvg) linSvg.classList.toggle('pan-mode', panMode && viewMode === 'linear');
      $mapContainer.classList.toggle('pan-active', panMode);
      if (panMode) {
        showToast('Pan & Zoom mode - scroll to zoom, drag to pan', 'info');
      } else {
        showToast('Pan & Zoom off', 'info');
      }
    });

    resetBtn.addEventListener('click', () => {
      resetView();
    });

    // Wheel zoom handler (shared)
    function onWheel(e) {
      if (!panMode) return;
      e.preventDefault();
      const s = _activeSvg();
      const rect = s.getBoundingClientRect();
      const isLin = viewMode === 'linear';
      const z = isLin ? lZoom : cZoom;
      const px = isLin ? lPanX : cPanX;
      const py = isLin ? lPanY : cPanY;
      const natW = isLin ? _linW : SVG_SIZE;
      const natH = isLin ? _linH : SVG_SIZE;
      if (!natW || !natH) return;

      const w = natW / z, h = natH / z;
      const vx = (natW - w) / 2 + px;
      const vy = (natH - h) / 2 + py;
      const cursorX = vx + ((e.clientX - rect.left) / rect.width) * w;
      const cursorY = vy + ((e.clientY - rect.top) / rect.height) * h;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * delta));
      const nw = natW / nz, nh = natH / nz;
      const fx = (cursorX - vx) / w, fy = (cursorY - vy) / h;
      const npx = cursorX - fx * nw - (natW - nw) / 2;
      const npy = cursorY - fy * nh - (natH - nh) / 2;

      if (isLin) { lZoom = nz; lPanX = npx; lPanY = npy; }
      else { cZoom = nz; cPanX = npx; cPanY = npy; }
      applyViewBox();
      showResetBtn();
    }
    circSvg.addEventListener('wheel', onWheel, { passive: false });
    if (linSvg) linSvg.addEventListener('wheel', onWheel, { passive: false });

    // Drag to pan
    let dragging = false;
    let dragStartX, dragStartY, panStartX, panStartY;
    let _dragSvg = null;

    function onMouseDown(e) {
      if (!panMode) return;
      e.preventDefault();
      e.stopPropagation();
      _dragSvg = _activeSvg();
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const [px, py] = _panXY();
      panStartX = px; panStartY = py;
      _dragSvg.classList.add('panning');
    }
    circSvg.addEventListener('mousedown', onMouseDown);
    if (linSvg) linSvg.addEventListener('mousedown', onMouseDown);

    window.addEventListener('mousemove', e => {
      if (!dragging || !_dragSvg) return;
      const rect = _dragSvg.getBoundingClientRect();
      const isLin = viewMode === 'linear';
      const z = isLin ? lZoom : cZoom;
      const natW = isLin ? _linW : SVG_SIZE;
      const scaleX = (natW / z) / rect.width;
      const scaleY = isLin ? ((_linH || natW) / z) / rect.height : scaleX;
      if (isLin) {
        lPanX = panStartX - (e.clientX - dragStartX) * scaleX;
        lPanY = panStartY - (e.clientY - dragStartY) * scaleY;
      } else {
        cPanX = panStartX - (e.clientX - dragStartX) * scaleX;
        cPanY = panStartY - (e.clientY - dragStartY) * scaleX;
      }
      applyViewBox();
      showResetBtn();
    });

    window.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        if (_dragSvg) _dragSvg.classList.remove('panning');
        _dragSvg = null;
      }
    });

    // Touch support
    let lastTouchDist = 0;
    let touchStartPanX, touchStartPanY;

    function onTouchStart(e) {
      if (!panMode) return;
      _dragSvg = _activeSvg();
      if (e.touches.length === 1) {
        dragging = true;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        const [px, py] = _panXY();
        panStartX = px; panStartY = py;
      } else if (e.touches.length === 2) {
        dragging = false;
        lastTouchDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        const [px, py] = _panXY();
        touchStartPanX = px; touchStartPanY = py;
      }
    }

    function onTouchMove(e) {
      if (!panMode || !_dragSvg) return;
      const isLin = viewMode === 'linear';
      if (e.touches.length === 1 && dragging) {
        e.preventDefault();
        const rect = _dragSvg.getBoundingClientRect();
        const z = isLin ? lZoom : cZoom;
        const natW = isLin ? _linW : SVG_SIZE;
        const scaleX = (natW / z) / rect.width;
        const scaleY = isLin ? ((_linH || natW) / z) / rect.height : scaleX;
        if (isLin) {
          lPanX = panStartX - (e.touches[0].clientX - dragStartX) * scaleX;
          lPanY = panStartY - (e.touches[0].clientY - dragStartY) * scaleY;
        } else {
          cPanX = panStartX - (e.touches[0].clientX - dragStartX) * scaleX;
          cPanY = panStartY - (e.touches[0].clientY - dragStartY) * scaleX;
        }
        applyViewBox();
        showResetBtn();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        const delta = dist / lastTouchDist;
        if (isLin) { lZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, lZoom * delta)); }
        else { cZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cZoom * delta)); }
        lastTouchDist = dist;
        applyViewBox();
        showResetBtn();
      }
    }

    function onTouchEnd() { dragging = false; lastTouchDist = 0; _dragSvg = null; }

    circSvg.addEventListener('touchstart', onTouchStart, { passive: true });
    circSvg.addEventListener('touchmove', onTouchMove, { passive: false });
    circSvg.addEventListener('touchend', onTouchEnd, { passive: true });
    if (linSvg) {
      linSvg.addEventListener('touchstart', onTouchStart, { passive: true });
      linSvg.addEventListener('touchmove', onTouchMove, { passive: false });
      linSvg.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    // --- Drag feature to change ring ---
    (function() {
      const svg = circSvg;
      let ringDragIdx = -1;
      let ringDragStartTrack = 0;
      let ringDragMoved = false;
      let ringDragStartX = 0, ringDragStartY = 0;
      const DRAG_THRESHOLD = 6; // px before drag activates

      function clientToSvg(clientX, clientY) {
        const rect = svg.getBoundingClientRect();
        const size = SVG_SIZE / cZoom;
        const vx = (SVG_SIZE - size) / 2 + cPanX;
        const vy = (SVG_SIZE - size) / 2 + cPanY;
        return {
          x: vx + ((clientX - rect.left) / rect.width) * size,
          y: vy + ((clientY - rect.top) / rect.height) * size
        };
      }

      function distFromCenter(svgPt) {
        return Math.hypot(svgPt.x - cx, svgPt.y - cy);
      }

      function trackFromRadius(dist) {
        // Find nearest track: track 0 is at R, spacing derived from trackW
        const spacing = trackW + 8;
        const offset = dist - R;
        return Math.round(offset / spacing);
      }

      svg.addEventListener('mousedown', e => {
        if (panMode) return;
        const idx = getArcIdx(e.target);
        if (idx < 0) return;
        e.preventDefault();
        ringDragIdx = idx;
        ringDragStartTrack = features[idx].track || 0;
        ringDragMoved = false;
        ringDragStartX = e.clientX;
        ringDragStartY = e.clientY;
      });

      window.addEventListener('mousemove', e => {
        if (ringDragIdx < 0) return;
        if (!ringDragMoved) {
          const dx = e.clientX - ringDragStartX;
          const dy = e.clientY - ringDragStartY;
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          ringDragMoved = true;
          svg.style.cursor = 'ns-resize';
        }
        const pt = clientToSvg(e.clientX, e.clientY);
        const dist = distFromCenter(pt);
        let newTrack = trackFromRadius(dist);
        newTrack = Math.max(-2, Math.min(2, newTrack));
        if (newTrack !== (features[ringDragIdx].track || 0)) {
          features[ringDragIdx].track = newTrack;
          render();
        }
      });

      window.addEventListener('mouseup', () => {
        if (ringDragIdx < 0) return;
        const f = features[ringDragIdx];
        const newTrack = f.track || 0;
        if (ringDragMoved) {
          svg._ringDragged = true; // suppress the click event
          if (newTrack !== ringDragStartTrack) {
            const movedIdx = ringDragIdx;
            pushUndo();
            const ring = newTrack === 0 ? 'Backbone' : newTrack > 0 ? 'Outer ' + newTrack : 'Inner ' + Math.abs(newTrack);
            showToast('Moved ' + f.name + ' to ' + ring, 'success');
            renderFeatureList();
            flashFeatureArc(movedIdx);
          } else {
            f.track = ringDragStartTrack;
            render();
          }
        }
        svg.style.cursor = '';
        ringDragIdx = -1;
        ringDragMoved = false;
      });
    })();

    // --- Minimap ---
    const minimap = $('minimap');
    const minimapCanvas = $('minimap-canvas');
    const minimapViewport = $('minimap-viewport');
    const minimapCtx = minimapCanvas.getContext('2d');
    let minimapDirty = true;
    let minimapUpdating = false;
    let minimapRafId = 0;
    let minimapDebounceTimer = null;
    let minimapVBx = 0, minimapVBy = 0, minimapVBSize = SVG_SIZE; // current minimap viewBox
    const MINIMAP_DEBOUNCE_MS = 150;

    function getMinimapSize() { return minimap.offsetWidth || 150; }

    function resizeMinimapCanvas() {
      const s = getMinimapSize();
      minimapCanvas.width = s * 2;
      minimapCanvas.height = s * 2;
      minimapDirty = true;
    }
    resizeMinimapCanvas();
    window.addEventListener('resize', resizeMinimapCanvas);

    function updateMinimap() {
      if (cZoom <= 1.05) {
        minimap.classList.remove('show');
        return;
      }
      minimap.classList.add('show');
      // Resize canvas when shown (offsetWidth is 0 when display:none at init)
      const expectedCanvasSize = getMinimapSize() * 2;
      if (minimapCanvas.width !== expectedCanvasSize) resizeMinimapCanvas();

      // Update viewport rectangle (always, it's cheap)
      const size = SVG_SIZE / cZoom;
      const vx = (SVG_SIZE - size) / 2 + cPanX;
      const vy = (SVG_SIZE - size) / 2 + cPanY;
      const ms = getMinimapSize();
      const scale = ms / minimapVBSize;
      minimapViewport.style.left = ((vx - minimapVBx) * scale) + 'px';
      minimapViewport.style.top = ((vy - minimapVBy) * scale) + 'px';
      minimapViewport.style.width = (size * scale) + 'px';
      minimapViewport.style.height = (size * scale) + 'px';

      // Re-render thumbnail only when dirty, debounced
      if (minimapDirty && !minimapUpdating) {
        minimapDirty = false;
        minimapUpdating = true;
        // Render minimap using the same tight-fit logic as SVG export
        const renderSize = 400;
        const tightClone = getSvgSource(true);
        const tightVB = tightClone.getAttribute('viewBox').split(' ').map(Number);
        // Add padding so content isn't clipped by the container's border-radius
        const mmPad = tightVB[2] * 0.15;
        minimapVBx = tightVB[0] - mmPad;
        minimapVBy = tightVB[1] - mmPad;
        minimapVBSize = tightVB[2] + mmPad * 2;
        tightClone.setAttribute('viewBox', `${minimapVBx} ${minimapVBy} ${minimapVBSize} ${minimapVBSize}`);
        tightClone.setAttribute('width', String(renderSize));
        tightClone.setAttribute('height', String(renderSize));
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(tightClone);
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image(renderSize, renderSize);
        img.onload = () => {
          const cs = getMinimapSize() * 2;
          minimapCtx.clearRect(0, 0, cs, cs);
          minimapCtx.drawImage(img, 0, 0, renderSize, renderSize, 0, 0, cs, cs);
          URL.revokeObjectURL(url);
          minimapUpdating = false;
        };
        img.onerror = () => { URL.revokeObjectURL(url); minimapUpdating = false; };
        img.src = url;
      }
    }

    // Update viewport on viewBox changes
    const _origApplyViewBox = applyViewBox;
    applyViewBox = function() {
      _origApplyViewBox();
      updateMinimap();
    };

    // Mark thumbnail dirty when SVG content changes
    const _svgObserver = new MutationObserver(() => {
      minimapDirty = true;
      if (cZoom > 1.05) {
        clearTimeout(minimapDebounceTimer);
        minimapDebounceTimer = setTimeout(() => {
          cancelAnimationFrame(minimapRafId);
          minimapRafId = requestAnimationFrame(updateMinimap);
        }, MINIMAP_DEBOUNCE_MS);
      }
    });
    _svgObserver.observe(circSvg, { childList: true, subtree: true });

    // Also update on reset
    const _origResetView = resetView;
    resetView = function() {
      _origResetView();
      updateMinimap();
    };
  })();

  // --- Tips widget ---
  const TIPS = [
    { title: 'Import Files', text: 'Import GenBank (.gb), FASTA (.fa), SnapGene (.dna), or JSON files. Use the New Plasmid dialog or drag and drop a file onto the map.' },
    { title: 'Fetch from Databases', text: 'In the New Plasmid dialog, paste an NCBI accession (e.g. M77789) or AddGene ID (e.g. 50005) to import directly from the database.' },
    { title: 'Keyboard Shortcuts', text: 'PlasmidStudio has keyboard shortcuts for most actions. Click the <strong>info button</strong> (&#9432;) in the toolbar to see the full list.' },
    { title: 'Edit Features Inline', text: 'Click any feature in the sidebar or on the map to expand its edit panel. Change name, color, position, label style, opacity, and borders.' },
    { title: 'Transparent Features', text: 'Set a feature\u2019s opacity to 0% to make it fully transparent. Combine with a visible border to create outline-only features.' },
    { title: 'Context Menus', text: 'Right-click a feature in the sidebar to style all features of that type, or hide/show them at once. Right-click a feature on the map to pin its tooltip. Click the backbone, tick marks, or center text to open their style controls.' },
    { title: 'Multi-Track Rings', text: 'Press <kbd>+</kbd> or <kbd>-</kbd> with a feature selected to move it to outer or inner rings. Click a ring on the map to open its style controls.' },
    { title: 'Label Options', text: 'Labels can follow the arc or stay horizontal. Add leader lines (auto or always) to connect offset labels to their features. Set a wrap width to break long names across lines.' },
    { title: 'Map Rotation', text: 'Use the rotation slider in the Plasmid section or press <kbd>R</kbd> to reset. Rotation is saved per project and included in exports.' },
    { title: 'Restriction Enzyme Finder', text: 'Click "Find Restriction Sites" in the Markers tab to search for enzyme cut sites. Filter by cut count, select enzymes, and they appear as markers on the map.' },
    { title: 'GC Content Track', text: 'Enable the GC content plot in the Plasmid section. It shows a sliding-window GC% curve inside the backbone. Adjust window size and amplitude.' },
    { title: 'Export & Share', text: 'Press <kbd>Ctrl</kbd>+<kbd>S</kbd> or click the Export button. Choose SVG, PNG (1\u20134\u00d7), PDF (with optional feature table), GenBank (.gb), or JSON. Use the share button to generate a compressed link to your map.' },
    { title: 'Themes & Feature Styles', text: 'Click the palette icon to switch between 10 color themes. Use the droplet icon to apply feature style presets that set colors and shapes by type.' },
    { title: 'Marker Customization', text: 'Markers can span all tracks, backbone only, or a custom range of tracks. Set line style (solid, dashed, dotted) and add inner/outer labels.' },
    { title: 'Protein Translation', text: 'Right-click a gene or CDS feature to see its amino acid sequence in the expanded tooltip. Copy the protein, DNA, or reverse complement.' },
    { title: 'Feature Search', text: 'When you have 6 or more features, a filter box appears above the feature list. Type to quickly find features by name.' },

    { title: 'Multiple Projects', text: 'Use tabs at the top to work on up to 10 plasmids. Right-click a tab to duplicate or close it. Drag and drop files to import directly.' },
    { title: 'Minimap', text: 'When zoomed in, a minimap appears in the top-right corner showing your current viewport. Click and drag on it to pan around the map.' },
    { title: 'Install as App', text: 'PlasmidStudio works offline. Install it as a PWA from your browser menu (Chrome: address bar icon, Safari: Share \u2192 Add to Home Screen).' },
  ];

  (function initTips() {
    const card = $('tips-card');
    const titleEl = $('tips-title');
    const textEl = $('tips-text');
    const counterEl = $('tips-counter');
    const prevBtn = $('tips-prev');
    const nextBtn = $('tips-next');
    const dismissBtn = $('tips-dismiss');
    const toggleBtn = $('tips-toggle');
    let tipIdx = 0;

    function showTip(i) {
      tipIdx = Math.max(0, Math.min(TIPS.length - 1, i));
      titleEl.textContent = TIPS[tipIdx].title;
      textEl.innerHTML = TIPS[tipIdx].text;
      counterEl.textContent = (tipIdx + 1) + ' / ' + TIPS.length;
      prevBtn.disabled = tipIdx === 0;
      nextBtn.disabled = tipIdx === TIPS.length - 1;
    }

    // Prevent clicks/mousedowns inside the card from bubbling to the #panel
    // mousedown handler which calls closeAllPopovers()
    card.addEventListener('mousedown', e => e.stopPropagation());
    card.addEventListener('click', e => e.stopPropagation());

    toggleBtn.addEventListener('mousedown', e => e.stopPropagation());
    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = card.classList.contains('open');
      closeAllPopovers();
      if (!isOpen) { card.classList.add('open'); showTip(tipIdx); }
    });
    prevBtn.addEventListener('click', () => showTip(tipIdx - 1));
    nextBtn.addEventListener('click', () => showTip(tipIdx + 1));
    dismissBtn.addEventListener('click', () => card.classList.remove('open'));

    registerDismiss(card, () => card.classList.remove('open'), ['#tips-toggle']);
  })();

  // --- Mobile: panel drawer + toolbar overflow ---
  (function() {
    const MQ = window.matchMedia('(max-width: 768px)');
    const panel = $('panel');
    const overlay = $('panel-overlay');
    const toggle = $('panel-toggle');
    const overflowBtn = $('toolbar-overflow-btn');
    const overflowMenu = $('toolbar-overflow-menu');
    const overflowWrap = document.querySelector('.toolbar-overflow-items');

    function openDrawer() {
      panel.classList.add('drawer-open');
      overlay.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }
    function closeDrawer() {
      panel.classList.remove('drawer-open');
      overlay.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    if (toggle) toggle.addEventListener('click', () => {
      panel.classList.contains('drawer-open') ? closeDrawer() : openDrawer();
    });
    if (overlay) overlay.addEventListener('click', closeDrawer);

    // Close drawer on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('drawer-open')) closeDrawer();
    });

    // Toolbar overflow: move items into dropdown on mobile
    function buildOverflowMenu() {
      if (!overflowWrap || !overflowMenu) return;
      if (MQ.matches) {
        // Clone buttons into overflow menu
        overflowMenu.innerHTML = '';
        overflowWrap.querySelectorAll('.toolbar-btn, .toolbar-divider').forEach(el => {
          const clone = el.cloneNode(true);
          clone.removeAttribute('id');
          if (el.classList.contains('toolbar-btn')) {
            // Clicking clone triggers the original
            clone.addEventListener('click', e => {
              e.stopPropagation();
              overflowMenu.classList.remove('open');
              el.click();
            });
          }
          overflowMenu.appendChild(clone);
        });
      }
    }

    if (overflowBtn) overflowBtn.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = overflowMenu.classList.contains('open');
      closeAllPopovers();
      if (!wasOpen) {
        buildOverflowMenu();
        overflowMenu.classList.add('open');
      }
    });

    // Close overflow on outside click
    document.addEventListener('click', e => {
      if (overflowMenu && !overflowMenu.contains(e.target) && e.target !== overflowBtn) {
        overflowMenu.classList.remove('open');
      }
    });

    // On resize: close drawer if going back to desktop
    MQ.addEventListener('change', e => {
      if (!e.matches) {
        closeDrawer();
        if (overflowMenu) overflowMenu.classList.remove('open');
      }
    });
  })();

  // --- Walkthrough ---
  const WT_KEY = 'ps_walkthrough_done';
  const wtSteps = [
    {
      target: '#panel',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
      title: 'Build your plasmid',
      desc: '<strong>Add</strong> features and markers, edit names and positions, and tweak colors.',
      pos: 'right'
    },
    {
      target: '#map-container',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 8.5 4.8" stroke-linecap="round"/></svg>',
      title: 'Style everything by clicking',
      desc: '<strong>Click</strong> the backbone, rings, or ticks to style them. <strong>Drag</strong> features between rings, or drop a file here to import.',
      pos: 'left'
    },
    {
      target: '#toolbar',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><line x1="6" y1="12" x2="6" y2="12.01"/><line x1="10" y1="12" x2="10" y2="12.01"/><line x1="14" y1="12" x2="14" y2="12.01"/></svg>',
      title: 'Switch views and themes',
      desc: '<strong>Tabs</strong> let you work on multiple plasmids. Toggle <strong>linear view</strong>, apply <strong>themes</strong>, or enable <strong>pan & zoom</strong>.',
      pos: 'below'
    },
    {
      target: '#export-fab',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      title: 'Export your work',
      desc: 'Download as <strong>SVG</strong>, <strong>PNG</strong>, or <strong>PDF</strong>. Check the <strong>info</strong> button in the toolbar for shortcuts and citation.',
      pos: 'above'
    }
  ];
  let wtIdx = -1;

  function startWalkthrough() {
    if (localStorage.getItem(WT_KEY)) return;
    wtIdx = 0;
    const overlay = $('walkthrough-overlay');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    showWtStep();
  }

  function showWtStep() {
    const step = wtSteps[wtIdx];
    const overlay = $('walkthrough-overlay');
    const tooltip = $('wt-tooltip');
    const target = document.querySelector(step.target);
    if (!target) { endWalkthrough(); return; }

    // Update content
    $('wt-icon').innerHTML = step.icon;
    $('wt-title').textContent = step.title;
    $('wt-desc').innerHTML = step.desc;
    $('wt-next').textContent = wtIdx === wtSteps.length - 1 ? 'Done' : 'Next';
    // Dot indicators
    $('wt-dots').innerHTML = wtSteps.map((_, i) =>
      `<span class="wt-dot${i === wtIdx ? ' active' : ''}"></span>`
    ).join('');

    // Position spotlight
    const rect = target.getBoundingClientRect();
    const pad = 8;
    const spot = $('wt-spotlight');
    spot.setAttribute('x', rect.left - pad);
    spot.setAttribute('y', rect.top - pad);
    spot.setAttribute('width', rect.width + pad * 2);
    spot.setAttribute('height', rect.height + pad * 2);

    // Position tooltip
    const tw = 320;
    const th = tooltip.offsetHeight || 160;
    let left, top;
    if (step.pos === 'right') {
      left = rect.right + 16;
      top = rect.top + rect.height / 2 - th / 2;
    } else if (step.pos === 'left') {
      left = rect.left - tw - 16;
      top = rect.top + rect.height / 2 - th / 2;
    } else if (step.pos === 'below') {
      left = rect.left + rect.width / 2 - tw / 2;
      top = rect.bottom + 12;
    } else {
      left = rect.left + rect.width / 2 - tw / 2;
      top = rect.top - th - 12;
    }
    // Clamp to viewport
    left = Math.max(12, Math.min(left, window.innerWidth - tw - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - th - 12));
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.width = tw + 'px';
  }

  function endWalkthrough() {
    wtIdx = -1;
    try { localStorage.setItem(WT_KEY, '1'); } catch(e) {}
    const overlay = $('walkthrough-overlay');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }

  $('wt-next').addEventListener('click', () => {
    if (wtIdx < wtSteps.length - 1) { wtIdx++; showWtStep(); }
    else endWalkthrough();
  });
  $('wt-skip').addEventListener('click', endWalkthrough);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && wtIdx >= 0) endWalkthrough();
  });

  // Trigger walkthrough after first plasmid is created/imported
  let _wtTriggered = false;
  function maybeStartWalkthrough() {
    if (_wtTriggered || localStorage.getItem(WT_KEY)) return;
    _wtTriggered = true;
    // Delay slightly so the UI has rendered
    setTimeout(startWalkthrough, 400);
  }

  // --- Init ---
  function finishInit() {
    renderFeatureList();
    renderMarkerList();
    render();
    updateGcSectionState();
    updateReFinderBtn();
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
    // Re-enable section transitions now that collapsed state is applied
    requestAnimationFrame(() => $panel.classList.remove('no-transitions'));
    const loader = $('app-loader');
    if (loader) {
      loader.classList.add('hidden');
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    }
  }

  // --- Load example from landing page (passed via localStorage) ---
  const _exJson = localStorage.getItem('ps_load_example');
  if (_exJson) {
    localStorage.removeItem('ps_load_example');
    try {
      const _exParsed = JSON.parse(_exJson);
      const name = _exParsed.plasmidName || 'Example';
      loadAllProjects();
      const savedActiveIdx = activeProjectIdx;
      activeProjectIdx = -1;
      if (projects.length >= MAX_TABS) {
        const replaceIdx = Math.max(0, savedActiveIdx);
        activeProjectIdx = replaceIdx;
        restoreState(projects[replaceIdx].state);
        finishInit();
        showConfirm(
          `You have ${MAX_TABS} plasmids open. Replace <strong>${escHtml(projects[replaceIdx].name)}</strong> with <strong>${escHtml(name)}</strong>?`,
          () => {
            projects[replaceIdx].state = _exJson;
            projects[replaceIdx].name = name;
            loadProjectState(replaceIdx);
            saveAllProjects();
          },
          { okLabel: 'Replace', okClass: 'primary', cancelLabel: 'Cancel' }
        );
      } else {
        addProject(_exJson);
        finishInit();
      }
    } catch (e) {
      console.warn('Failed to load example:', e);
      loadState();
      finishInit();
    }
  } else {

  // --- Load shared state from URL hash ---
  const _hash = location.hash.slice(1);
  if (_hash && (_hash.startsWith('z:') || _hash.startsWith('r:'))) {
    decompressState(_hash).then(json => {
      let parsed = JSON.parse(json);
      // Detect compact format (has 'f' key for features instead of 'features')
      if (parsed.f && !parsed.features) {
        parsed = expandSharedState(parsed);
        json = JSON.stringify(parsed);
      }
      // Load existing projects without triggering empty-state modal.
      // Save the active index from localStorage, then set to -1 so
      // addProject won't save uninitialized live state over a project.
      loadAllProjects();
      const savedActiveIdx = activeProjectIdx;
      activeProjectIdx = -1;
      if (projects.length >= MAX_TABS) {
        // At tab limit - offer to replace the last-active tab
        const replaceIdx = Math.max(0, savedActiveIdx);
        activeProjectIdx = replaceIdx;
        restoreState(projects[replaceIdx].state);
        finishInit();
        const sharedName = JSON.parse(json).plasmidName || 'Shared plasmid';
        showConfirm(
          `You have ${MAX_TABS} plasmids open. Replace <strong>${escHtml(projects[replaceIdx].name)}</strong> with <strong>${escHtml(sharedName)}</strong>?`,
          () => {
            projects[replaceIdx].state = json;
            projects[replaceIdx].name = sharedName;
            loadProjectState(replaceIdx);
            saveAllProjects();
            showToast('Loaded shared plasmid', 'success');
          },
          { okLabel: 'Replace', okClass: 'primary', cancelLabel: 'Cancel' }
        );
      } else {
        addProject(json); // add shared plasmid as new tab
        showToast('Loaded shared plasmid', 'success');
        finishInit();
      }
      history.replaceState(null, '', location.pathname + location.search);
    }).catch(e => {
      console.warn('Failed to load from URL hash:', e);
      loadState();
      finishInit();
    });
  } else {
    loadState();
    finishInit();
  }
  } // end else (no example to load)
})();
