  // Nav scroll
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => { nav.classList.toggle('scrolled', window.scrollY > 40); });

  // Scroll reveal
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  // Tiles hover grid generator
  function generateTiles(container, parentSection) {
    if (!container) return;
    const tileSize = 36;
    const rect = container.getBoundingClientRect();
    const cols = Math.ceil(rect.width / tileSize) + 1;
    const rows = Math.ceil(rect.height / tileSize) + 1;
    const grid = [];
    const frag = document.createDocumentFragment();
    for (let c = 0; c < cols; c++) {
      const col = document.createElement('div');
      col.className = 'tiles-col';
      const colCells = [];
      for (let r = 0; r < rows; r++) {
        const cell = document.createElement('div');
        cell.className = 'tiles-cell';
        col.appendChild(cell);
        colCells.push(cell);
      }
      frag.appendChild(col);
      grid.push(colCells);
    }
    container.appendChild(frag);

    // Mousemove on parent lights up tiles without blocking clicks
    const target = parentSection || container.parentElement;
    target.addEventListener('mousemove', (e) => {
      const wrapRect = container.getBoundingClientRect();
      const x = e.clientX - wrapRect.left;
      const y = e.clientY - wrapRect.top;
      const ci = Math.floor(x / tileSize);
      const ri = Math.floor(y / tileSize);
      if (ci >= 0 && ci < grid.length && ri >= 0 && ri < grid[ci].length) {
        const cell = grid[ci][ri];
        cell.classList.add('lit');
        setTimeout(() => cell.classList.remove('lit'), 50);
      }
    });
  }
  generateTiles(document.getElementById('hero-tiles'), document.getElementById('hero'));

  // ── Blueprint Gradient Mesh (panel backgrounds) ──────────────
  (function() {
    const CELL = 48;
    const SPEED = 0.12;
    const GRID_COLOR   = 'rgba(126,207,255,0.07)';
    const GRID_ACCENT  = 'rgba(126,207,255,0.14)';
    const HOVER_FILL   = 'rgba(126,207,255,0.09)';
    const HOVER_STROKE = 'rgba(126,207,255,0.35)';
    const HOVER_GLOW   = 12;

    let rafId = null;
    let offset = 0;
    let activeWrap = null;
    let gridCanvas = null, gridCtx = null;
    let hoverCanvas = null, hoverCtx = null;
    let hoverCell = { ci: -1, ri: -1 };

    function drawGrid(w, h) {
      gridCtx.clearRect(0, 0, w, h);
      const o = offset % CELL;
      gridCtx.strokeStyle = GRID_COLOR;
      gridCtx.lineWidth = 0.5;
      for (let x = -CELL + o; x < w + CELL; x += CELL) {
        gridCtx.beginPath();
        gridCtx.moveTo(Math.round(x) + 0.5, 0);
        gridCtx.lineTo(Math.round(x) + 0.5, h);
        gridCtx.stroke();
      }
      for (let y = -CELL + o; y < h + CELL; y += CELL) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, Math.round(y) + 0.5);
        gridCtx.lineTo(w, Math.round(y) + 0.5);
        gridCtx.stroke();
      }
    }

    function drawHover(w, h) {
      hoverCtx.clearRect(0, 0, w, h);
      const { ci, ri } = hoverCell;
      if (ci < 0 || ri < 0) return;
      const o = offset % CELL;
      const x = ci * CELL - CELL + o;
      const y = ri * CELL - CELL + o;
      hoverCtx.save();
      hoverCtx.shadowBlur  = HOVER_GLOW;
      hoverCtx.shadowColor = 'rgba(126,207,255,0.4)';
      hoverCtx.fillStyle   = HOVER_FILL;
      hoverCtx.fillRect(x, y, CELL, CELL);
      hoverCtx.restore();
      hoverCtx.strokeStyle = HOVER_STROKE;
      hoverCtx.lineWidth   = 1;
      hoverCtx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    }

    function tick() {
      if (!activeWrap) return;
      offset += SPEED;
      const w = gridCanvas.width / (window.devicePixelRatio || 1);
      const h = gridCanvas.height / (window.devicePixelRatio || 1);
      drawGrid(w, h);
      drawHover(w, h);
      rafId = requestAnimationFrame(tick);
    }

    function makeCanvas(wrap, w, h, dpr) {
      const c = document.createElement('canvas');
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      wrap.appendChild(c);
      return { canvas: c, ctx: ctx };
    }

    function startMesh(wrap) {
      if (activeWrap === wrap) return;
      stopMesh();
      activeWrap = wrap;
      const w = wrap.clientWidth || window.innerWidth;
      const h = wrap.clientHeight || window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      const g = makeCanvas(wrap, w, h, dpr);
      gridCanvas = g.canvas; gridCtx = g.ctx;
      const hv = makeCanvas(wrap, w, h, dpr);
      hoverCanvas = hv.canvas; hoverCtx = hv.ctx;

      const panel = wrap.parentElement;
      panel._meshMove = function(e) {
        if (e.target.closest('.svc-card, .bp-pat, .pricing-table, .pricing-tabs, .printing-subnav, button, a, input, textarea')) {
          hoverCell.ci = -1; hoverCell.ri = -1; return;
        }
        const rect = wrap.getBoundingClientRect();
        const o = offset % CELL;
        const mx = e.clientX - rect.left - o + CELL;
        const my = e.clientY - rect.top - o + CELL;
        hoverCell.ci = Math.floor(mx / CELL);
        hoverCell.ri = Math.floor(my / CELL);
      };
      panel._meshLeave = function() { hoverCell.ci = -1; hoverCell.ri = -1; };
      panel.addEventListener('mousemove', panel._meshMove);
      panel.addEventListener('mouseleave', panel._meshLeave);
      rafId = requestAnimationFrame(tick);
    }

    function stopMesh() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (activeWrap) {
        const panel = activeWrap.parentElement;
        if (panel && panel._meshMove) panel.removeEventListener('mousemove', panel._meshMove);
        if (panel && panel._meshLeave) panel.removeEventListener('mouseleave', panel._meshLeave);
        if (gridCanvas && gridCanvas.parentNode) gridCanvas.parentNode.removeChild(gridCanvas);
        if (hoverCanvas && hoverCanvas.parentNode) hoverCanvas.parentNode.removeChild(hoverCanvas);
      }
      activeWrap = gridCanvas = gridCtx = hoverCanvas = hoverCtx = null;
      hoverCell = { ci: -1, ri: -1 };
    }

    window._meshStart = startMesh;
    window._meshStop  = stopMesh;
  })();

  // Project detail panels
  function openProject(id) {
    const proj = document.getElementById(id);
    proj.classList.add('open');
    const back = proj.querySelector('.project-back');
    if (back) back.classList.add('visible');
    proj.scrollTop = 0;
    // Router: push URL
    if (!_routerSuppressPush && typeof PROJECT_ID_TO_URL !== 'undefined') {
      var url = PROJECT_ID_TO_URL[id];
      if (url) history.pushState(null, '', url);
    }
  }
  function closeProject(btn) {
    const proj = btn.closest('.project-panel');
    proj.classList.remove('open');
    btn.classList.remove('visible');
    // Router: push back to /Work
    if (!_routerSuppressPush && typeof PROJECT_ID_TO_URL !== 'undefined') {
      history.pushState(null, '', '/Work');
    }
  }

  // Printing sub-navigation
  var printingNavItems = [
    { label: 'Stickers & Decals', panelId: 'panel-stickers' },
    { label: 'Labels & Packaging', panelId: 'panel-packaging' },
    { label: 'Banners & Signs', panelId: 'panel-signs' },
    { label: 'Large Format', panelId: 'panel-largeformat' }
  ];
  var printingPanelIds = printingNavItems.map(function(i) { return i.panelId; });

  function renderPrintingSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Proj. Index</div>';
    var items = printingNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < printingNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      var href = (typeof PANEL_ID_TO_URL !== 'undefined' && PANEL_ID_TO_URL[item.panelId]) || '#';
      return '<a class="' + cls + '" href="' + href + '" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }

  function injectPrintingSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderPrintingSubnav(panelId);
  }

  // Apparel sub-navigation (reuses printing-subnav styles)
  var apparelNavItems = [
    { label: 'DTG', panelId: 'panel-dtg' },
    { label: 'DTF', panelId: 'panel-dtf' },
    { label: 'Screen Printing', panelId: 'panel-screenprint' },
    { label: 'Embroidery', panelId: 'panel-embroidery' }
  ];
  var apparelPanelIds = apparelNavItems.map(function(i) { return i.panelId; });

  function renderApparelSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Apparel</div>';
    var items = apparelNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < apparelNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      var href = (typeof PANEL_ID_TO_URL !== 'undefined' && PANEL_ID_TO_URL[item.panelId]) || '#';
      return '<a class="' + cls + '" href="' + href + '" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Methods</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }

  function injectApparelSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderApparelSubnav(panelId);
  }

  // Service modal popup
  var SVC_DATA = {
    'printing': {
      anno: 'SPEC \u00b7 P1',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="9" y="4" width="16" height="10" rx="1.5"/><rect x="4" y="14" width="26" height="10" rx="2.5"/><path d="M9 24v6h16v-6"/><circle cx="24" cy="19" r="1.5"/></svg>',
      title: 'Printing',
      desc: 'Full-service printing from stickers to large format. We handle every surface and scale — from custom decals to event-sized banners.',
      links: [
        { label: 'Stickers & Decals', panel: 'panel-stickers' },
        { label: 'Labels & Packaging', panel: 'panel-packaging' },
        { label: 'Banners & Signs', panel: 'panel-signs' },
        { label: 'Large Format Graphics', panel: 'panel-largeformat' }
      ]
    },
    'apparel': {
      anno: 'SPEC \u00b7 P2',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><path d="M10.3 4L3 11l5.5 2V30h17V13L31 11l-7.3-7H20a4.2 4.2 0 01-8.4 0H10.3z"/></svg>',
      title: 'Apparel',
      desc: 'Custom garments using premium printing methods. From single prototypes to bulk runs — we bring your designs to fabric.',
      links: [
        { label: 'Direct to Garment (DTG)', panel: 'panel-dtg' },
        { label: 'Direct to Film (DTF)', panel: 'panel-dtf' },
        { label: 'Screen Printing', panel: 'panel-screenprint' },
        { label: 'Embroidery', panel: 'panel-embroidery' }
      ]
    },
    'brand-strategy': {
      anno: 'SPEC \u00b7 01',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><circle cx="17" cy="17" r="14"/><line x1="17" y1="3" x2="17" y2="31"/><line x1="3" y1="17" x2="31" y2="17"/><path d="M6 8 Q17 14 28 8" fill="none"/><path d="M6 26 Q17 20 28 26" fill="none"/></svg>',
      title: 'Brand Strategy',
      desc: 'Strategic direction and market positioning that sets you apart. We define your competitive edge and build a roadmap for growth.',
      links: [
        { label: 'Research & Analysis', panel: 'panel-bs-research' },
        { label: 'Positioning', panel: 'panel-bs-positioning' },
        { label: 'Architecture', panel: 'panel-bs-architecture' },
        { label: 'Direction', panel: 'panel-bs-direction' }
      ]
    },
    'brand-identity': {
      anno: 'SPEC \u00b7 02',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="2" width="12" height="12" rx="2"/><rect x="20" y="2" width="12" height="12" rx="2"/><rect x="11" y="11" width="12" height="12" rx="2"/><rect x="20" y="20" width="12" height="12" rx="2"/></svg>',
      title: 'Brand Identity',
      desc: 'Visual identity systems and brand guidelines built to last. Logo, typography, color systems — the complete brand toolkit.',
      links: [
        { label: 'Logo & Marks', panel: 'panel-bi-logos' },
        { label: 'Systems & Guidelines', panel: 'panel-bi-systems' },
        { label: 'Collateral', panel: 'panel-bi-collateral' },
        { label: 'Applied Identity', panel: 'panel-bi-applied' }
      ]
    },
    'graphic-design': {
      anno: 'SPEC \u00b7 03',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="3" width="28" height="28" rx="2"/><line x1="3" y1="12" x2="31" y2="12"/><line x1="14" y1="12" x2="14" y2="31"/><rect x="17" y="16" width="10" height="8" rx="1"/></svg>',
      title: 'Graphic Design',
      desc: 'Custom graphics and visual assets tailored to your brand voice. From print collateral to digital campaigns.',
      links: [
        { label: 'Print & Editorial', panel: 'panel-gd-print' },
        { label: 'Digital & Social', panel: 'panel-gd-digital' },
        { label: 'Illustration & Art', panel: 'panel-gd-illustration' },
        { label: 'Product & Merch', panel: 'panel-gd-product' }
      ]
    },
    'layout-design': {
      anno: 'SPEC \u00b7 04',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="5" y="3" width="24" height="28" rx="2"/><line x1="10" y1="10" x2="24" y2="10"/><line x1="10" y1="15" x2="24" y2="15"/><line x1="10" y1="20" x2="18" y2="20"/><rect x="17" y="23" width="11" height="7" rx="1"/></svg>',
      title: 'Layout Design',
      desc: 'Pixel-perfect layouts for business cards, brochures, flyers, posters, and all print collateral.',
      links: [
        { label: 'Marketing', panel: 'panel-ld-marketing' },
        { label: 'Publications', panel: 'panel-ld-publications' },
        { label: 'Reports', panel: 'panel-ld-reports' },
        { label: 'Business', panel: 'panel-ld-business' }
      ]
    },
    'mockups': {
      anno: 'SPEC \u00b7 05',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="4" y="4" width="26" height="18" rx="2"/><rect x="7" y="7" width="20" height="12" rx="1" stroke-dasharray="3 2"/><line x1="10" y1="26" x2="24" y2="26"/><line x1="12" y1="29" x2="22" y2="29"/></svg>',
      title: 'Mockups',
      desc: 'Realistic product and presentation mockups that bring your designs to life before production begins.',
      links: [
        { label: 'Apparel & Accessories', panel: 'panel-mu-apparel' },
        { label: 'Print & Packaging', panel: 'panel-mu-print' },
        { label: 'Signage & Display', panel: 'panel-mu-signage' },
        { label: 'Digital', panel: 'panel-mu-digital' }
      ]
    },
    'web-design': {
      anno: 'SPEC \u00b7 06',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="6" width="30" height="22" rx="3"/><line x1="2" y1="12" x2="32" y2="12"/><circle cx="7" cy="9" r="1.5" fill="var(--bp-cyan)"/><circle cx="12" cy="9" r="1.5" fill="var(--bp-cyan)"/><rect x="6" y="16" width="10" height="7" rx="1"/><line x1="19" y1="18" x2="27" y2="18"/><line x1="19" y1="22" x2="25" y2="22"/></svg>',
      title: 'Web Design',
      desc: 'Custom websites designed for conversion and built to your brand. Landing pages, full sites, and e-commerce.',
      links: [
        { label: 'Sites', panel: 'panel-wd-sites' },
        { label: 'Applications', panel: 'panel-wd-apps' },
        { label: 'UX & Prototyping', panel: 'panel-wd-ux' },
        { label: 'Polish', panel: 'panel-wd-polish' }
      ]
    },
    'photography': {
      anno: 'SPEC \u00b7 07',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="5" width="28" height="24" rx="3"/><circle cx="12" cy="14" r="3"/><polyline points="3,25 10,18 16,22 22,15 31,22"/></svg>',
      title: 'Photography',
      desc: 'Professional photo services — product photography, brand shoots, headshots, and event coverage.',
      links: [
        { label: 'Product & Commercial', panel: 'panel-ph-product' },
        { label: 'People & Events', panel: 'panel-ph-people' },
        { label: 'Post-Production', panel: 'panel-ph-post' },
        { label: 'Creative & Specialty', panel: 'panel-ph-creative' }
      ]
    },
    'video-production': {
      anno: 'SPEC \u00b7 08',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="6" width="28" height="22" rx="3"/><polygon points="14,12 14,26 26,19" fill="none"/></svg>',
      title: 'Video Production',
      desc: 'Motion content that captures attention — brand films, social reels, promo videos, and motion graphics.',
      links: [
        { label: 'Promo & Brand', panel: 'panel-vp-promo' },
        { label: 'Social & Digital', panel: 'panel-vp-social' },
        { label: 'Event & Live', panel: 'panel-vp-events' },
        { label: 'Post-Production', panel: 'panel-vp-post' }
      ]
    },
    'events': {
      anno: 'SPEC \u00b7 P3',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><path d="M5 28 L17 6 L29 28 Z"/><line x1="9" y1="22" x2="25" y2="22"/><line x1="17" y1="6" x2="17" y2="22"/><circle cx="17" cy="15" r="2"/></svg>',
      title: 'Event Graphics',
      desc: 'Booth displays, backdrops, banners, and branded event materials for any occasion.',
      links: [
        { label: 'Booth Graphics', panel: 'panel-events' },
        { label: 'Pop-Up Displays', panel: 'panel-events' },
        { label: 'Backdrops & Step-and-Repeats', panel: 'panel-events' },
        { label: 'Table Covers', panel: 'panel-events' },
        { label: 'Event Flags & Tents', panel: 'panel-events' },
        { label: 'Directional Signs', panel: 'panel-events' }
      ]
    },
    'marketing': {
      anno: 'SPEC \u00b7 P4',
      icon: '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="var(--bp-cyan)" stroke-width="1.4" stroke-linecap="round"><rect x="4" y="6" width="18" height="22" rx="2"/><line x1="8" y1="12" x2="18" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/><line x1="8" y1="20" x2="14" y2="20"/><path d="M22 14 L30 10 V24 L22 20 Z"/></svg>',
      title: 'Marketing',
      desc: 'Business cards, brochures, flyers, and print collateral that drive results.',
      links: [
        { label: 'Business Cards', panel: 'panel-marketing' },
        { label: 'Brochures & Flyers', panel: 'panel-marketing' },
        { label: 'Postcards', panel: 'panel-marketing' },
        { label: 'Catalogs', panel: 'panel-marketing' },
        { label: 'Folders & Envelopes', panel: 'panel-marketing' },
        { label: 'Promotional Items', panel: 'panel-marketing' }
      ]
    }
  };

  // ── Service Tab & Expand System ──
  var activeSvcTab = 'print';
  var CAT_LABELS = {
    print: 'PRINT & PRODUCTION',
    brand: 'BRAND STRUCTURE',
    creative: 'CREATIVE AGENCY'
  };
  var CAT_SHEETS = {
    print: '02-A',
    brand: '02-B',
    creative: '02-C'
  };

  function switchSvcTab(cat) {
    if (cat === activeSvcTab) return;
    // Collapse any expanded card first
    collapseServiceCards();
    activeSvcTab = cat;
    // Update tab buttons
    document.querySelectorAll('.svc-tab').forEach(function(tab) {
      tab.classList.toggle('active', tab.dataset.cat === cat);
    });
    // Update grid visibility with animation
    document.querySelectorAll('.svc-tab-grid').forEach(function(grid) {
      if (grid.dataset.cat === cat) {
        grid.style.display = 'grid';
        // Re-trigger animation
        grid.style.animation = 'none';
        grid.offsetHeight; // force reflow
        grid.style.animation = '';
      } else {
        grid.style.display = 'none';
      }
    });
    // Update category annotation
    var anno = document.getElementById('svc-cat-anno');
    if (anno) {
      var dt = anno.querySelector('.dt');
      if (dt) dt.textContent = CAT_LABELS[cat] + ' \u2014 4 SPECIFICATIONS';
    }
    // Update sheet label
    var label = document.querySelector('#panel-services .sheet-label');
    if (label) label.innerHTML = 'SHEET ' + CAT_SHEETS[cat] + ' / 05 &mdash; SERVICES';
  }

  function expandServiceCard(card, key) {
    var data = SVC_DATA[key];
    if (!data) return;
    var grid = card.closest('.svc-tab-grid');
    if (!grid) return;

    // If this card is already expanded, collapse
    if (card.classList.contains('svc-selected')) {
      collapseServiceCards();
      return;
    }

    // Collapse any previously expanded
    collapseServiceCards();

    // Mark the grid as expanded
    grid.classList.add('svc-expanded');
    card.classList.add('svc-selected');

    // Populate sub-links
    var sublinksEl = grid.querySelector('.svc-sublinks');
    if (!sublinksEl) return;

    var headerHtml = '<div class="svc-sublinks-header">' + data.anno + ' \u2014 SUB-SPECIFICATIONS</div>';
    var linksHtml = data.links.map(function(l) {
      var onclick = l.panel
        ? 'event.preventDefault();event.stopPropagation();openPanel(\'' + l.panel + '\');return false;'
        : 'event.preventDefault();return false;';
      return '<a href="#" class="svc-expand-link" onclick="' + onclick + '">' +
        '<span>' + l.label + '</span></a>';
    }).join('');
    var backHtml = '<button class="svc-sublinks-back" onclick="event.stopPropagation();collapseServiceCards()">&larr; BACK TO ALL</button>';

    sublinksEl.innerHTML = headerHtml + linksHtml + backHtml;
  }

  function collapseServiceCards() {
    document.querySelectorAll('.svc-tab-grid.svc-expanded').forEach(function(grid) {
      grid.classList.remove('svc-expanded');
      var sublinks = grid.querySelector('.svc-sublinks');
      if (sublinks) sublinks.innerHTML = '';
    });
    document.querySelectorAll('.svc-card.svc-selected').forEach(function(card) {
      card.classList.remove('svc-selected');
    });
  }

  // Escape key collapses expanded cards
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') collapseServiceCards();
  });

  // Panel system
  function openPanel(id) {
    document.querySelectorAll('.page-panel.open').forEach(p => p.classList.remove('open'));
    const panel = document.getElementById(id);
    panel.classList.add('open');
    panel.scrollTop = 0;
    document.body.classList.add('panel-open');
    // Auto-collapse expanded service cards when returning to services panel
    if (id === 'panel-services') collapseServiceCards();
    var meshWrap = panel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    // Inject printing subnav if this is a printing panel
    if (printingPanelIds.indexOf(id) !== -1) injectPrintingSubnav(id);
    // Inject apparel subnav if this is an apparel panel
    if (apparelPanelIds.indexOf(id) !== -1) injectApparelSubnav(id);
    // Inject service category subnavs
    if (bsPanelIds.indexOf(id) !== -1) injectBSSubnav(id);
    if (biPanelIds.indexOf(id) !== -1) injectBISubnav(id);
    if (gdPanelIds.indexOf(id) !== -1) injectGDSubnav(id);
    if (ldPanelIds.indexOf(id) !== -1) injectLDSubnav(id);
    if (muPanelIds.indexOf(id) !== -1) injectMUSubnav(id);
    if (wdPanelIds.indexOf(id) !== -1) injectWDSubnav(id);
    if (phPanelIds.indexOf(id) !== -1) injectPhSubnav(id);
    if (vpPanelIds.indexOf(id) !== -1) injectVpSubnav(id);
    // delay logo swap until panel has nearly finished sliding up (transition = 0.58s)
    setTimeout(() => {
      document.getElementById('logo-dark').style.display  = 'none';
      document.getElementById('logo-white').style.display = 'block';
      document.getElementById('site-logo').style.cursor   = 'pointer';
    }, 500);
    // Router: push URL
    if (!_routerSuppressPush && typeof PANEL_ID_TO_URL !== 'undefined') {
      var url = PANEL_ID_TO_URL[id];
      if (url) history.pushState(null, '', url);
    }
  }
  function closePanel(btn) {
    const panel = btn ? btn.closest('.page-panel') : document.querySelector('.page-panel.open');
    if (!panel) return;
    panel.classList.remove('open');
    document.body.classList.remove('panel-open');
    if (window._meshStop) window._meshStop();
    // revert logo → dark, non-clickable
    document.getElementById('logo-dark').style.display  = 'block';
    document.getElementById('logo-white').style.display = 'none';
    document.getElementById('site-logo').style.cursor   = 'default';
    // Router: push back to /
    if (!_routerSuppressPush && typeof PANEL_ID_TO_URL !== 'undefined') {
      history.pushState(null, '', '/');
    }
  }
  function logoClick() {
    if (document.querySelector('.page-panel.open')) {
      closeAllPanels();
      history.pushState(null, '', '/');
    }
  }

  // Dropdown toggle
  var ddBackdrop = document.getElementById('dropdown-backdrop');
  function toggleDropdown(e) {
    e.preventDefault();
    var dd = e.target.closest('.nav-dropdown');
    if (!dd) return;
    var wasOpen = dd.classList.contains('open');
    // Close all dropdowns first
    document.querySelectorAll('.nav-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
    if (!wasOpen) dd.classList.add('open');
    ddBackdrop.classList.toggle('active', !wasOpen);
  }
  function closeDropdown() {
    document.querySelectorAll('.nav-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
    ddBackdrop.classList.remove('active');
  }
  // Close dropdown when clicking outside or on backdrop
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) closeDropdown();
  });
  ddBackdrop.addEventListener('click', closeDropdown);
  // Close dropdown when a dropdown item is clicked
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', closeDropdown);
  });

  // Mobile nav
  const ham = document.getElementById('ham');
  const mNav = document.getElementById('mobile-nav');
  let open = false;
  function closeNav() {
    open = false; mNav.classList.remove('open');
    ham.classList.remove('open');
    document.getElementById('h1').style.transform = '';
    document.getElementById('h2').style.opacity = '1';
    document.getElementById('h3').style.transform = '';
  }
  ham.addEventListener('click', () => {
    open = !open;
    mNav.classList.toggle('open', open);
    ham.classList.toggle('open', open);
    document.getElementById('h1').style.transform = open ? 'translateY(7px) rotate(45deg)' : '';
    document.getElementById('h2').style.opacity = open ? '0' : '1';
    document.getElementById('h3').style.transform = open ? 'translateY(-7px) rotate(-45deg)' : '';
  });

  // ── Hero Typewriter Effect ──
  (function() {
    var el = document.getElementById('hero-typewriter');
    if (!el) return;
    var words = ['Blueprint.', 'Vision.', 'Structure.', 'Design.', 'Strategy.', 'Direction.'];
    var wordIndex = 0;
    var charIndex = 0;
    var isDeleting = false;
    var typeSpeed = 70;
    var deleteSpeed = 40;
    var waitTime = 2000;
    function tick() {
      var current = words[wordIndex];
      if (!isDeleting) {
        charIndex++;
        el.textContent = current.substring(0, charIndex);
        if (charIndex === current.length) {
          setTimeout(function() { isDeleting = true; tick(); }, waitTime);
          return;
        }
        setTimeout(tick, typeSpeed);
      } else {
        charIndex--;
        el.textContent = current.substring(0, charIndex);
        if (charIndex === 0) {
          isDeleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          setTimeout(tick, 400);
          return;
        }
        setTimeout(tick, deleteSpeed);
      }
    }
    setTimeout(tick, 1000);
  })();

  // ── Sticker Category Data ──
  var stickerData = {
    'die-cut': {
      name: 'Die-Cut Stickers',
      patternId: 'pat-diecut',
      image: '/brand_assets/DieCut.png',
      description: 'Custom die-cut stickers are precision cut to match any shape you need. Whether it\'s a logo, mascot, or custom illustration, each sticker is cut exactly to the outline of your design for a clean, professional look.',
      features: ['Cut to any custom shape or silhouette', 'Premium white or clear vinyl options', 'Weatherproof and UV-resistant laminate', 'Minimum order: 50 pieces'],
      sizes: ['2×2 in', '3×3 in', '4×4 in', '5×5 in', 'Custom']
    },
    'rounded-corner': {
      name: 'Rounded Corner Stickers',
      patternId: 'pat-rounded',
      image: '/brand_assets/Rounded.png',
      description: 'Rounded corner stickers offer a polished, professional appearance with smooth edges. Perfect for product labels, packaging seals, and brand stickers that need a refined finish.',
      features: ['Smooth rounded corners prevent peeling', 'Available in matte or glossy finish', 'Indoor and outdoor durable', 'Great for product labeling'],
      sizes: ['2×2 in', '3×3 in', '4×6 in', 'Custom']
    },
    'kiss-cut': {
      name: 'Kiss Cut Stickers',
      patternId: 'pat-kisscut',
      image: '/brand_assets/KissCut.png',
      description: 'Kiss-cut stickers are cut through the vinyl but not the backing paper, making them easy to peel and apply. Ideal for giveaways, packaging inserts, and retail-ready products.',
      features: ['Easy peel-and-stick from backing', 'Perfect for handouts and giveaways', 'Can include multiple stickers per sheet', 'Clean, professional presentation'],
      sizes: ['2×2 in', '3×3 in', '4×4 in', 'Custom']
    },
    'decal': {
      name: 'Decal Stickers',
      patternId: 'pat-decal',
      image: '/brand_assets/Decals.png',
      description: 'Custom decals are designed for surface application — walls, vehicles, windows, and more. Made from premium vinyl that adheres cleanly and removes without residue.',
      features: ['Surface-mount application', 'Removable without residue', 'Vehicle and wall-safe adhesive', 'Available in reflective and standard'],
      sizes: ['4×4 in', '6×6 in', '8×8 in', '12×12 in', 'Custom']
    },
    'oval': {
      name: 'Oval Stickers',
      patternId: 'pat-oval',
      image: '/brand_assets/Oval.png',
      description: 'Classic oval-shaped stickers are perfect for product labels, wine bottles, candle jars, and any branding that benefits from a traditional, elegant shape.',
      features: ['Classic oval shape for labels', 'Ideal for bottles and jars', 'Available in foil and standard', 'High-resolution full-color print'],
      sizes: ['2×3 in', '3×4 in', '4×6 in', 'Custom']
    },
    'circle': {
      name: 'Circle Stickers',
      patternId: 'pat-circle',
      image: '/brand_assets/Circle.png',
      description: 'Round stickers are one of the most versatile shapes available. Great for logos, seals, envelope closures, and product packaging with a clean, symmetrical look.',
      features: ['Perfect round cut for logos', 'Envelope seals and packaging', 'Matte, glossy, or holographic finish', 'Full bleed edge-to-edge printing'],
      sizes: ['1.5 in', '2 in', '3 in', '4 in', 'Custom']
    },
    'rectangular': {
      name: 'Rectangular Stickers',
      patternId: 'pat-rect',
      image: '/brand_assets/Rect.png',
      description: 'Standard rectangular stickers are the go-to shape for address labels, product info, barcodes, and any design that works best in a horizontal or vertical format.',
      features: ['Standard rectangle with sharp corners', 'Ideal for barcodes and info labels', 'Available in any custom ratio', 'Bulk pricing available'],
      sizes: ['2×4 in', '3×5 in', '4×6 in', 'Custom']
    },
    'square': {
      name: 'Square Stickers',
      patternId: 'pat-square',
      image: '/brand_assets/Square.png',
      description: 'Square stickers provide equal-sided versatility for logos, QR codes, icons, and social media handles. Clean geometry that works for any brand.',
      features: ['Equal-sided, versatile shape', 'Perfect for QR codes and logos', 'Sharp or rounded corner options', 'High-tack adhesive available'],
      sizes: ['2×2 in', '3×3 in', '4×4 in', '5×5 in', 'Custom']
    },
    'bumper': {
      name: 'Bumper Stickers',
      patternId: 'pat-bumper',
      image: '/brand_assets/Bumper.png',
      description: 'Heavy-duty bumper stickers built to withstand outdoor weather, car washes, and UV exposure. Made from thick vinyl with weather-resistant laminate.',
      features: ['Weather-resistant outdoor vinyl', 'UV-protected against fading', 'Strong adhesive for vehicles', 'Standard bumper sticker sizing'],
      sizes: ['3×10 in', '3×11.5 in', '4×8 in', 'Custom']
    },
    'clear': {
      name: 'Clear Stickers',
      patternId: 'pat-clear',
      image: '/brand_assets/Clear.png',
      description: 'Transparent stickers blend seamlessly into any surface, showing only your design. Perfect for glass, packaging, and creating a "painted on" look.',
      features: ['Transparent vinyl backing', 'Seamless surface integration', 'Great for glass and packaging', 'White ink option for light designs'],
      sizes: ['2×2 in', '3×3 in', '4×4 in', 'Custom']
    },
    'transfer': {
      name: 'Transfer Stickers',
      image: '/brand_assets/Transfer.png',
      patternId: 'pat-transfer',
      description: 'Transfer stickers use an application tape to precisely place multi-piece designs. Apply the design, peel the tape, and leave only the sticker behind.',
      features: ['Application tape for precise placement', 'Multi-piece design support', 'Ideal for vehicle and window graphics', 'Professional installation result'],
      sizes: ['4×4 in', '6×6 in', '8×8 in', '12×12 in', 'Custom']
    },
    'vinyl': {
      name: 'Vinyl Lettering',
      image: '/brand_assets/Robot.png',
      patternId: 'pat-vinyl',
      description: 'Custom vinyl lettering is individually cut from solid colored vinyl. No background — just the letters and shapes themselves. Perfect for storefronts, vehicles, and signage.',
      features: ['Individual cut letters and shapes', 'No background or backing visible', 'Durable outdoor vinyl material', 'Wide range of colors and fonts'],
      sizes: ['1 in tall', '2 in tall', '4 in tall', '6 in tall', 'Custom']
    },
    'window': {
      name: 'Window Clings',
      patternId: 'pat-window',
      description: 'Static cling stickers adhere to glass using static electricity — no adhesive needed. Easy to apply, reposition, and remove without leaving any residue.',
      features: ['No adhesive — static cling only', 'Repositionable and reusable', 'Zero residue on removal', 'Front or back application'],
      sizes: ['4×4 in', '6×6 in', '8×10 in', 'Custom']
    },
    'front-adhesive': {
      name: 'Front Adhesive Stickers',
      patternId: 'pat-frontadh',
      description: 'Front adhesive stickers are designed to be applied on the inside of glass and viewed from outside. The adhesive is on the printed side, keeping the design protected.',
      features: ['Inside-glass application', 'Design visible from outside', 'Protected from weather and scratching', 'Ideal for storefront windows'],
      sizes: ['4×4 in', '6×6 in', '8×10 in', 'Custom']
    },
    'holographic': {
      name: 'Holographic Stickers',
      patternId: 'pat-holo',
      description: 'Holographic stickers feature a prismatic rainbow finish that shifts color with the light. Eye-catching and premium, perfect for brands that want to stand out.',
      features: ['Prismatic rainbow shimmer effect', 'Premium, eye-catching finish', 'Die-cut or kiss-cut options', 'Great for limited edition products'],
      sizes: ['2×2 in', '3×3 in', '4×4 in', 'Custom']
    },
    'glitter': {
      name: 'Glitter Stickers',
      patternId: 'pat-glitter',
      description: 'Glitter stickers add sparkle and texture to any design. The glitter finish catches light and adds a tactile, premium feel without the mess of real glitter.',
      features: ['Sparkle texture finish', 'No-mess glitter effect', 'Available in multiple glitter colors', 'Durable laminate coating'],
      sizes: ['2×2 in', '3×3 in', '4×4 in', 'Custom']
    },
    'fabric': {
      name: 'Fabric Stickers',
      patternId: 'pat-fabric',
      description: 'Fabric stickers are made from cloth-based adhesive material. Flexible and soft to the touch, they conform to curved surfaces and textiles better than vinyl.',
      features: ['Cloth-based flexible material', 'Conforms to curved surfaces', 'Soft tactile texture', 'Machine washable options'],
      sizes: ['2×2 in', '3×3 in', '4×4 in', 'Custom']
    },
    'floor': {
      name: 'Floor Stickers',
      patternId: 'pat-floor',
      description: 'Floor stickers are printed on heavy-duty, anti-slip laminated vinyl. Designed for foot traffic areas — retail floors, event venues, and wayfinding applications.',
      features: ['Anti-slip laminate surface', 'Heavy-duty for foot traffic', 'Indoor and outdoor options', 'Great for wayfinding and retail'],
      sizes: ['12×12 in', '18×18 in', '24×24 in', 'Custom']
    },
    'qr-code': {
      name: 'QR Code Stickers',
      patternId: 'pat-qr',
      description: 'Custom QR code stickers make it easy to connect physical products and spaces to digital content. Scannable, durable, and available in any shape or size.',
      features: ['Scannable with any smartphone', 'Link to any URL or content', 'Durable and weather-resistant', 'Custom design around QR code'],
      sizes: ['1×1 in', '2×2 in', '3×3 in', 'Custom']
    },
    'sheets': {
      name: 'Sticker Sheets',
      patternId: 'pat-sheets',
      description: 'Custom sticker sheets let you combine multiple designs on a single backing. Perfect for merchandise, party favors, planner stickers, and brand swag packs.',
      features: ['Multiple designs per sheet', 'Kiss-cut for easy peeling', 'Great for merchandise and swag', 'Custom sheet layout options'],
      sizes: ['4×6 in', '5×7 in', '8.5×11 in', 'Custom']
    }
  };

  // ── Sticker Pricing Data ──
  var stickerPricing = {
    standard: {
      '2x2': [
        {qty:50,price:29,per:0.58},{qty:100,price:49,per:0.49},{qty:200,price:79,per:0.39},
        {qty:300,price:99,per:0.33},{qty:500,price:139,per:0.28},{qty:800,price:179,per:0.22},
        {qty:1000,price:199,per:0.20},{qty:2000,price:359,per:0.18},{qty:5000,price:699,per:0.14},{qty:10000,price:1199,per:0.12}
      ],
      '3x3': [
        {qty:50,price:35,per:0.70},{qty:100,price:59,per:0.59},{qty:200,price:99,per:0.49},
        {qty:300,price:129,per:0.43},{qty:500,price:179,per:0.36},{qty:800,price:239,per:0.30},
        {qty:1000,price:269,per:0.27},{qty:2000,price:459,per:0.23},{qty:5000,price:899,per:0.18},{qty:10000,price:1599,per:0.16}
      ],
      '4x4': [
        {qty:50,price:49,per:0.98},{qty:100,price:79,per:0.79},{qty:200,price:139,per:0.70},
        {qty:300,price:179,per:0.60},{qty:500,price:239,per:0.48},{qty:800,price:299,per:0.37},
        {qty:1000,price:349,per:0.35},{qty:2000,price:599,per:0.30},{qty:5000,price:1199,per:0.24},{qty:10000,price:1999,per:0.20}
      ],
      '5x5': [
        {qty:50,price:59,per:1.18},{qty:100,price:99,per:0.99},{qty:200,price:179,per:0.90},
        {qty:300,price:219,per:0.73},{qty:500,price:299,per:0.60},{qty:800,price:399,per:0.50},
        {qty:1000,price:449,per:0.45},{qty:2000,price:799,per:0.40},{qty:5000,price:1499,per:0.30},{qty:10000,price:2499,per:0.25}
      ],
      '6x6': [
        {qty:50,price:69,per:1.38},{qty:100,price:119,per:1.19},{qty:200,price:199,per:1.00},
        {qty:300,price:249,per:0.83},{qty:500,price:349,per:0.70},{qty:800,price:449,per:0.56},
        {qty:1000,price:499,per:0.50},{qty:2000,price:899,per:0.45},{qty:5000,price:1699,per:0.34},{qty:10000,price:2999,per:0.30}
      ]
    },
    holo: {
      '2x2': [
        {qty:50,price:49,per:0.98},{qty:100,price:69,per:0.69},{qty:200,price:99,per:0.50},
        {qty:300,price:139,per:0.46},{qty:500,price:179,per:0.36},{qty:800,price:219,per:0.27},
        {qty:1000,price:279,per:0.28},{qty:2000,price:439,per:0.22},{qty:5000,price:779,per:0.16},{qty:10000,price:1279,per:0.13}
      ],
      '3x3': [
        {qty:50,price:55,per:1.10},{qty:100,price:79,per:0.79},{qty:200,price:119,per:0.60},
        {qty:300,price:169,per:0.56},{qty:500,price:219,per:0.44},{qty:800,price:279,per:0.35},
        {qty:1000,price:349,per:0.35},{qty:2000,price:539,per:0.27},{qty:5000,price:979,per:0.20},{qty:10000,price:1679,per:0.17}
      ],
      '4x4': [
        {qty:50,price:69,per:1.38},{qty:100,price:99,per:0.99},{qty:200,price:159,per:0.80},
        {qty:300,price:219,per:0.73},{qty:500,price:279,per:0.56},{qty:800,price:339,per:0.42},
        {qty:1000,price:429,per:0.43},{qty:2000,price:679,per:0.34},{qty:5000,price:1279,per:0.26},{qty:10000,price:2079,per:0.21}
      ],
      '5x5': [
        {qty:50,price:79,per:1.58},{qty:100,price:119,per:1.19},{qty:200,price:199,per:1.00},
        {qty:300,price:259,per:0.86},{qty:500,price:339,per:0.68},{qty:800,price:439,per:0.55},
        {qty:1000,price:529,per:0.53},{qty:2000,price:879,per:0.44},{qty:5000,price:1579,per:0.32},{qty:10000,price:2579,per:0.26}
      ],
      '6x6': [
        {qty:50,price:89,per:1.78},{qty:100,price:139,per:1.39},{qty:200,price:219,per:1.10},
        {qty:300,price:289,per:0.96},{qty:500,price:389,per:0.78},{qty:800,price:489,per:0.61},
        {qty:1000,price:579,per:0.58},{qty:2000,price:979,per:0.49},{qty:5000,price:1779,per:0.36},{qty:10000,price:3079,per:0.31}
      ]
    }
  };

  var pricingMap = {
    'die-cut':'standard','rounded-corner':'standard','kiss-cut':'standard','oval':'standard',
    'circle':'standard','rectangular':'standard','square':'standard','clear':'standard',
    'qr-code':'standard','fabric':'standard',
    'holographic':'holo','glitter':'holo',
    'decal':null,'bumper':null,'transfer':null,'vinyl':null,
    'window':null,'front-adhesive':null,'floor':null,'sheets':null
  };

  var pricingSizes = ['2x2','3x3','4x4','5x5','6x6'];

  // ── Cart System ──
  window.bpCart = [];

  // ── Apparel Cost Calculator ──
  var apparelBaseCost = {
    dtg:         [{max:50,cost:4.50},{max:100,cost:6.00},{max:200,cost:8.00},{max:Infinity,cost:10.00}],
    dtf:         [{max:50,cost:3.50},{max:100,cost:5.00},{max:200,cost:7.00},{max:Infinity,cost:9.00}],
    screenprint: [{max:50,cost:3.00},{max:100,cost:4.00},{max:200,cost:5.50},{max:Infinity,cost:7.00}],
    embroidery:  [{max:50,cost:5.00},{max:100,cost:7.00},{max:200,cost:9.00},{max:Infinity,cost:12.00}]
  };
  var apparelTaxExempt = { dtg:false, dtf:false, screenprint:false, embroidery:false };

  function apparelQtyDiscount(qty) {
    if (qty >= 250) return 0.20;
    if (qty >= 100) return 0.15;
    if (qty >= 50) return 0.10;
    if (qty >= 25) return 0.05;
    return 0;
  }

  function updateApparelCalc(type) {
    var qty = parseInt(document.getElementById(type + '-calc-qty').value) || 0;
    var blank = parseFloat(document.getElementById(type + '-calc-blank').value) || 0;
    var w = parseFloat(document.getElementById(type + '-calc-w').value) || 0;
    var h = parseFloat(document.getElementById(type + '-calc-h').value) || 0;
    var area = w * h;
    var tiers = apparelBaseCost[type];
    var basePrint = tiers[tiers.length - 1].cost;
    for (var i = 0; i < tiers.length; i++) {
      if (area <= tiers[i].max) { basePrint = tiers[i].cost; break; }
    }
    var discount = apparelQtyDiscount(qty);
    var printCost = basePrint * (1 - discount);
    var costEach = blank + printCost;
    var subtotal = costEach * qty;
    var tax = apparelTaxExempt[type] ? 0 : subtotal * 0.07;
    var total = subtotal + tax;

    document.getElementById(type + '-r-qty').textContent = qty;
    document.getElementById(type + '-r-each').textContent = '$' + costEach.toFixed(2);
    document.getElementById(type + '-r-sub').textContent = '$' + subtotal.toFixed(2);
    document.getElementById(type + '-r-tax').textContent = apparelTaxExempt[type] ? '$0.00' : '$' + tax.toFixed(2);
    document.getElementById(type + '-r-total').textContent = '$' + total.toFixed(2);
  }

  function setTaxExempt(type, val) {
    apparelTaxExempt[type] = val;
    document.getElementById(type + '-tax-yes').classList.toggle('active', val);
    document.getElementById(type + '-tax-no').classList.toggle('active', !val);
    updateApparelCalc(type);
  }

  // Initialize all calculators on page load
  ['dtg','dtf','screenprint','embroidery'].forEach(function(t) { updateApparelCalc(t); });

  function addToCart(slug, name, size, qty, price) {
    window.bpCart.push({slug:slug, name:name, size:size, qty:qty, price:price});
    updateCartBadge();
    showCartToast(name + ' (' + size + ' × ' + qty + ') added');
  }

  function removeFromCart(index) {
    window.bpCart.splice(index, 1);
    updateCartBadge();
    renderCart();
  }

  function updateCartBadge() {
    var badge = document.getElementById('cart-badge');
    var count = document.getElementById('cart-count');
    if (window.bpCart.length > 0) {
      badge.classList.add('visible');
      count.textContent = window.bpCart.length;
    } else {
      badge.classList.remove('visible');
    }
  }

  function getCartTotal() {
    return window.bpCart.reduce(function(sum, item) { return sum + item.price; }, 0);
  }

  function showCartToast(msg) {
    var toast = document.getElementById('cart-toast');
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() { toast.classList.remove('visible'); }, 2200);
  }

  function openCart() {
    renderCart();
    document.getElementById('cart-drawer').classList.add('open');
    document.getElementById('cart-overlay').classList.add('active');
  }

  function closeCart() {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('active');
  }

  function renderCart() {
    var list = document.getElementById('cart-items');
    var totalEl = document.getElementById('cart-total');
    var checkoutBtn = document.getElementById('cart-checkout-btn');
    var emptyMsg = document.getElementById('cart-empty');

    if (window.bpCart.length === 0) {
      list.innerHTML = '';
      emptyMsg.style.display = 'block';
      totalEl.textContent = '$0';
      checkoutBtn.style.opacity = '0.4';
      checkoutBtn.style.pointerEvents = 'none';
      return;
    }
    emptyMsg.style.display = 'none';
    checkoutBtn.style.opacity = '1';
    checkoutBtn.style.pointerEvents = '';

    list.innerHTML = window.bpCart.map(function(item, i) {
      return '<div class="cart-item">' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + item.name + '</div>' +
          '<div class="cart-item-detail">' + item.size + ' × ' + item.qty.toLocaleString() + ' pcs</div>' +
        '</div>' +
        '<div class="cart-item-price">$' + item.price.toLocaleString() + '</div>' +
        '<button class="cart-item-remove" onclick="removeFromCart(' + i + ')" title="Remove">&times;</button>' +
      '</div>';
    }).join('');

    totalEl.textContent = '$' + getCartTotal().toLocaleString();
  }

  // Pricing tab switching
  function switchPricingTab(size, slug) {
    var cat = pricingMap[slug];
    if (!cat) return;
    var data = stickerPricing[cat][size];
    if (!data) return;

    // Update active tab
    document.querySelectorAll('.pricing-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.size === size);
    });

    // Render table rows
    var tbody = document.getElementById('pricing-tbody');
    tbody.innerHTML = data.map(function(row) {
      return '<tr class="pricing-row">' +
        '<td>' + row.qty.toLocaleString() + '</td>' +
        '<td class="pricing-price">$' + row.price.toLocaleString() + '</td>' +
        '<td class="pricing-per">$' + row.per.toFixed(2) + '/ea</td>' +
        '<td><button class="pricing-add-btn" onclick="addToCart(\'' + slug + '\',\'' + stickerData[slug].name + '\',\'' + size + '\',' + row.qty + ',' + row.price + ')">ADD</button></td>' +
      '</tr>';
    }).join('');
  }

  // Stripe checkout
  function startCheckout() {
    if (window.bpCart.length === 0) return;
    // Build order summary for contact form fallback
    var summary = window.bpCart.map(function(item) {
      return item.name + ' — ' + item.size + ' × ' + item.qty + ' pcs — $' + item.price;
    }).join('\n');
    summary += '\n\nTotal: $' + getCartTotal().toLocaleString();

    // If Stripe key is configured, use Stripe checkout
    if (window.STRIPE_PK) {
      // Stripe Payment Links or Checkout Sessions would go here
      // For now, fall through to contact form
    }

    // Fallback: open contact panel with order summary
    closeCart();
    openPanel('panel-contact');
    setTimeout(function() {
      var textarea = document.querySelector('#panel-contact textarea');
      if (textarea) textarea.value = 'ORDER REQUEST:\n' + summary;
    }, 600);
  }

  // ── Sticker Sub-Panel Functions ──
  function openStickerSub(slug) {
    var data = stickerData[slug];
    if (!data) return;

    var label = document.getElementById('sticker-sub-label');
    var content = document.getElementById('sticker-sub-content');
    label.textContent = 'STICKERS \u2014 ' + data.name.toUpperCase();

    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var cat = pricingMap[slug];
    var pricingHtml = '';

    if (cat) {
      // Build pricing tabs + table
      var tabsHtml = pricingSizes.map(function(s, i) {
        return '<button class="pricing-tab' + (i === 0 ? ' active' : '') + '" data-size="' + s + '" onclick="switchPricingTab(\'' + s + '\',\'' + slug + '\')">' + s.replace('x', '×') + '</button>';
      }).join('');

      var firstSize = pricingSizes[0];
      var firstData = stickerPricing[cat][firstSize];
      var rowsHtml = firstData.map(function(row) {
        return '<tr class="pricing-row">' +
          '<td>' + row.qty.toLocaleString() + '</td>' +
          '<td class="pricing-price">$' + row.price.toLocaleString() + '</td>' +
          '<td class="pricing-per">$' + row.per.toFixed(2) + '/ea</td>' +
          '<td><button class="pricing-add-btn" onclick="addToCart(\'' + slug + '\',\'' + data.name + '\',\'' + firstSize + '\',' + row.qty + ',' + row.price + ')">ADD</button></td>' +
        '</tr>';
      }).join('');

      pricingHtml =
        '<div style="margin-top:8px;margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Select Size</span></div>' +
        '<div class="pricing-tabs">' + tabsHtml + '</div>' +
        '<table class="pricing-table">' +
          '<thead><tr><th>Qty</th><th>Price</th><th>Per Sticker</th><th></th></tr></thead>' +
          '<tbody id="pricing-tbody">' + rowsHtml + '</tbody>' +
        '</table>' +
        '<a href="#" style="font-family:\'Space Mono\',monospace;font-size:10px;color:var(--muted);letter-spacing:0.06em;text-decoration:none;opacity:0.6;" onclick="openPanel(\'panel-contact\');return false;">Need a custom size? Get a quote →</a>';
    } else {
      // No pricing — show size pills + quote CTA
      var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
      pricingHtml =
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Available Sizes</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="#" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>';
    }

    // Toggle grid class
    content.className = 'sticker-sub-grid' + (cat ? ' has-pricing' : '');

    var nameHtml = data.name.replace(' Stickers', '<br><span style=\'color:var(--bp-cyan);\'>Stickers</span>').replace(' Lettering', '<br><span style=\'color:var(--bp-cyan);\'>Lettering</span>').replace(' Clings', '<br><span style=\'color:var(--bp-cyan);\'>Clings</span>').replace(' Sheets', '<br><span style=\'color:var(--bp-cyan);\'>Sheets</span>');

    var heroHtml = data.image
      ? '<img src="' + data.image + '" alt="' + data.name + '" style="width:100%;max-width:380px;border-radius:8px;">'
      : '<svg viewBox="0 0 140 140" style="width:100%;max-width:220px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>';

    if (cat) {
      // 3-column layout: image | info | pricing
      content.innerHTML =
        '<div class="sticker-sub-hero">' + heroHtml + '</div>' +
        '<div style="align-self:center;">' +
          '<div class="section-num" style="margin-bottom:8px;">Stickers</div>' +
          '<h2 style="font-size:clamp(24px,3vw,36px);font-weight:900;letter-spacing:-0.03em;margin-bottom:10px;color:var(--white);">' + nameHtml + '</h2>' +
          '<p style="font-size:13px;line-height:1.7;color:var(--muted);margin-bottom:16px;text-align:justify;">' + data.description + '</p>' +
          '<ul class="sticker-feature-list" style="margin-bottom:0;">' + featuresHtml + '</ul>' +
        '</div>' +
        '<div style="align-self:center;">' + pricingHtml + '</div>';
    } else {
      // 2-column layout: image | info + quote
      content.innerHTML =
        '<div class="sticker-sub-hero" style="text-align:center;">' + heroHtml + '</div>' +
        '<div>' +
          '<div class="section-num" style="margin-bottom:12px;">Stickers</div>' +
          '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + nameHtml + '</h2>' +
          '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">PRODUCT DETAILS</span><div class="dl"></div></div>' +
          '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
          '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
          pricingHtml +
        '</div>';
    }



    // Manage mesh + panel
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('sticker-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof STICKER_SLUG_TO_URL !== 'undefined') {
      var stickerUrlSeg = STICKER_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Printing/StickersAndDecals/' + stickerUrlSeg);
    }
  }

  function closeStickerSub() {
    var subPanel = document.getElementById('sticker-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    // Logo stays visible
    // Restart mesh on parent stickers panel
    var stickerPanel = document.getElementById('panel-stickers');
    var meshWrap = stickerPanel && stickerPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Printing/StickersAndDecals');
  }

  // ── Label Sub-Panel Data & Functions ──
  var labelData = {
    'circle-roll':      { name:'Circle Roll Labels',        patternId:'pat-circle',    description:'Round roll labels perfect for product branding, jar lids, and seal closures. Applied by hand or automatic dispensers on high-speed production lines.', features:['Roll-fed for fast application','Available in gloss, matte, or clear','Indoor & outdoor durability','Full-color CMYK printing','Custom diameters available'], sizes:['1 in','1.5 in','2 in','3 in','4 in','Custom'] },
    'rectangular-roll': { name:'Rectangular Roll Labels',   patternId:'pat-rect',      description:'The most versatile label shape for bottles, boxes, and packaging. Rectangular roll labels work with automatic applicators and wrap cleanly around curved surfaces.', features:['Standard shape for all surfaces','Compatible with auto-applicators','Permanent or removable adhesive','Waterproof & oil-resistant options','High-volume roll quantities'], sizes:['2×1','3×2','4×3','4×6','Custom'] },
    'square-roll':      { name:'Square Roll Labels',        patternId:'pat-square',    description:'Equal-sided roll labels ideal for product fronts, QR code placement, and symmetrical branding. Clean geometry for a modern, professional look.', features:['Symmetrical design layout','Roll dispensing compatible','Gloss or matte lamination','Fade-resistant UV inks','Great for logos & icons'], sizes:['1×1','2×2','3×3','4×4','Custom'] },
    'oval-roll':        { name:'Oval Roll Labels',          patternId:'pat-oval',      description:'Elegant oval roll labels add a classic touch to bottles, jars, and cosmetic packaging. The curved shape draws the eye and frames your design beautifully.', features:['Classic shape for premium products','Smooth curved edges','Roll-fed for efficiency','Wine & spirits industry standard','Available in textured stocks'], sizes:['2×3','3×4','4×6','Custom'] },
    'custom-shape':     { name:'Custom Shape Labels',       patternId:'pat-diecut',    description:'Die-cut to match any outline — your logo, mascot, product silhouette, or any creative shape. Stand out on shelves with labels that break the mold.', features:['Any shape or outline','Precision die-cut edges','Full bleed printing','Multiple material options','Small & large runs available'], sizes:['2×2','3×3','4×4','5×5','Custom'] },
    'arched':           { name:'Arched Labels',             patternId:'lpat-arch',     description:'Labels with a gracefully curved top or bottom edge, popular for beverage bottles, artisan products, and craft branding where classic elegance matters.', features:['Curved arch top or bottom','Elegant vintage aesthetic','Ideal for bottles & jars','Full-color with foil options','Multiple arch radii available'], sizes:['2×3','3×4','4×5','Custom'] },
    'hexagon':          { name:'Hexagon Labels',            patternId:'lpat-hex',      description:'Six-sided geometric labels that command attention. Hexagons tile naturally and create a modern, structured look for tech, food, and lifestyle brands.', features:['Geometric modern shape','Eye-catching shelf presence','Precision die-cut hexagons','Matte, gloss, or metallic','Nested tiling for packaging'], sizes:['2 in','3 in','4 in','Custom'] },
    'scalloped':        { name:'Scalloped Labels',          patternId:'lpat-scallop',  description:'Decorative wavy-edged labels that add charm and warmth. Perfect for bakeries, handmade goods, wedding favors, and artisan products.', features:['Decorative wavy edge','Handcrafted aesthetic','Popular for food & gifts','Multiple scallop depths','Available on rolls or sheets'], sizes:['2 in','3 in','4 in','Custom'] },
    'cigar-band':       { name:'Cigar Band Seal Labels',    patternId:'lpat-band',     description:'Wrap-around band labels that seal bottles, jars, and boxes. A tamper-evident closure that doubles as premium branding real estate.', features:['Wrap-around seal design','Tamper-evident closure','Premium branding area','Custom width bands','Perforated tear options'], sizes:['1×8','1.5×10','2×12','Custom'] },
    'lollipop':         { name:'Lollipop Labels',           patternId:'lpat-lollipop', description:'Flag-style labels that wrap around sticks or handles with print visible from both sides. Ideal for food products, promotional items, and candy packaging.', features:['Flag-wrap around sticks','Visible from both sides','Food-safe materials','Full-color printing','Custom tab shapes'], sizes:['2×2','3×3','2×4','Custom'] },
    'cut-to-size':      { name:'Single/Cut to Size Labels', patternId:'pat-kisscut',   description:'Individual labels cut to your exact specifications, delivered as single pieces — not on rolls or sheets. Perfect for short runs, prototypes, and specialty applications.', features:['Individually cut pieces','Any size or shape','Ideal for prototypes','Short-run friendly','Premium material options'], sizes:['2×2','3×3','4×4','4×6','8.5×11','Custom'] },
    'sheet-labels':     { name:'Sheet Labels',              patternId:'pat-sheets',    description:'Multiple labels arranged on standard sheets for desktop or laser printing. Great for shipping labels, return addresses, and small batch product labeling.', features:['Multiple labels per sheet','Laser & inkjet compatible','Standard sheet sizes','Easy peel-and-stick','Blank or pre-printed'], sizes:['4×6 sheet','5×7 sheet','8.5×11 sheet','Custom'] },
    'domed-3d':         { name:'3D Domed Labels',           patternId:'lpat-dome',     description:'Labels coated with a clear polyurethane resin dome that creates a raised, three-dimensional effect. Premium look and feel for electronics, automotive, and luxury branding.', features:['Raised resin dome finish','Premium 3D appearance','Scratch & UV resistant','Long-lasting durability','Indoor & outdoor rated'], sizes:['1 in','1.5 in','2 in','3 in','Custom'] },
    'double-sided':     { name:'Double-Sided Labels',       patternId:'lpat-double',   description:'Printed on both sides for application on glass, clear containers, or hanging tags. The front design shows through transparent surfaces while the back carries additional information.', features:['Printed front & back','Clear substrate base','Perfect for glass/windows','Two-sided information','No separate backing needed'], sizes:['2×2','3×3','4×4','Custom'] },
    'star':             { name:'Star Labels',               patternId:'lpat-star',     description:'Five-pointed star-shaped labels that grab attention instantly. Use for promotions, awards, ratings, holiday themes, and any design that needs to stand out.', features:['Star die-cut shape','High visual impact','Promotional & seasonal use','Full-color printing','Multiple star sizes'], sizes:['1.5 in','2 in','3 in','4 in','Custom'] },
    'tamper-evident':   { name:'Tamper Evident Seals',      patternId:'lpat-tamper',   description:'Security labels that leave a visible "VOID" pattern or break apart when removal is attempted. Essential for pharmaceuticals, electronics, and high-value product packaging.', features:['VOID pattern on removal','Cannot be reapplied','Regulatory compliance','Sequential numbering available','Multiple security levels'], sizes:['1×3','2×4','3×1','Custom'] },
    'foil-stamped':     { name:'Foil Stamped Labels',       patternId:'lpat-foil',     description:'Labels enhanced with metallic foil stamping for a luxurious, eye-catching finish. Gold, silver, copper, and holographic foil options elevate your brand presentation.', features:['Hot foil stamped finish','Gold, silver, copper options','Premium shelf appeal','Combine with embossing','Luxury brand standard'], sizes:['2×2','3×3','4×4','Custom'] },
    'extreme-temp':     { name:'Extreme Temperature Labels', patternId:'lpat-extreme', description:'Engineered labels that withstand extreme heat, cold, moisture, and chemical exposure. Built for industrial, laboratory, frozen food, and outdoor applications.', features:['Heat resistant to 500°F','Freeze-proof to -65°F','Chemical & solvent resistant','Industrial-grade adhesive','UL/CSA rated options'], sizes:['2×1','3×2','4×3','Custom'] },
    'embossed':         { name:'Embossed Labels',           patternId:'lpat-emboss',   description:'Labels with a raised tactile texture created by pressing the material into a custom die. The dimensional effect adds a premium, handcrafted quality to packaging.', features:['Raised tactile texture','Custom emboss patterns','Premium paper stocks','Combine with foil stamping','Luxury unboxing experience'], sizes:['2×2','3×3','4×4','Custom'] },
    'gold-foil':        { name:'Gold Foil Labels',          patternId:'lpat-gold',     description:'Labels printed on genuine gold foil material or featuring gold foil accents. The ultimate in premium labeling for wine, spirits, cosmetics, and luxury goods.', features:['Real gold foil material','Mirror or brushed finish','Ultra-premium appearance','Wine & spirits standard','Custom shapes available'], sizes:['2×2','3×3','4×4','Custom'] }
  };

  var LABEL_SLUG_TO_URL = {
    'circle-roll':'CircleRollLabels','rectangular-roll':'RectangularRollLabels',
    'square-roll':'SquareRollLabels','oval-roll':'OvalRollLabels',
    'custom-shape':'CustomShapeLabels','arched':'ArchedLabels',
    'hexagon':'HexagonLabels','scalloped':'ScallopedLabels',
    'cigar-band':'CigarBandSealLabels','lollipop':'LollipopLabels',
    'cut-to-size':'CutToSizeLabels','sheet-labels':'SheetLabels',
    'domed-3d':'3DDomed','double-sided':'DoubleSidedLabels',
    'star':'StarLabels','tamper-evident':'TamperEvidentSeals',
    'foil-stamped':'FoilStampedLabels','extreme-temp':'ExtremeTemperatureLabels',
    'embossed':'EmbossedLabels','gold-foil':'GoldFoilLabels'
  };
  var LABEL_URL_TO_SLUG = {};
  Object.keys(LABEL_SLUG_TO_URL).forEach(function(k) {
    LABEL_URL_TO_SLUG[LABEL_SLUG_TO_URL[k].toLowerCase()] = k;
  });

  function openLabelSub(slug) {
    var data = labelData[slug];
    if (!data) return;

    var label = document.getElementById('label-sub-label');
    var content = document.getElementById('label-sub-content');
    label.textContent = 'LABELS \u2014 ' + data.name.toUpperCase();

    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');

    var nameHtml = data.name
      .replace(' Labels', '<br><span style="color:var(--bp-cyan);">Labels</span>')
      .replace(' Seals', '<br><span style="color:var(--bp-cyan);">Seals</span>');

    // 2-column layout: SVG | info + sizes + quote CTA
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Labels</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + nameHtml + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">PRODUCT DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Available Sizes</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';

    // Open sub-panel
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('label-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof LABEL_SLUG_TO_URL !== 'undefined') {
      var labelUrlSeg = LABEL_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Printing/LabelsAndPackaging/' + labelUrlSeg);
    }
  }

  function closeLabelSub() {
    var subPanel = document.getElementById('label-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var packagingPanel = document.getElementById('panel-packaging');
    var meshWrap = packagingPanel && packagingPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Printing/LabelsAndPackaging');
  }

  // ── Banner Sub-Panel Data & Functions ──
  var bannerData = {
    'vinyl-banner':    { name:'Vinyl Banners',       patternId:'bpat-vinyl',   description:'Heavy-duty vinyl banners built for outdoor durability. Full-color digital printing on 13oz or 15oz scrim vinyl with hemmed edges and grommets for secure mounting.', features:['13oz or 15oz scrim vinyl','Hemmed edges & brass grommets','UV & weather resistant inks','Single or double-sided','Indoor & outdoor rated'], sizes:['2×4 ft','3×6 ft','4×8 ft','4×12 ft','Custom'] },
    'mesh-banner':     { name:'Mesh Banners',        patternId:'bpat-mesh',    description:'Wind-permeable mesh banners designed for high-wind outdoor installations. The micro-perforated material allows air to pass through while maintaining vibrant print quality.', features:['Wind-permeable mesh material','Reduces wind load by 70%','Full-color digital printing','Hemmed edges & grommets','Ideal for fences & scaffolding'], sizes:['3×6 ft','4×8 ft','4×12 ft','5×10 ft','Custom'] },
    'fabric-banner':   { name:'Fabric Banners',      patternId:'bpat-fabric',  description:'Premium dye-sublimation fabric banners with a professional, wrinkle-resistant finish. Lightweight and portable, perfect for trade shows, conferences, and indoor events.', features:['Dye-sublimation printing','Wrinkle-resistant polyester','Machine washable & reusable','Vibrant edge-to-edge color','Lightweight & portable'], sizes:['2×6 ft','3×8 ft','4×8 ft','Custom'] },
    'retractable':     { name:'Retractable Banners',  patternId:'bpat-retract', description:'Professional pull-up banner stands that set up in seconds. The banner retracts into a sleek aluminum base for easy transport and storage between events.', features:['Sets up in 60 seconds','Retractable aluminum base','Includes carrying case','Interchangeable graphics','Indoor use rated'], sizes:['24×80 in','33×80 in','36×92 in','47×80 in','Custom'] },
    'x-stand':         { name:'X-Stand Banners',     patternId:'bpat-xstand',  description:'Lightweight and affordable X-frame banner stands. The collapsible X-shaped frame supports a printed banner with grommets at all four corners for a taut display.', features:['Collapsible X-frame','Budget-friendly option','Lightweight & portable','Easy graphic swap','Great for retail & events'], sizes:['24×63 in','31×71 in','Custom'] },
    'step-repeat':     { name:'Step & Repeat',       patternId:'bpat-step',    description:'Photo backdrop walls featuring a repeating logo or pattern grid. The industry standard for red carpet events, press conferences, sponsorship walls, and branded photo opportunities.', features:['Repeating logo grid layout','Wrinkle-free fabric or vinyl','Adjustable frame systems','Professional photo backdrop','Custom pattern spacing'], sizes:['8×8 ft','8×10 ft','8×12 ft','10×10 ft','Custom'] },
    'pole-banner':     { name:'Pole Banners',        patternId:'bpat-pole',    description:'Double-sided banners designed for street poles and light posts. Includes pole mounting hardware with spring-loaded arms that keep banners taut in all weather conditions.', features:['Double-sided printing','Pole mounting hardware included','Spring-loaded arms','UV & weather resistant','Municipal & campus standard'], sizes:['18×36 in','24×48 in','30×60 in','Custom'] },
    'a-frame':         { name:'A-Frame Signs',       patternId:'bpat-aframe',  description:'Portable sidewalk sandwich boards that fold flat for storage. Double-sided display with interchangeable inserts, perfect for restaurants, retail stores, and daily specials.', features:['Double-sided display','Folds flat for storage','Interchangeable inserts','Wind-resistant design','Indoor & outdoor use'], sizes:['24×36 in','Custom'] },
    'yard-sign':       { name:'Yard Signs',          patternId:'bpat-yard',    description:'Corrugated plastic yard signs with metal H-stakes for ground installation. The go-to solution for political campaigns, real estate, event directional signage, and construction sites.', features:['4mm corrugated plastic','Metal H-stakes included','Single or double-sided','Weatherproof & lightweight','Bulk quantity discounts'], sizes:['12×18 in','18×24 in','24×36 in','Custom'] },
    'foam-board':      { name:'Foam Board Signs',    patternId:'bpat-foam',    description:'Lightweight foam core signs with high-quality mounted prints. Clean, rigid presentation ideal for indoor displays, presentations, trade shows, and temporary signage.', features:['3/16 or 1/2 in foam core','Direct print or mounted','Lightweight & rigid','Clean professional finish','Indoor use recommended'], sizes:['11×17 in','18×24 in','24×36 in','36×48 in','Custom'] },
    'acrylic-sign':    { name:'Acrylic Signs',       patternId:'bpat-acrylic', description:'Modern clear or frosted acrylic signs with a sleek, professional appearance. Direct UV printed or vinyl applied graphics on premium cast acrylic with polished edges.', features:['Clear or frosted acrylic','UV direct print or vinyl','Polished edges standard','Standoff mounting hardware','Premium modern aesthetic'], sizes:['8×10 in','12×18 in','18×24 in','24×36 in','Custom'] },
    'aluminum-sign':   { name:'Aluminum Signs',      patternId:'bpat-alum',    description:'Durable aluminum composite signs for long-lasting outdoor applications. Rust-proof and rigid, these signs withstand years of weather exposure while maintaining vibrant graphics.', features:['Aluminum composite material','Rust-proof & weatherproof','UV-resistant printing','Drill or adhesive mount','10+ year outdoor life'], sizes:['12×18 in','18×24 in','24×36 in','36×48 in','Custom'] },
    'coroplast':       { name:'Coroplast Signs',     patternId:'bpat-coro',    description:'Corrugated plastic signs — lightweight, affordable, and weatherproof. The versatile workhorse for temporary outdoor signage, directional signs, and high-volume campaigns.', features:['4mm corrugated plastic','Extremely lightweight','Full-color printing','Temporary outdoor use','Best value per sign'], sizes:['12×18 in','18×24 in','24×36 in','48×96 in','Custom'] },
    'pvc-sign':        { name:'PVC Signs',           patternId:'bpat-pvc',     description:'Rigid expanded PVC (Sintra) signs with a smooth, paintable surface. Ideal for interior wayfinding, ADA-compliant signage, and dimensional letter backings.', features:['Rigid expanded PVC','Smooth matte surface','Available in 3mm–19mm','ADA signage compliant','Indoor & sheltered outdoor'], sizes:['12×18 in','18×24 in','24×36 in','Custom'] },
    'channel-letters': { name:'Channel Letters',     patternId:'bpat-channel', description:'Three-dimensional illuminated letters for storefront signage. Individually fabricated aluminum letters with LED lighting create a professional, high-visibility brand presence.', features:['3D aluminum fabrication','LED front or halo lit','Energy efficient LEDs','UL listed & permitted','Custom fonts & colors'], sizes:['12 in tall','18 in tall','24 in tall','36 in tall','Custom'] },
    'window-graphics': { name:'Window Graphics',     patternId:'bpat-window',  description:'Transform storefront windows into branded displays with perforated vinyl, frosted film, clear clings, or full-coverage wraps. See-through from inside, vivid from outside.', features:['Perforated one-way vision','Frosted privacy film','Clear static clings','Full window wraps','Easy install & removal'], sizes:['Per sq ft','Full window','Custom'] },
    'wall-graphics':   { name:'Wall Graphics',       patternId:'bpat-wall',    description:'Large-format wall murals and graphics that transform interior spaces. From branded office walls to restaurant feature walls, adhesive-backed vinyl or fabric delivers impact.', features:['Adhesive vinyl or fabric','Repositionable options','Full-wall coverage','Photo-quality printing','Damage-free removal'], sizes:['Per sq ft','Full wall','Custom'] },
    'hanging-sign':    { name:'Hanging Signs',       patternId:'bpat-hang',    description:'Ceiling-mounted signs and displays for retail, warehouses, and trade shows. Suspended from above to maximize floor space and provide visibility from any direction.', features:['Ceiling-suspended display','Lightweight materials','360° visibility','Multiple mounting options','Retail & warehouse use'], sizes:['24×36 in','36×48 in','48×96 in','Custom'] },
    'magnetic-sign':   { name:'Magnetic Signs',      patternId:'bpat-magnet',  description:'Flexible magnetic vehicle signs that apply and remove instantly. Turn any car, truck, or van into a mobile billboard without permanent modification to the vehicle.', features:['Flexible magnetic material','Instant apply & remove','No vehicle damage','UV-resistant inks','30 mil magnetic stock'], sizes:['12×18 in','12×24 in','18×24 in','Custom'] },
    'feather-flag':    { name:'Feather Flags',       patternId:'bpat-feather', description:'Tall swooping teardrop or feather-shaped flags that flutter in the breeze to attract attention. Includes a ground spike or cross base for easy outdoor installation.', features:['Teardrop or feather shape','Dye-sub printed fabric','Ground spike & cross base','Single or double-sided','Rotates with wind'], sizes:['7 ft','10 ft','13 ft','16 ft','Custom'] }
  };

  var BANNER_SLUG_TO_URL = {
    'vinyl-banner':'VinylBanners','mesh-banner':'MeshBanners',
    'fabric-banner':'FabricBanners','retractable':'RetractableBanners',
    'x-stand':'XStandBanners','step-repeat':'StepAndRepeat',
    'pole-banner':'PoleBanners','a-frame':'AFrameSigns',
    'yard-sign':'YardSigns','foam-board':'FoamBoardSigns',
    'acrylic-sign':'AcrylicSigns','aluminum-sign':'AluminumSigns',
    'coroplast':'CoroplastSigns','pvc-sign':'PVCSigns',
    'channel-letters':'ChannelLetters','window-graphics':'WindowGraphics',
    'wall-graphics':'WallGraphics','hanging-sign':'HangingSigns',
    'magnetic-sign':'MagneticSigns','feather-flag':'FeatherFlags'
  };
  var BANNER_URL_TO_SLUG = {};
  Object.keys(BANNER_SLUG_TO_URL).forEach(function(k) {
    BANNER_URL_TO_SLUG[BANNER_SLUG_TO_URL[k].toLowerCase()] = k;
  });

  function openBannerSub(slug) {
    var data = bannerData[slug];
    if (!data) return;

    var label = document.getElementById('banner-sub-label');
    var content = document.getElementById('banner-sub-content');
    label.textContent = 'BANNERS & SIGNS \u2014 ' + data.name.toUpperCase();

    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');

    var nameHtml = data.name
      .replace(' Banners', '<br><span style="color:var(--bp-cyan);">Banners</span>')
      .replace(' Signs', '<br><span style="color:var(--bp-cyan);">Signs</span>')
      .replace(' Letters', '<br><span style="color:var(--bp-cyan);">Letters</span>')
      .replace(' Graphics', '<br><span style="color:var(--bp-cyan);">Graphics</span>')
      .replace(' Flags', '<br><span style="color:var(--bp-cyan);">Flags</span>');

    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Banners & Signs</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + nameHtml + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">PRODUCT DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Available Sizes</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';

    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('banner-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof BANNER_SLUG_TO_URL !== 'undefined') {
      var bannerUrlSeg = BANNER_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Printing/BannersAndSigns/' + bannerUrlSeg);
    }
  }

  function closeBannerSub() {
    var subPanel = document.getElementById('banner-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var signsPanel = document.getElementById('panel-signs');
    var meshWrap = signsPanel && signsPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Printing/BannersAndSigns');
  }

  // ── Large Format Sub-Panel Data & Functions ──
  var largeFormatData = {
    'vehicle-wrap':    { name:'Vehicle Wraps',       patternId:'lfpat-vwrap',    description:'Full or partial vehicle wraps that transform cars, trucks, and vans into mobile billboards. High-performance cast vinyl conforms to complex curves and lasts 5-7 years outdoors.', features:['Cast vinyl film','Conforms to curves & recesses','5-7 year outdoor durability','Full or partial coverage','Paint-safe removable adhesive'], sizes:['Partial wrap','Half wrap','Full wrap','Custom'] },
    'fleet-graphics':  { name:'Fleet Graphics',      patternId:'lfpat-fleet',    description:'Consistent branded graphics across your entire vehicle fleet. From simple logo decals to full wraps, we manage design consistency and bulk production for fleets of any size.', features:['Fleet-wide brand consistency','Scalable production','Simple decals to full wraps','Fleet management program','Volume pricing available'], sizes:['Logo set','Partial wrap','Full wrap','Custom'] },
    'wall-murals':     { name:'Wall Murals',         patternId:'lfpat-wall',     description:'Large-scale wall murals that transform interior and exterior spaces. Photo-quality printing on adhesive vinyl, fabric, or wallpaper substrates for lasting visual impact.', features:['Photo-quality resolution','Vinyl, fabric, or wallpaper','Interior & exterior options','Seamless panel installation','Damage-free removal options'], sizes:['Per sq ft','Full wall','Custom'] },
    'floor-graphics':  { name:'Floor Graphics',      patternId:'lfpat-floor',    description:'Durable floor graphics with anti-slip laminate for safe, eye-catching installations. Perfect for retail wayfinding, event branding, trade show booths, and promotional displays.', features:['Anti-slip laminate coating','UL 410 certified','Indoor & outdoor rated','Easy install & removal','Custom die-cut shapes'], sizes:['2×2 ft','3×3 ft','4×6 ft','Per sq ft','Custom'] },
    'window-perf':     { name:'Window Perf',         patternId:'lfpat-window',   description:'Perforated window vinyl that displays vivid graphics from outside while maintaining see-through visibility from inside. The ideal solution for storefront advertising and vehicle windows.', features:['One-way vision material','50/50 or 60/40 perforation','UV-resistant printing','See-through from inside','Easy application & removal'], sizes:['Per sq ft','Full window','Custom'] },
    'building-wrap':   { name:'Building Wraps',      patternId:'lfpat-build',    description:'Massive-scale building wraps that cover entire facades during construction or for advertising. Engineered mesh or vinyl substrates with reinforced hems and wind vents.', features:['Mesh or solid vinyl','Reinforced hems & grommets','Wind vents engineered','Crane installation support','Permits & engineering docs'], sizes:['Custom only'] },
    'canvas-prints':   { name:'Canvas Prints',       patternId:'lfpat-canvas',   description:'Gallery-quality canvas prints stretched over solid wood frames. Giclée printing with archival inks on premium cotton canvas delivers museum-grade results for art reproductions and photographs.', features:['Premium cotton canvas','Giclée archival inks','Solid wood stretcher bars','Gallery-wrapped edges','UV-protective coating'], sizes:['8×10 in','16×20 in','24×36 in','30×40 in','Custom'] },
    'posters':         { name:'Posters',             patternId:'lfpat-poster',   description:'High-quality poster printing on a variety of paper stocks. From glossy photo paper to matte art stock, we produce vibrant posters for advertising, events, retail, and art.', features:['Multiple paper stocks','Glossy, matte, or satin','Full-bleed printing','Indoor rated','Bulk quantity pricing'], sizes:['11×17 in','18×24 in','24×36 in','27×40 in','Custom'] },
    'backlit-prints':  { name:'Backlit Prints',      patternId:'lfpat-backlit',  description:'Translucent prints designed for illuminated light box displays. The specialized media allows even LED backlighting to pass through, creating vibrant glowing graphics that pop day and night.', features:['Translucent backlit film','Even light diffusion','Vibrant color saturation','Fits standard light boxes','LED & fluorescent compatible'], sizes:['2×3 ft','3×4 ft','4×6 ft','Custom'] },
    'truck-wraps':     { name:'Truck Wraps',         patternId:'lfpat-truck',    description:'Box truck and cargo van wraps that maximize your mobile advertising real estate. Engineered templates and precise installation ensure a seamless finish on flat and corrugated surfaces.', features:['Box truck & cargo van','Corrugated panel solutions','Engineered wrap templates','Cast or calendered vinyl','3-7 year durability'], sizes:['Partial','Full box','Full truck','Custom'] },
    'trailer-wraps':   { name:'Trailer Wraps',       patternId:'lfpat-trailer',  description:'Semi-trailer and utility trailer wraps that turn your logistics fleet into high-impact advertising. Full 53-foot trailer wraps deliver millions of daily impressions on highways.', features:['53 ft trailer coverage','Highway-grade materials','DOT compliant designs','Rivet & corrugation solutions','Fleet-wide consistency'], sizes:['Rear doors','Partial','Full trailer','Custom'] },
    'billboard':       { name:'Billboards',          patternId:'lfpat-billboard',description:'Large-format billboard prints on heavy-duty vinyl or flex face material. Designed for outdoor bulletin and poster-size billboard frames with UV-stable inks for maximum visibility.', features:['Heavy-duty flex face vinyl','UV-stable solvent inks','Pole pocket or frame mount','Poster & bulletin sizes','Weatherproof 2+ years'], sizes:['Junior (6×12 ft)','Poster (12×24 ft)','Bulletin (14×48 ft)','Custom'] },
    'awning-graphics': { name:'Awning Graphics',     patternId:'lfpat-awning',   description:'Custom printed or vinyl-lettered awning graphics for storefronts and restaurants. Durable outdoor-rated materials withstand sun, rain, and wind while enhancing curb appeal.', features:['Awning-grade fabric or vinyl','UV & weather resistant','Printed or vinyl lettering','Frame or tension mount','Enhances curb appeal'], sizes:['Standard storefront','Extended awning','Custom'] },
    'scaffold-wrap':   { name:'Scaffold Wraps',      patternId:'lfpat-scaffold', description:'Construction scaffold wraps that combine site branding with debris containment. Printed mesh material allows airflow while concealing construction activity behind vibrant advertising.', features:['Printed mesh material','Debris containment rated','Airflow-permeable','Full scaffold coverage','Construction site branding'], sizes:['Custom only'] },
    'fence-wraps':     { name:'Fence Wraps',         patternId:'lfpat-fence',    description:'Chain-link and construction fence wraps that transform temporary fencing into branded displays. Mesh banners with reinforced hems and zip-tie attachment for easy installation.', features:['Mesh or solid vinyl','Reinforced hems','Zip-tie or grommet mount','Wind-permeable options','Temporary or permanent use'], sizes:['3×6 ft','4×8 ft','6×50 ft roll','Custom'] },
    'hoarding':        { name:'Hoarding',            patternId:'lfpat-hoard',    description:'Construction hoarding panels with full-color printed graphics. Board-mounted prints or adhesive-applied vinyl turn construction barriers into professional marketing surfaces.', features:['Board-mounted or adhesive','Full-color printing','Modular panel system','Consistent panel-to-panel','Professional site image'], sizes:['4×8 ft panels','Custom'] },
    'adhesive-vinyl':  { name:'Adhesive Vinyl',      patternId:'lfpat-adhesive', description:'Custom cut or printed adhesive vinyl for a wide range of applications. From simple lettering and logos to full-color printed decals, adhesive vinyl is the most versatile signage material.', features:['Cut or printed vinyl','Indoor & outdoor options','Permanent or removable','Custom die-cut shapes','Easy application tools'], sizes:['Per sq ft','Sheet','Roll','Custom'] },
    'rigid-prints':    { name:'Rigid Prints',        patternId:'lfpat-rigid',    description:'Direct-printed rigid substrate signs on foam board, PVC, aluminum composite, acrylic, and more. Flatbed UV printing produces photo-quality results on virtually any rigid material.', features:['UV flatbed printing','Multiple substrates','Photo-quality output','Indoor & outdoor rated','Cut to custom shapes'], sizes:['12×18 in','24×36 in','36×48 in','48×96 in','Custom'] },
    'photo-prints':    { name:'Photo Prints',        patternId:'lfpat-photo',    description:'Large-format photo prints on premium photo paper, metallic paper, or fine art substrates. Professional color management and giclée printing deliver gallery-grade image reproduction.', features:['Premium photo papers','Giclée printing','Color-managed workflow','Metallic & fine art stocks','Archival longevity'], sizes:['8×10 in','11×14 in','16×24 in','24×36 in','Custom'] },
    'window-film':     { name:'Window Film',         patternId:'lfpat-perf',     description:'Decorative and privacy window films with custom printed or frosted designs. Transform plain glass into branded, decorative, or functional surfaces with easy-apply static cling or adhesive films.', features:['Static cling or adhesive','Frosted or printed designs','Privacy & UV blocking','Easy install & removal','Interior or exterior apply'], sizes:['Per sq ft','Full window','Custom'] }
  };

  var LF_SLUG_TO_URL = {
    'vehicle-wrap':'VehicleWraps','fleet-graphics':'FleetGraphics',
    'wall-murals':'WallMurals','floor-graphics':'FloorGraphics',
    'window-perf':'WindowPerf','building-wrap':'BuildingWraps',
    'canvas-prints':'CanvasPrints','posters':'Posters',
    'backlit-prints':'BacklitPrints','truck-wraps':'TruckWraps',
    'trailer-wraps':'TrailerWraps','billboard':'Billboards',
    'awning-graphics':'AwningGraphics','scaffold-wrap':'ScaffoldWraps',
    'fence-wraps':'FenceWraps','hoarding':'Hoarding',
    'adhesive-vinyl':'AdhesiveVinyl','rigid-prints':'RigidPrints',
    'photo-prints':'PhotoPrints','window-film':'WindowFilm'
  };
  var LF_URL_TO_SLUG = {};
  Object.keys(LF_SLUG_TO_URL).forEach(function(k) {
    LF_URL_TO_SLUG[LF_SLUG_TO_URL[k].toLowerCase()] = k;
  });

  function openLargeFormatSub(slug) {
    var data = largeFormatData[slug];
    if (!data) return;

    var label = document.getElementById('lf-sub-label');
    var content = document.getElementById('lf-sub-content');
    label.textContent = 'LARGE FORMAT \u2014 ' + data.name.toUpperCase();

    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');

    var nameHtml = data.name
      .replace(' Wraps', '<br><span style="color:var(--bp-cyan);">Wraps</span>')
      .replace(' Graphics', '<br><span style="color:var(--bp-cyan);">Graphics</span>')
      .replace(' Prints', '<br><span style="color:var(--bp-cyan);">Prints</span>')
      .replace(' Film', '<br><span style="color:var(--bp-cyan);">Film</span>');

    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Large Format Graphics</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + nameHtml + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">PRODUCT DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Available Sizes</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';

    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('largeformat-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof LF_SLUG_TO_URL !== 'undefined') {
      var lfUrlSeg = LF_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Printing/LargeFormatGraphics/' + lfUrlSeg);
    }
  }

  function closeLargeFormatSub() {
    var subPanel = document.getElementById('largeformat-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var lfPanel = document.getElementById('panel-largeformat');
    var meshWrap = lfPanel && lfPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Printing/LargeFormatGraphics');
  }

  // ── Event Sub-Panel Data & Functions ──
  var eventData = {
    'booth-graphics':     { name:'Booth Graphics',       patternId:'evpat-booth',      description:'Custom trade show booth panels and wall graphics that make your exhibit stand out. Full-color printed fabric or vinyl panels designed to fit standard inline, island, and peninsula booth configurations.', features:['Custom booth panel sizes','Fabric or vinyl substrates','Fits standard booth frames','Vibrant dye-sub printing','Reusable & washable fabric'], sizes:['8 ft inline','10×10 ft','10×20 ft','20×20 ft','Custom'] },
    'pop-up-displays':    { name:'Pop-Up Displays',      patternId:'evpat-popup',      description:'Portable curved and straight pop-up display walls that set up in minutes. Magnetic graphic panels attach to a collapsible aluminum frame, then pack into a wheeled shipping case.', features:['Curved or straight frame','Magnetic panel attachment','Sets up in 15 minutes','Wheeled shipping case','Interchangeable graphics'], sizes:['8 ft straight','8 ft curved','10 ft straight','10 ft curved','Custom'] },
    'table-covers':       { name:'Table Covers',         patternId:'evpat-table',      description:'Branded table drapes and fitted covers that turn standard folding tables into professional display surfaces. Full-color dye-sublimation printed polyester with wrinkle-resistant finish.', features:['Fitted or draped styles','Dye-sub printed polyester','Wrinkle-resistant fabric','Machine washable','Open or closed back'], sizes:['4 ft table','6 ft table','8 ft table','Custom'] },
    'backdrops':          { name:'Backdrops',            patternId:'evpat-backdrop',   description:'Professional photo and stage backdrops for events, conferences, and branded experiences. Wrinkle-free fabric or vinyl with adjustable frame systems for versatile positioning.', features:['Wrinkle-free fabric or vinyl','Adjustable frame systems','Step & repeat option','Seamless single-piece','Photo-quality printing'], sizes:['8×8 ft','8×10 ft','10×10 ft','10×20 ft','Custom'] },
    'event-tents':        { name:'Event Tents',          patternId:'evpat-tent',       description:'Custom printed canopy tents with full-color dye-sublimation graphics on the canopy, valance, and optional sidewalls. Heavy-duty aluminum frames with commercial-grade hardware.', features:['Full-color canopy printing','Aluminum frame construction','Optional sidewalls & half-walls','Water-resistant fabric','Includes carrying bag'], sizes:['5×5 ft','10×10 ft','10×15 ft','10×20 ft','Custom'] },
    'event-flags':        { name:'Event Flags',          patternId:'evpat-flag',       description:'Custom branded feather, teardrop, and rectangle event flags that flutter to attract attention. Dye-sublimation printed fabric with ground spike, cross base, or wall mount hardware.', features:['Feather, teardrop, or rectangle','Dye-sub printed fabric','Multiple base options','Single or double-sided','Rotates freely in wind'], sizes:['7 ft','10 ft','13 ft','16 ft','Custom'] },
    'podium-graphics':    { name:'Podium Graphics',      patternId:'evpat-podium',     description:'Branded lectern and podium wraps that add a professional touch to presentations, press conferences, and ceremonies. Custom-fit vinyl or fabric wraps with front and side coverage.', features:['Custom-fit to podium','Vinyl or fabric options','Front & side coverage','Easy install & removal','Reusable for events'], sizes:['Standard podium','Wide podium','Custom'] },
    'directional-signs':  { name:'Directional Signs',    patternId:'evpat-direct',     description:'Event wayfinding and directional signage that guides attendees through venues with clear, branded navigation. Foam board, coroplast, or retractable sign options for indoor and outdoor events.', features:['Arrow & wayfinding designs','Multiple substrate options','Free-standing or mounted','Consistent event branding','Indoor & outdoor rated'], sizes:['12×18 in','18×24 in','24×36 in','Custom'] },
    'badge-lanyards':     { name:'Badges & Lanyards',    patternId:'evpat-badge',      description:'Custom printed name badges and branded lanyards for conferences, trade shows, and corporate events. Full-color badge inserts with custom lanyard printing, colors, and attachment hardware.', features:['Full-color badge inserts','Custom lanyard printing','Multiple attachment clips','Breakaway safety feature','Bulk event quantities'], sizes:['3.5×2.25 in badge','0.5 in lanyard','0.75 in lanyard','1 in lanyard','Custom'] },
    'red-carpet':         { name:'Red Carpet',           patternId:'evpat-carpet',     description:'Custom printed carpet runners and aisle graphics for VIP events, galas, premieres, and branded experiences. Dye-sublimation printed on durable event-grade carpet material.', features:['Dye-sub printed carpet','Durable event-grade material','Custom widths & lengths','Non-slip backing','Single-use or reusable'], sizes:['3×10 ft','3×20 ft','4×20 ft','4×50 ft','Custom'] },
    'counter-displays':   { name:'Counter Displays',     patternId:'evpat-counter',    description:'Portable promotional counter stands with wraparound graphics and internal storage shelf. Lightweight and collapsible for easy transport between events, setting up in under 5 minutes.', features:['Wraparound graphic panel','Internal storage shelf','Sets up in 5 minutes','Lightweight & portable','Includes carrying case'], sizes:['Standard counter','Custom'] },
    'kiosks':             { name:'Kiosks',               patternId:'evpat-kiosk',      description:'Interactive display kiosks with branded graphic panels and optional monitor or tablet mounts. Freestanding structures for trade shows, retail, and lobby installations.', features:['Branded graphic panels','Monitor/tablet mount option','Freestanding design','Modular & configurable','Trade show & retail use'], sizes:['Single panel','Double panel','Custom'] },
    'hanging-displays':   { name:'Hanging Displays',     patternId:'evpat-hang',       description:'Ceiling-hung fabric structures in circular, square, and custom shapes that create dramatic overhead branding. Dye-sublimation printed fabric stretched over lightweight aluminum frames.', features:['Circle, square, or custom shapes','Dye-sub printed fabric','Lightweight aluminum frame','360° overhead visibility','Includes hanging hardware'], sizes:['6 ft diameter','8 ft diameter','10 ft diameter','12 ft diameter','Custom'] },
    'stage-graphics':     { name:'Stage Graphics',       patternId:'evpat-stage',      description:'Custom stage skirts, risers wraps, and backdrop panels that brand the performance area. Printed fabric or vinyl that attaches to standard stage hardware with velcro or clips.', features:['Stage skirts & riser wraps','Fabric or vinyl options','Velcro or clip attachment','Full-stage coverage','Reusable & durable'], sizes:['4 ft stage','8 ft stage','Full stage','Custom'] },
    'stanchion-graphics': { name:'Stanchion Graphics',   patternId:'evpat-stanchion',  description:'Queue barrier and stanchion post wraps that turn crowd management infrastructure into branded advertising. Printed vinyl sleeves that slip over standard retractable belt stanchion posts.', features:['Fits standard stanchion posts','Printed vinyl sleeves','Easy slip-on installation','Brand queue lines','Indoor & outdoor use'], sizes:['Standard post','Custom'] },
    'inflatables':        { name:'Inflatables',          patternId:'evpat-inflatable', description:'Custom inflatable displays, arches, and structures that command attention at events. Durable nylon fabric with full-color printing, internal blower, and repair kit for reliable outdoor use.', features:['Custom shapes & sizes','Durable nylon fabric','Internal blower included','Full-color printing','Repair kit provided'], sizes:['6 ft','10 ft','15 ft','20 ft arch','Custom'] },
    'light-boxes':        { name:'Light Boxes',          patternId:'evpat-light',      description:'Illuminated display frames with edge-lit LED backlighting for vibrant, glowing graphics. Snap-open aluminum frames make graphic changes quick and easy for retail and event applications.', features:['Edge-lit LED illumination','Snap-open aluminum frame','Easy graphic changes','Single or double-sided','Wall mount or freestanding'], sizes:['18×24 in','24×36 in','36×48 in','48×72 in','Custom'] },
    'barricade-covers':   { name:'Barricade Covers',     patternId:'evpat-barricade',  description:'Custom printed covers for crowd control barricades that transform functional barriers into branded displays. Stretch fabric or vinyl covers that slip over standard steel barricades.', features:['Fits standard barricades','Stretch fabric or vinyl','Full-color printing','Easy slip-on install','Reusable for events'], sizes:['Standard barricade','Custom'] },
    'wristbands':         { name:'Wristbands',           patternId:'evpat-wristband',  description:'Custom printed event wristbands in Tyvek, vinyl, silicone, and fabric materials. Full-color printing with sequential numbering, barcodes, and security features for access control.', features:['Tyvek, vinyl, or fabric','Full-color custom printing','Sequential numbering','Security tamper-proof','Barcode/QR code ready'], sizes:['Standard adult','Custom'] },
    'floor-clings':       { name:'Floor Clings',         patternId:'lfpat-floor',      description:'Removable floor decals and clings for event wayfinding, sponsorship branding, and promotional messaging. Anti-slip laminate ensures safety while delivering high-impact floor-level advertising.', features:['Anti-slip laminate','Removable adhesive','Custom die-cut shapes','Indoor venue rated','UL 410 certified'], sizes:['12×12 in','24×24 in','36×36 in','Custom'] }
  };

  var EVENT_SLUG_TO_URL = {
    'booth-graphics':'BoothGraphics','pop-up-displays':'PopUpDisplays',
    'table-covers':'TableCovers','backdrops':'Backdrops',
    'event-tents':'EventTents','event-flags':'EventFlags',
    'podium-graphics':'PodiumGraphics','directional-signs':'DirectionalSigns',
    'badge-lanyards':'BadgesAndLanyards','red-carpet':'RedCarpet',
    'counter-displays':'CounterDisplays','kiosks':'Kiosks',
    'hanging-displays':'HangingDisplays','stage-graphics':'StageGraphics',
    'stanchion-graphics':'StanchionGraphics','inflatables':'Inflatables',
    'light-boxes':'LightBoxes','barricade-covers':'BarricadeCovers',
    'wristbands':'Wristbands','floor-clings':'FloorClings'
  };
  var EVENT_URL_TO_SLUG = {};
  Object.keys(EVENT_SLUG_TO_URL).forEach(function(k) {
    EVENT_URL_TO_SLUG[EVENT_SLUG_TO_URL[k].toLowerCase()] = k;
  });

  function openEventSub(slug) {
    var data = eventData[slug];
    if (!data) return;

    var label = document.getElementById('event-sub-label');
    var content = document.getElementById('event-sub-content');
    label.textContent = 'EVENT GRAPHICS \u2014 ' + data.name.toUpperCase();

    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');

    var nameHtml = data.name
      .replace(' Graphics', '<br><span style="color:var(--bp-cyan);">Graphics</span>')
      .replace(' Displays', '<br><span style="color:var(--bp-cyan);">Displays</span>')
      .replace(' Covers', '<br><span style="color:var(--bp-cyan);">Covers</span>')
      .replace(' Signs', '<br><span style="color:var(--bp-cyan);">Signs</span>')
      .replace(' Boxes', '<br><span style="color:var(--bp-cyan);">Boxes</span>');

    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Event Graphics</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + nameHtml + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">PRODUCT DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Available Sizes</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';

    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('event-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof EVENT_SLUG_TO_URL !== 'undefined') {
      var eventUrlSeg = EVENT_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Printing/EventGraphics/' + eventUrlSeg);
    }
  }

  function closeEventSub() {
    var subPanel = document.getElementById('event-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var eventsPanel = document.getElementById('panel-events');
    var meshWrap = eventsPanel && eventsPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Printing/EventGraphics');
  }

  // ── Marketing Sub-Panel Data & Functions ──
  var marketingData = {
    'business-cards':  { name:'Business Cards',     patternId:'mkpat-bcard',     description:'Premium business cards printed on thick card stocks with a variety of finishing options. From classic matte and glossy UV to luxury finishes like soft-touch, foil stamping, and edge painting.', features:['14pt to 32pt card stocks','Matte, glossy, or soft-touch','Foil stamping available','Edge painting & embossing','Rounded corners option'], sizes:['3.5×2 in','2×3.5 in (vertical)','2.5×2.5 in square','Custom'] },
    'brochures':       { name:'Brochures',          patternId:'mkpat-brochure',  description:'Full-color brochures in a variety of fold options on premium paper stocks. Bi-fold, tri-fold, Z-fold, gate-fold, and more — each designed to present your information in an organized, professional format.', features:['Multiple fold options','80# to 100# gloss or matte','Full-color both sides','Coating options available','Bulk quantity pricing'], sizes:['8.5×11 in','8.5×14 in','11×17 in','Custom'] },
    'flyers':          { name:'Flyers',             patternId:'mkpat-flyer',     description:'Vibrant full-color flyers on quality paper stocks for promotions, menus, handouts, and information sheets. Fast turnaround and competitive pricing make flyers ideal for high-volume distribution.', features:['Full-color one or two sides','Multiple paper weights','Glossy or matte finish','Fast turnaround available','Bulk pricing discounts'], sizes:['4.25×5.5 in','5.5×8.5 in','8.5×11 in','Custom'] },
    'postcards':       { name:'Postcards',          patternId:'mkpat-postcard',  description:'Direct mail postcards on thick card stock with full-color printing both sides. USPS-compliant sizing and addressing options for seamless integration with your direct mail campaigns.', features:['14pt or 16pt card stock','Full-color front & back','USPS compliant sizes','Mailing services available','UV or matte coating'], sizes:['4×6 in','4.25×5.5 in','5×7 in','6×9 in','Custom'] },
    'catalogs':        { name:'Catalogs',           patternId:'mkpat-catalog',   description:'Multi-page product and service catalogs with professional binding options. Saddle-stitch, perfect bind, or spiral bind — each catalog is produced with attention to color accuracy and print quality.', features:['Saddle-stitch or perfect bind','Full-color throughout','Multiple page counts','Quality paper stocks','Professional color matching'], sizes:['5.5×8.5 in','8.5×11 in','Custom'] },
    'folders':         { name:'Folders',            patternId:'mkpat-folder',    description:'Presentation folders with custom pockets, business card slits, and full-color printing. Available in standard and custom sizes with a variety of paper stocks and finishing options.', features:['One or two pockets','Business card slits','Full-color printing','Multiple stocks & finishes','Custom die-cut options'], sizes:['9×12 in standard','6×9 in small','Custom'] },
    'envelopes':       { name:'Envelopes',          patternId:'mkpat-envelope',  description:'Custom printed envelopes in standard business sizes with full-color or spot-color printing. Matching envelope and letterhead sets create a cohesive professional brand presentation.', features:['Full-color or spot color','Multiple envelope sizes','Window or non-window','Peel & seal or gummed','Matching letterhead sets'], sizes:['#10 (4.125×9.5 in)','6×9 in','9×12 in','Custom'] },
    'letterhead':      { name:'Letterhead',         patternId:'mkpat-letterhead',description:'Custom printed letterhead on premium bond or linen paper stocks. Professional stationery that reinforces your brand identity with every piece of correspondence you send.', features:['Premium bond or linen stock','Full-color printing','Consistent brand identity','Matching envelope option','Watermark available'], sizes:['8.5×11 in','Custom'] },
    'notepads':        { name:'Notepads',           patternId:'mkpat-notepad',   description:'Custom branded notepads with full-color printed pages and chipboard backing. Available with various page counts and paper stocks — a practical promotional item that keeps your brand top of mind.', features:['Full-color printed pages','Chipboard backing','Multiple page counts','Padding on top or side','Practical promo item'], sizes:['3.5×8.5 in','4.25×5.5 in','5.5×8.5 in','8.5×11 in','Custom'] },
    'booklets':        { name:'Booklets',           patternId:'mkpat-booklet',   description:'Saddle-stitched booklets and programs for events, training materials, product guides, and annual reports. Full-color printing on quality stocks with a professional finished look.', features:['Saddle-stitch binding','Full-color pages','Self-cover or plus cover','Multiple page counts','Quality stock options'], sizes:['5.5×8.5 in','6×9 in','8.5×11 in','Custom'] },
    'rack-cards':      { name:'Rack Cards',         patternId:'mkpat-rack',      description:'Standard rack card size designed to fit info racks in hotels, restaurants, tourism offices, and retail locations. Thick card stock with full-color printing and optional UV coating for durability.', features:['Standard rack-fit size','14pt card stock','Full-color both sides','UV coating for durability','Ideal for tourism & hospitality'], sizes:['4×9 in','3.5×8.5 in','Custom'] },
    'door-hangers':    { name:'Door Hangers',       patternId:'mkpat-door',      description:'Custom die-cut door hangers on thick card stock for door-to-door marketing. Full-color printing with a standard hook cut-out that fits over any standard door handle.', features:['Standard hook die-cut','14pt or 16pt card stock','Full-color both sides','Detachable coupon option','Door-to-door marketing'], sizes:['3.5×8.5 in','4.25×11 in','Custom'] },
    'invitations':     { name:'Invitations',        patternId:'mkpat-invite',    description:'Custom event invitations on premium stocks with luxury finishing options. From corporate galas to product launches — foil stamping, letterpress, embossing, and specialty papers create a memorable first impression.', features:['Premium card stocks','Foil & letterpress options','Matching envelopes','RSVP cards available','Luxury finishing touches'], sizes:['5×7 in','4×6 in','A7 (5.25×7.25 in)','Custom'] },
    'menus':           { name:'Menus',              patternId:'mkpat-menu',      description:'Restaurant and event menus on durable stocks with lamination or coating options for daily use. Full-color printing with food-safe laminate keeps menus looking pristine through heavy handling.', features:['Multiple format options','Lamination for durability','Full-color food photography','Food-safe laminate','Bi-fold or tri-fold'], sizes:['4.25×11 in','8.5×11 in','8.5×14 in','11×17 in','Custom'] },
    'calendars':       { name:'Calendars',          patternId:'mkpat-calendar',  description:'Custom wall and desk calendars with full-color photography or artwork each month. Saddle-stitched wall calendars or spiral-bound desk versions — a year-long branded presence in homes and offices.', features:['Wall or desk format','Full-color each month','Saddle-stitch or spiral','Custom start month','Year-long brand exposure'], sizes:['8.5×11 in wall','11×17 in wall','5×7 in desk','Custom'] },
    'coupons':         { name:'Coupons',            patternId:'mkpat-coupon',    description:'Custom printed coupon sheets, tear-off pads, and individual coupons for promotions and events. Perforation options, sequential numbering, and barcode printing for tracking and redemption.', features:['Perforated tear-off','Sequential numbering','Barcode/QR code printing','Variable data capable','Track redemption rates'], sizes:['2×3 in','3.5×8.5 in','8.5×11 sheet','Custom'] },
    'tickets':         { name:'Tickets',            patternId:'mkpat-ticket',    description:'Custom event tickets with sequential numbering, perforated stubs, and security features. Full-color printing on thick stock with barcodes, QR codes, and variable data for event management.', features:['Sequential numbering','Perforated stub','Full-color printing','Barcode/QR code ready','Security features optional'], sizes:['2×5.5 in','2.75×8.5 in','Custom'] },
    'magnets':         { name:'Magnets',            patternId:'mkpat-magnet',    description:'Custom printed refrigerator magnets on thick magnetic stock. A practical promotional item that keeps your brand, contact info, or calendar visible on refrigerators and filing cabinets year-round.', features:['Full-color printing','Thick magnetic stock','Custom die-cut shapes','UV-coated surface','Long-lasting promotion'], sizes:['2×3.5 in','3.5×4 in','4×6 in','Custom'] },
    'ncr-forms':       { name:'NCR Forms',          patternId:'mkpat-ncr',       description:'Carbonless copy forms (NCR — No Carbon Required) in 2-part, 3-part, or 4-part sets. Custom printed invoices, receipts, work orders, and contracts that create instant duplicate copies without carbon paper.', features:['2, 3, or 4-part sets','Carbonless copy paper','Custom form layout','Sequential numbering','Bound in books or pads'], sizes:['5.5×8.5 in','8.5×11 in','Custom'] },
    'hang-tags':       { name:'Hang Tags',          patternId:'mkpat-hangtag',   description:'Custom printed hang tags for retail products, clothing, and promotional items. Premium card stocks with custom shapes, grommets, string ties, and finishing options that enhance your product presentation.', features:['Custom die-cut shapes','Grommet & string options','Premium card stocks','Foil & embossing available','Brand your products'], sizes:['2×3 in','2.5×4 in','3×5 in','Custom'] }
  };

  var MARKETING_SLUG_TO_URL = {
    'business-cards':'BusinessCards','brochures':'Brochures',
    'flyers':'Flyers','postcards':'Postcards',
    'catalogs':'Catalogs','folders':'Folders',
    'envelopes':'Envelopes','letterhead':'Letterhead',
    'notepads':'Notepads','booklets':'Booklets',
    'rack-cards':'RackCards','door-hangers':'DoorHangers',
    'invitations':'Invitations','menus':'Menus',
    'calendars':'Calendars','coupons':'Coupons',
    'tickets':'Tickets','magnets':'Magnets',
    'ncr-forms':'NCRForms','hang-tags':'HangTags'
  };
  var MARKETING_URL_TO_SLUG = {};
  Object.keys(MARKETING_SLUG_TO_URL).forEach(function(k) {
    MARKETING_URL_TO_SLUG[MARKETING_SLUG_TO_URL[k].toLowerCase()] = k;
  });

  function openMarketingSub(slug) {
    var data = marketingData[slug];
    if (!data) return;

    var label = document.getElementById('marketing-sub-label');
    var content = document.getElementById('marketing-sub-content');
    label.textContent = 'MARKETING \u2014 ' + data.name.toUpperCase();

    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');

    var nameHtml = data.name
      .replace(' Cards', '<br><span style="color:var(--bp-cyan);">Cards</span>')
      .replace(' Forms', '<br><span style="color:var(--bp-cyan);">Forms</span>')
      .replace(' Tags', '<br><span style="color:var(--bp-cyan);">Tags</span>');

    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Marketing Materials</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + nameHtml + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">PRODUCT DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Available Sizes</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';

    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('marketing-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof MARKETING_SLUG_TO_URL !== 'undefined') {
      var mkUrlSeg = MARKETING_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Printing/MarketingMaterials/' + mkUrlSeg);
    }
  }

  function closeMarketingSub() {
    var subPanel = document.getElementById('marketing-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var mkPanel = document.getElementById('panel-marketing');
    var meshWrap = mkPanel && mkPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Printing/MarketingMaterials');
  }
  var brandStrategyData = {
    'market-research': {
      name: 'Market Research',
      patternId: 'bspat-market-research',
      description: 'Comprehensive market research that uncovers consumer behavior, industry trends, and growth opportunities. We combine quantitative data analysis with qualitative insights to give you a clear picture of your market landscape.',
      features: ['Consumer behavior analysis', 'Industry trend reports', 'Focus groups and surveys', 'Market sizing and forecasting', 'Opportunity gap identification'],
      sizes: ['Discovery Report', 'Full Market Study', 'Custom']
    },
    'competitive-analysis': {
      name: 'Competitive Analysis',
      patternId: 'bspat-competitive-analysis',
      description: 'Deep-dive analysis of your competitive landscape. We map competitor strengths, weaknesses, positioning, and market share to identify where your brand can win.',
      features: ['Competitor landscape mapping', 'Positioning gap analysis', 'Pricing and feature comparison', 'Market share estimation', 'Strategic recommendations'],
      sizes: ['Competitive Brief', 'Full Analysis Report', 'Custom']
    },
    'brand-positioning': {
      name: 'Brand Positioning',
      patternId: 'bspat-brand-positioning',
      description: 'Define where your brand lives in the minds of your customers. We craft a positioning strategy that differentiates you from competitors and resonates with your target audience.',
      features: ['Positioning statement development', 'Perceptual mapping', 'Category analysis', 'Differentiation framework', 'Competitive advantage articulation'],
      sizes: ['Positioning Statement', 'Full Strategy Document', 'Custom']
    },
    'target-audience': {
      name: 'Target Audience',
      patternId: 'bspat-target-audience',
      description: 'Identify and understand the people most likely to engage with your brand. We build detailed audience profiles based on demographics, psychographics, and behavioral data.',
      features: ['Demographic profiling', 'Psychographic segmentation', 'Behavioral analysis', 'Audience prioritization matrix', 'Channel preference mapping'],
      sizes: ['Audience Brief', 'Full Audience Study', 'Custom']
    },
    'brand-messaging': {
      name: 'Brand Messaging',
      patternId: 'bspat-brand-messaging',
      description: 'Develop a messaging framework that communicates your brand value clearly and consistently. From elevator pitches to detailed value narratives, every word is intentional.',
      features: ['Core messaging framework', 'Key message hierarchy', 'Audience-specific messaging', 'Elevator pitch development', 'Message testing and refinement'],
      sizes: ['Messaging Guide', 'Full Framework', 'Custom']
    },
    'brand-architecture': {
      name: 'Brand Architecture',
      patternId: 'bspat-brand-architecture',
      description: 'Organize your brand portfolio for clarity and growth. Whether you need a branded house, house of brands, or hybrid model, we design the structure that fits your business.',
      features: ['Portfolio structure design', 'Sub-brand relationships', 'Naming hierarchy', 'Brand extension strategy', 'Migration planning'],
      sizes: ['Architecture Brief', 'Full Strategy', 'Custom']
    },
    'value-proposition': {
      name: 'Value Proposition',
      patternId: 'bspat-value-proposition',
      description: 'Articulate why customers should choose you over every alternative. We distill your unique value into clear, compelling statements that drive conversion and loyalty.',
      features: ['Value proposition canvas', 'Customer benefit mapping', 'Competitive value analysis', 'Proof point development', 'Value messaging framework'],
      sizes: ['Value Statement', 'Full Proposition Deck', 'Custom']
    },
    'mission-vision': {
      name: 'Mission & Vision',
      patternId: 'bspat-mission-vision',
      description: 'Define the purpose that drives your organization and the future you are building toward. We craft mission and vision statements that inspire teams and attract customers.',
      features: ['Mission statement creation', 'Vision statement development', 'Core values definition', 'Purpose articulation', 'Stakeholder alignment workshops'],
      sizes: ['Statements Package', 'Full Workshop + Docs', 'Custom']
    },
    'brand-voice': {
      name: 'Brand Voice & Tone',
      patternId: 'bspat-brand-voice',
      description: 'Establish how your brand sounds across every touchpoint. We define voice attributes, tone variations, and writing guidelines that keep your communication consistent and authentic.',
      features: ['Voice attribute definition', 'Tone spectrum guidelines', 'Writing style rules', 'Channel-specific adaptations', 'Do/don\'t examples library'],
      sizes: ['Voice Guide', 'Full Voice System', 'Custom']
    },
    'brand-naming': {
      name: 'Brand Naming',
      patternId: 'bspat-brand-naming',
      description: 'Create names that are memorable, meaningful, and legally available. From company names to product lines, we develop naming options backed by linguistic analysis and trademark screening.',
      features: ['Name generation workshops', 'Linguistic and cultural analysis', 'Trademark pre-screening', 'Domain availability check', 'Shortlist presentation and rationale'],
      sizes: ['Naming Sprint', 'Full Naming Project', 'Custom']
    },
    'tagline': {
      name: 'Tagline Development',
      patternId: 'bspat-tagline',
      description: 'Craft taglines and slogans that capture your brand essence in a few powerful words. We develop options that are memorable, differentiated, and aligned with your positioning.',
      features: ['Tagline ideation sessions', 'Positioning alignment check', 'Audience testing options', 'Trademark pre-screening', 'Application guidelines'],
      sizes: ['Tagline Sprint', 'Full Development', 'Custom']
    },
    'brand-story': {
      name: 'Brand Story',
      patternId: 'bspat-brand-story',
      description: 'Build a narrative that connects your brand to your audience emotionally. We craft origin stories, brand manifestos, and narrative frameworks that give your brand depth and meaning.',
      features: ['Origin story development', 'Brand manifesto writing', 'Narrative arc framework', 'Storytelling guidelines', 'Content pillar definition'],
      sizes: ['Brand Narrative', 'Full Story System', 'Custom']
    },
    'customer-personas': {
      name: 'Customer Personas',
      patternId: 'bspat-personas',
      description: 'Create detailed, research-backed customer personas that guide every marketing and product decision. We build profiles your team will actually use, not generic templates.',
      features: ['Research-based persona creation', 'Behavioral trigger mapping', 'Journey stage alignment', 'Pain point and motivation analysis', 'Decision-making framework'],
      sizes: ['3 Personas', '5 Personas', 'Custom']
    },
    'market-segmentation': {
      name: 'Market Segmentation',
      patternId: 'bspat-segmentation',
      description: 'Divide your total addressable market into actionable segments. We identify the most profitable customer groups and develop targeting strategies for each.',
      features: ['Segmentation methodology', 'Segment profiling and sizing', 'Prioritization scoring', 'Targeting strategy per segment', 'Segment-specific messaging'],
      sizes: ['Segmentation Brief', 'Full Segmentation Study', 'Custom']
    },
    'swot-analysis': {
      name: 'SWOT Analysis',
      patternId: 'bspat-swot',
      description: 'A structured evaluation of your brand\'s strengths, weaknesses, opportunities, and threats. We go beyond the basic matrix to deliver actionable strategic recommendations.',
      features: ['Internal strengths audit', 'Weakness identification', 'Opportunity landscape scan', 'Threat assessment', 'Strategic action plan'],
      sizes: ['SWOT Report', 'SWOT + Strategy', 'Custom']
    },
    'brand-audit': {
      name: 'Brand Audit',
      patternId: 'bspat-brand-audit',
      description: 'A comprehensive review of your current brand performance across all touchpoints. We evaluate consistency, perception, and effectiveness to identify what is working and what needs change.',
      features: ['Touchpoint inventory and review', 'Brand consistency scoring', 'Customer perception analysis', 'Competitor benchmarking', 'Prioritized action items'],
      sizes: ['Quick Audit', 'Full Brand Audit', 'Custom']
    },
    'go-to-market': {
      name: 'Go-To-Market Strategy',
      patternId: 'bspat-go-to-market',
      description: 'Launch with clarity and confidence. We build go-to-market plans that cover positioning, channels, pricing, messaging, and milestones — everything you need to enter a market successfully.',
      features: ['Launch strategy development', 'Channel selection and planning', 'Pricing strategy', 'Launch timeline and milestones', 'KPI framework and tracking'],
      sizes: ['GTM Brief', 'Full GTM Plan', 'Custom']
    },
    'brand-differentiation': {
      name: 'Brand Differentiation',
      patternId: 'bspat-differentiation',
      description: 'Identify and amplify what makes your brand truly different. We analyze your category, competitors, and customers to find the unique angles that set you apart.',
      features: ['Differentiation audit', 'Category convention analysis', 'Unique value articulation', 'Proof point development', 'Differentiation messaging'],
      sizes: ['Differentiation Brief', 'Full Strategy', 'Custom']
    },
    'brand-roadmap': {
      name: 'Brand Roadmap',
      patternId: 'bspat-roadmap',
      description: 'A phased plan for building and evolving your brand over time. We set milestones, priorities, and resource recommendations so your brand investment delivers measurable results.',
      features: ['Phased brand plan (6-24 months)', 'Priority matrix', 'Resource and budget guidance', 'Milestone definitions', 'Progress review checkpoints'],
      sizes: ['6-Month Roadmap', '12-Month Roadmap', 'Custom']
    },
    'trend-analysis': {
      name: 'Trend Analysis',
      patternId: 'bspat-trends',
      description: 'Stay ahead of shifts in your industry, consumer behavior, and design culture. We deliver trend reports that help you anticipate change and position your brand for what is next.',
      features: ['Industry trend scanning', 'Consumer behavior shifts', 'Design and visual trends', 'Technology impact assessment', 'Actionable trend application'],
      sizes: ['Trend Snapshot', 'Full Trend Report', 'Custom']
    }
  };
  
  var BS_SLUG_TO_URL = {
    'market-research':'MarketResearch','competitive-analysis':'CompetitiveAnalysis','brand-positioning':'BrandPositioning',
    'target-audience':'TargetAudience','brand-messaging':'BrandMessaging','brand-architecture':'BrandArchitecture',
    'value-proposition':'ValueProposition','mission-vision':'MissionAndVision','brand-voice':'BrandVoiceAndTone',
    'brand-naming':'BrandNaming','tagline':'TaglineDevelopment','brand-story':'BrandStory',
    'customer-personas':'CustomerPersonas','market-segmentation':'MarketSegmentation','swot-analysis':'SWOTAnalysis',
    'brand-audit':'BrandAudit','go-to-market':'GoToMarketStrategy','brand-differentiation':'BrandDifferentiation',
    'brand-roadmap':'BrandRoadmap','trend-analysis':'TrendAnalysis'
  };
  var BS_URL_TO_SLUG = {};
  Object.keys(BS_SLUG_TO_URL).forEach(function(k) { BS_URL_TO_SLUG[BS_SLUG_TO_URL[k].toLowerCase()] = k; });
  
  function openBrandStrategySub(slug) {
    var data = brandStrategyData[slug];
    if (!data) return;
    var label = document.getElementById('brand-strategy-sub-label');
    var content = document.getElementById('brand-strategy-sub-content');
    label.textContent = 'BRAND STRATEGY \u2014 ' + data.name.toUpperCase();
    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Brand Strategy</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + data.name + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">SERVICE DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px;">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('brand-strategy-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof BS_SLUG_TO_URL !== 'undefined') {
      var bsUrlSeg = BS_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Services/BrandStrategy/' + bsUrlSeg);
    }
  }
  
  function closeBrandStrategySub() {
    var subPanel = document.getElementById('brand-strategy-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var parentPanel = document.querySelector('#panel-bs-research, #panel-bs-positioning, #panel-bs-architecture, #panel-bs-direction');
    var meshWrap = parentPanel && parentPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Services/BrandStrategy');
  }
  
  
  // ══════════════════════════════════════════════════════════
  //  BRAND IDENTITY — Data & Functions
  // ══════════════════════════════════════════════════════════
  
  var brandIdentityData = {
    'logo-design': {
      name: 'Logo Design',
      patternId: 'bipat-logo-design',
      description: 'Custom logo design that captures your brand essence in a single mark. We develop multiple concepts, refine your selection, and deliver a versatile logo system ready for every application.',
      features: ['Multiple concept exploration', 'Iterative refinement rounds', 'Full logo system (primary, secondary, icon)', 'Vector files for all sizes', 'Usage guidelines included'],
      sizes: ['Logo Mark', 'Full Logo System', 'Custom']
    },
    'color-systems': {
      name: 'Color Systems',
      patternId: 'bipat-color-systems',
      description: 'Strategic color palettes that evoke the right emotions and ensure brand recognition. We define primary, secondary, and accent colors with precise specifications for print and digital.',
      features: ['Primary and secondary palette', 'Accent and neutral definitions', 'CMYK, RGB, HEX, Pantone specs', 'Accessibility contrast compliance', 'Application examples'],
      sizes: ['Core Palette', 'Extended Color System', 'Custom']
    },
    'brand-guidelines': {
      name: 'Brand Guidelines',
      patternId: 'bipat-brand-guidelines',
      description: 'Comprehensive brand guidelines that ensure consistency across every touchpoint. From logo usage rules to typography specs, your team gets a clear playbook for maintaining brand integrity.',
      features: ['Logo usage rules and clear space', 'Color and typography specifications', 'Photography and image style', 'Do/don\'t examples', 'Digital and print application guides'],
      sizes: ['Essential Guide', 'Comprehensive Guide', 'Custom']
    },
    'typography-systems': {
      name: 'Typography Systems',
      patternId: 'bipat-typography',
      description: 'Type systems that create hierarchy, readability, and brand personality. We select and pair typefaces, define scales, and build rules for consistent typographic expression.',
      features: ['Typeface selection and pairing', 'Type scale definition', 'Heading and body hierarchy', 'Weight and style usage rules', 'Web and print specifications'],
      sizes: ['Type Pairing', 'Full Type System', 'Custom']
    },
    'icon-sets': {
      name: 'Icon Sets',
      patternId: 'bipat-icon-sets',
      description: 'Custom icon systems designed to match your brand language. Consistent stroke weights, corner radii, and visual metaphors that work seamlessly across digital and print.',
      features: ['Custom icon design (20-100+ icons)', 'Consistent style and grid system', 'SVG and PNG delivery', 'Multiple sizes and weights', 'Icon usage guidelines'],
      sizes: ['20 Icons', '50 Icons', '100+ Icons', 'Custom']
    },
    'pattern-texture': {
      name: 'Pattern & Texture',
      patternId: 'bipat-pattern-texture',
      description: 'Branded patterns and textures that add depth and recognition to your visual identity. From subtle backgrounds to bold surface treatments, every pattern reinforces your brand.',
      features: ['Seamless repeating patterns', 'Texture overlays and treatments', 'Multiple colorway options', 'Print and digital formats', 'Application mockups included'],
      sizes: ['3 Patterns', '6 Patterns', 'Custom']
    },
    'stationery-suite': {
      name: 'Stationery Suite',
      patternId: 'bipat-stationery',
      description: 'Professional stationery that makes every business interaction on-brand. Business cards, letterheads, envelopes, and notecards designed as a cohesive system.',
      features: ['Business card design', 'Letterhead and envelope', 'Notecard and compliment slip', 'Print-ready files', 'Paper and finish recommendations'],
      sizes: ['Basic Suite', 'Full Suite', 'Custom']
    },
    'brand-collateral': {
      name: 'Brand Collateral',
      patternId: 'bipat-collateral',
      description: 'All the branded materials your business needs to operate professionally. From folders to invoices, every piece is designed within your brand system for a polished, unified look.',
      features: ['Folder and insert design', 'Invoice and proposal templates', 'Branded document templates', 'Digital and print formats', 'Editable file delivery'],
      sizes: ['Collateral Starter', 'Full Collateral Kit', 'Custom']
    },
    'social-media-kits': {
      name: 'Social Media Kits',
      patternId: 'bipat-social-media',
      description: 'Platform-optimized social media templates and assets. Profile images, cover photos, post templates, and story formats — all designed for consistency and scroll-stopping impact.',
      features: ['Profile and cover image design', 'Post and story templates', 'Highlight cover icons', 'Platform-specific sizing', 'Editable Canva/Figma files'],
      sizes: ['Single Platform', 'Multi-Platform Kit', 'Custom']
    },
    'email-templates': {
      name: 'Email Templates',
      patternId: 'bipat-email',
      description: 'Branded email templates for newsletters, announcements, and transactional messages. Designed for readability across all email clients with clean, responsive layouts.',
      features: ['Newsletter template design', 'Announcement and promo templates', 'Responsive HTML email build', 'Email client compatibility', 'Editable template delivery'],
      sizes: ['Single Template', 'Template Suite (3-5)', 'Custom']
    },
    'presentation-decks': {
      name: 'Presentation Decks',
      patternId: 'bipat-presentations',
      description: 'Branded presentation templates that make your team look polished in every meeting. Master slides, chart styles, and layout options designed for PowerPoint, Keynote, or Google Slides.',
      features: ['Master slide library', 'Chart and graph styles', 'Icon and image placeholders', 'Multiple layout options', 'Editable source files'],
      sizes: ['Starter Deck (10 slides)', 'Full Deck (25+ slides)', 'Custom']
    },
    'signage-standards': {
      name: 'Signage Standards',
      patternId: 'bipat-signage',
      description: 'Interior and exterior signage guidelines that ensure your physical presence matches your brand. Wayfinding, door signs, lobby displays, and directional systems.',
      features: ['Interior signage system', 'Exterior signage specifications', 'Wayfinding and directional design', 'Material and finish recommendations', 'Installation specifications'],
      sizes: ['Signage Guide', 'Full Signage System', 'Custom']
    },
    'vehicle-wrap': {
      name: 'Vehicle Wrap Design',
      patternId: 'bipat-vehicle-wrap',
      description: 'Turn your fleet into mobile billboards with custom vehicle wrap designs. We create eye-catching wraps that maximize brand visibility on cars, vans, trucks, and trailers.',
      features: ['Full wrap design', 'Partial wrap and spot graphics', 'Vehicle template accuracy', 'Print-ready production files', '3D mockup visualization'],
      sizes: ['Partial Wrap', 'Full Wrap', 'Fleet Package', 'Custom']
    },
    'uniform-branding': {
      name: 'Uniform Branding',
      patternId: 'bipat-uniform',
      description: 'Branded uniform and workwear design that builds team identity and professionalism. From embroidered polos to full outfit systems, we design apparel that represents your brand.',
      features: ['Uniform design and mockups', 'Logo placement guidelines', 'Color and material specifications', 'Embroidery and print artwork', 'Size range templates'],
      sizes: ['Single Item Design', 'Full Uniform System', 'Custom']
    },
    'brand-photography': {
      name: 'Brand Photography Style',
      patternId: 'bipat-photography',
      description: 'Define the visual language for your brand photography. We create mood boards, shot lists, editing presets, and style guides that ensure every photo feels unmistakably yours.',
      features: ['Photography style guide', 'Mood board and references', 'Shot list templates', 'Editing preset specifications', 'Subject and composition rules'],
      sizes: ['Style Guide', 'Full Photo Direction', 'Custom']
    },
    'illustration-style': {
      name: 'Illustration Style',
      patternId: 'bipat-illustration',
      description: 'A custom illustration style that adds personality and originality to your brand. We develop a visual language for illustrations that works across marketing, product, and editorial.',
      features: ['Illustration style development', 'Character and object library', 'Color and stroke guidelines', 'Usage and application rules', 'Sample illustration set'],
      sizes: ['Style Guide', 'Style + Sample Set', 'Custom']
    },
    'motion-graphics': {
      name: 'Motion Graphics Style',
      patternId: 'bipat-motion',
      description: 'Define how your brand moves. We create motion style guides covering animation principles, timing curves, transitions, and effects that bring your brand to life on screen.',
      features: ['Animation principles and timing', 'Transition style library', 'Logo animation specifications', 'Motion asset templates', 'Platform-specific guidelines'],
      sizes: ['Motion Guide', 'Guide + Logo Animation', 'Custom']
    },
    'brand-book': {
      name: 'Brand Book',
      patternId: 'bipat-brand-book',
      description: 'The definitive document for your brand. A beautifully designed brand book that combines strategy, identity, and guidelines into a single, comprehensive reference your team and partners will use daily.',
      features: ['Strategy and positioning recap', 'Full visual identity standards', 'Application guidelines', 'Print-ready and digital formats', 'Interactive PDF option'],
      sizes: ['Essential Brand Book', 'Premium Brand Book', 'Custom']
    },
    'sub-brand-systems': {
      name: 'Sub-Brand Systems',
      patternId: 'bipat-sub-brand',
      description: 'Design identity systems for sub-brands, product lines, and brand extensions that connect back to your master brand. We balance differentiation with family cohesion.',
      features: ['Sub-brand identity design', 'Relationship to master brand', 'Naming and visual hierarchy', 'Co-existence guidelines', 'Application templates'],
      sizes: ['Single Sub-Brand', 'Multi Sub-Brand System', 'Custom']
    },
    'co-branding-kits': {
      name: 'Co-Branding Kits',
      patternId: 'bipat-co-branding',
      description: 'Templates and guidelines for brand partnerships. We create co-branding kits that make it easy for partners to use your brand alongside theirs while maintaining integrity for both.',
      features: ['Co-branding lockup designs', 'Clear space and sizing rules', 'Color and background guidelines', 'Partner asset templates', 'Approval workflow guide'],
      sizes: ['Co-Brand Guide', 'Full Partnership Kit', 'Custom']
    }
  };
  
  var BI_SLUG_TO_URL = {
    'logo-design':'LogoDesign','color-systems':'ColorSystems','brand-guidelines':'BrandGuidelines',
    'typography-systems':'TypographySystems','icon-sets':'IconSets','pattern-texture':'PatternAndTexture',
    'stationery-suite':'StationerySuite','brand-collateral':'BrandCollateral','social-media-kits':'SocialMediaKits',
    'email-templates':'EmailTemplates','presentation-decks':'PresentationDecks','signage-standards':'SignageStandards',
    'vehicle-wrap':'VehicleWrapDesign','uniform-branding':'UniformBranding','brand-photography':'BrandPhotographyStyle',
    'illustration-style':'IllustrationStyle','motion-graphics':'MotionGraphicsStyle','brand-book':'BrandBook',
    'sub-brand-systems':'SubBrandSystems','co-branding-kits':'CoBrandingKits'
  };
  var BI_URL_TO_SLUG = {};
  Object.keys(BI_SLUG_TO_URL).forEach(function(k) { BI_URL_TO_SLUG[BI_SLUG_TO_URL[k].toLowerCase()] = k; });
  
  function openBrandIdentitySub(slug) {
    var data = brandIdentityData[slug];
    if (!data) return;
    var label = document.getElementById('brand-identity-sub-label');
    var content = document.getElementById('brand-identity-sub-content');
    label.textContent = 'BRAND IDENTITY \u2014 ' + data.name.toUpperCase();
    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Brand Identity</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + data.name + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">SERVICE DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px;">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('brand-identity-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof BI_SLUG_TO_URL !== 'undefined') {
      var biUrlSeg = BI_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Services/BrandIdentity/' + biUrlSeg);
    }
  }
  
  function closeBrandIdentitySub() {
    var subPanel = document.getElementById('brand-identity-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var parentPanel = document.querySelector('#panel-bi-logos, #panel-bi-systems, #panel-bi-collateral, #panel-bi-applied');
    var meshWrap = parentPanel && parentPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Services/BrandIdentity');
  }
  
  
  // ══════════════════════════════════════════════════════════
  //  GRAPHIC DESIGN — Data & Functions
  // ══════════════════════════════════════════════════════════
  
  var graphicDesignData = {
    'print-design': {
      name: 'Print Design',
      patternId: 'gdpat-print-design',
      description: 'Production-ready print design for every format. From business cards to brochures, we create artwork that translates flawlessly from screen to paper with proper bleed, color profiles, and resolution.',
      features: ['CMYK color-accurate design', 'Bleed and trim mark setup', 'Print-ready PDF delivery', 'Paper and finish consultation', 'Press-check support available'],
      sizes: ['Single Piece', 'Print Suite (3-5)', 'Custom']
    },
    'digital-graphics': {
      name: 'Digital Graphics',
      patternId: 'gdpat-digital-graphics',
      description: 'Screen-optimized graphics for web, apps, and digital platforms. We deliver pixel-perfect assets in the right formats and resolutions for every digital context.',
      features: ['Web and app graphics', 'Retina and HiDPI optimization', 'Multiple format delivery (PNG, SVG, WebP)', 'Responsive size variations', 'Asset library organization'],
      sizes: ['Single Asset', 'Asset Pack (5-10)', 'Custom']
    },
    'illustrations': {
      name: 'Illustrations',
      patternId: 'gdpat-illustrations',
      description: 'Custom illustrations that bring concepts to life with originality and style. From editorial spots to full-scene compositions, every illustration is crafted to your brand voice.',
      features: ['Custom concept development', 'Multiple style options', 'Editorial and marketing use', 'Vector and raster delivery', 'Licensing included'],
      sizes: ['Spot Illustration', 'Full Scene', 'Illustration Series', 'Custom']
    },
    'infographics': {
      name: 'Infographics',
      patternId: 'gdpat-infographics',
      description: 'Transform complex data into clear, visually compelling infographics. We combine information design principles with your brand aesthetics to make data stories that engage and inform.',
      features: ['Data visualization design', 'Statistical chart styling', 'Flow and process diagrams', 'Interactive infographic options', 'Social-ready formats'],
      sizes: ['Single Infographic', 'Infographic Series', 'Custom']
    },
    'icon-design': {
      name: 'Icon Design',
      patternId: 'gdpat-icon-design',
      description: 'Custom icon design for apps, websites, and marketing materials. We build icon systems with consistent weight, style, and visual language that strengthen your brand communication.',
      features: ['Custom icon creation', 'Consistent grid and style', 'Multiple sizes and states', 'SVG and PNG delivery', 'Icon usage documentation'],
      sizes: ['10 Icons', '25 Icons', '50+ Icons', 'Custom']
    },
    'pattern-design': {
      name: 'Pattern Design',
      patternId: 'gdpat-pattern-design',
      description: 'Seamless repeating patterns for packaging, textiles, wallpaper, and digital backgrounds. We design patterns that tile perfectly and add visual richness to any surface.',
      features: ['Seamless tile design', 'Multiple colorway options', 'Textile and packaging specs', 'Vector source files', 'Scale and repeat guidelines'],
      sizes: ['Single Pattern', 'Pattern Collection (3-5)', 'Custom']
    },
    'tshirt-graphics': {
      name: 'T-Shirt Graphics',
      patternId: 'gdpat-tshirt',
      description: 'Graphic designs built specifically for apparel printing. We account for print method limitations, garment color, and placement to deliver artwork that looks great on fabric.',
      features: ['Print-method optimized artwork', 'Color separation if needed', 'Placement and sizing mockups', 'Multiple garment color versions', 'Production-ready files'],
      sizes: ['Single Design', 'Design Collection (3-5)', 'Custom']
    },
    'album-artwork': {
      name: 'Album Artwork',
      patternId: 'gdpat-album',
      description: 'Cover art and packaging design for music releases. From single covers to full album packages with booklets, we create artwork that captures the sound and mood of your music.',
      features: ['Cover art design', 'Booklet and liner notes', 'Disc and label artwork', 'Digital platform specifications', 'Physical packaging layout'],
      sizes: ['Single Cover', 'Full Album Package', 'Custom']
    },
    'book-covers': {
      name: 'Book Covers',
      patternId: 'gdpat-book-covers',
      description: 'Book cover design that commands attention on shelves and screens. We create covers that communicate genre, tone, and quality while meeting publisher specifications.',
      features: ['Front cover concept design', 'Full wrap (front, spine, back)', 'E-book cover optimization', 'Series style consistency', 'ISBN and barcode placement'],
      sizes: ['E-Book Cover', 'Full Wrap Cover', 'Series Package', 'Custom']
    },
    'magazine-layouts': {
      name: 'Magazine Layouts',
      patternId: 'gdpat-magazine',
      description: 'Editorial layout design for magazines, journals, and periodicals. We create grid systems, master pages, and style sheets that make multi-page publications look polished and professional.',
      features: ['Grid system and master pages', 'Feature spread design', 'Typography and style sheets', 'Photo and image treatment', 'Print-ready production files'],
      sizes: ['Feature Spread (2-4 pages)', 'Full Issue Layout', 'Custom']
    },
    'poster-design': {
      name: 'Poster Design',
      patternId: 'gdpat-poster',
      description: 'Bold poster design for events, promotions, and brand campaigns. We create large-format artwork with high visual impact that communicates your message at a glance.',
      features: ['Large-format composition', 'High-impact visual hierarchy', 'Multiple size adaptations', 'Print-ready production files', 'Digital version included'],
      sizes: ['Standard Poster', 'Large Format', 'Series (3+)', 'Custom']
    },
    'billboard-design': {
      name: 'Billboard Design',
      patternId: 'gdpat-billboard',
      description: 'Billboard and outdoor advertising design built for instant impact. We create layouts that communicate in seconds with bold typography, minimal copy, and maximum visual punch.',
      features: ['High-visibility composition', 'Readable at speed and distance', 'Multiple format sizes', 'Digital billboard adaptations', 'Production-spec delivery'],
      sizes: ['Standard Billboard', 'Digital Billboard', 'Multi-Format Package', 'Custom']
    },
    'packaging-graphics': {
      name: 'Packaging Graphics',
      patternId: 'gdpat-packaging',
      description: 'Surface graphics for product packaging that drive shelf appeal and brand recognition. We design artwork that works within structural constraints while maximizing visual impact.',
      features: ['Dieline-accurate artwork', 'Color and finish specifications', 'Regulatory and info placement', 'Mockup visualization', 'Production-ready files'],
      sizes: ['Single SKU', 'Product Line (3-5)', 'Custom']
    },
    'social-media-graphics': {
      name: 'Social Media Graphics',
      patternId: 'gdpat-social',
      description: 'Scroll-stopping social media graphics designed for engagement. From feed posts to stories and ads, every graphic is sized correctly and optimized for each platform.',
      features: ['Platform-specific sizing', 'Feed post and story formats', 'Ad creative variations', 'Animated options available', 'Editable template files'],
      sizes: ['Single Post', 'Content Pack (10)', 'Monthly Package', 'Custom']
    },
    'email-graphics': {
      name: 'Email Graphics',
      patternId: 'gdpat-email-graphics',
      description: 'Custom graphics optimized for email delivery. Headers, banners, product images, and promotional graphics designed to render correctly across all major email clients.',
      features: ['Email-safe image formats', 'Retina-optimized sizing', 'File size optimization', 'Email client compatibility', 'Template integration ready'],
      sizes: ['Single Graphic', 'Email Graphic Set', 'Custom']
    },
    'presentation-design': {
      name: 'Presentation Design',
      patternId: 'gdpat-presentation',
      description: 'Custom presentation graphics that elevate your pitch. Data visualizations, diagrams, icons, and slide artwork designed to support your narrative and impress your audience.',
      features: ['Custom data visualizations', 'Diagram and flow chart design', 'Slide artwork and backgrounds', 'Icon and illustration assets', 'Animated transition options'],
      sizes: ['Single Presentation', 'Presentation Suite', 'Custom']
    },
    'photo-retouching': {
      name: 'Photo Retouching',
      patternId: 'gdpat-retouching',
      description: 'Professional photo retouching and enhancement that brings out the best in every image. From color correction to complex compositing, we deliver flawless results.',
      features: ['Color correction and grading', 'Skin and product retouching', 'Background removal and replacement', 'Composite and manipulation', 'Batch processing available'],
      sizes: ['Single Image', 'Batch (10-25)', 'Batch (50+)', 'Custom']
    },
    'digital-painting': {
      name: 'Digital Painting',
      patternId: 'gdpat-digital-painting',
      description: 'Original digital paintings created from scratch for editorial, marketing, and personal commissions. Rich, textured artwork with the depth and detail of traditional painting.',
      features: ['Original concept and composition', 'High-resolution output', 'Multiple revision rounds', 'Print and digital delivery', 'Full copyright transfer'],
      sizes: ['Character/Portrait', 'Full Scene', 'Series', 'Custom']
    },
    'typography-art': {
      name: 'Typography Art',
      patternId: 'gdpat-typography-art',
      description: 'Custom typographic artwork where letters become the design. Hand-lettering, type compositions, and decorative typography that communicates through form as much as content.',
      features: ['Custom hand-lettering', 'Typographic composition', 'Decorative type treatments', 'Vector and raster options', 'Print and digital formats'],
      sizes: ['Single Piece', 'Type Collection', 'Custom']
    },
    'merchandise-graphics': {
      name: 'Merchandise Graphics',
      patternId: 'gdpat-merchandise',
      description: 'Graphics designed specifically for merchandise production. Mugs, totes, phone cases, stickers, and more — we create artwork optimized for each product\'s print method and surface.',
      features: ['Product-specific artwork', 'Print method optimization', 'Mockup visualization', 'Production-ready files', 'Multi-product adaptation'],
      sizes: ['Single Product', 'Merch Collection (3-5)', 'Full Merch Line', 'Custom']
    }
  };
  
  var GD_SLUG_TO_URL = {
    'print-design':'PrintDesign','digital-graphics':'DigitalGraphics','illustrations':'Illustrations',
    'infographics':'Infographics','icon-design':'IconDesign','pattern-design':'PatternDesign',
    'tshirt-graphics':'TShirtGraphics','album-artwork':'AlbumArtwork','book-covers':'BookCovers',
    'magazine-layouts':'MagazineLayouts','poster-design':'PosterDesign','billboard-design':'BillboardDesign',
    'packaging-graphics':'PackagingGraphics','social-media-graphics':'SocialMediaGraphics','email-graphics':'EmailGraphics',
    'presentation-design':'PresentationDesign','photo-retouching':'PhotoRetouching','digital-painting':'DigitalPainting',
    'typography-art':'TypographyArt','merchandise-graphics':'MerchandiseGraphics'
  };
  var GD_URL_TO_SLUG = {};
  Object.keys(GD_SLUG_TO_URL).forEach(function(k) { GD_URL_TO_SLUG[GD_SLUG_TO_URL[k].toLowerCase()] = k; });
  
  function openGraphicDesignSub(slug) {
    var data = graphicDesignData[slug];
    if (!data) return;
    var label = document.getElementById('graphic-design-sub-label');
    var content = document.getElementById('graphic-design-sub-content');
    label.textContent = 'GRAPHIC DESIGN \u2014 ' + data.name.toUpperCase();
    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Graphic Design</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + data.name + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">SERVICE DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px;">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('graphic-design-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof GD_SLUG_TO_URL !== 'undefined') {
      var gdUrlSeg = GD_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Services/GraphicDesign/' + gdUrlSeg);
    }
  }
  
  function closeGraphicDesignSub() {
    var subPanel = document.getElementById('graphic-design-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var parentPanel = document.querySelector('#panel-gd-print, #panel-gd-digital, #panel-gd-illustration, #panel-gd-product');
    var meshWrap = parentPanel && parentPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Services/GraphicDesign');
  }
  
  var layoutDesignData = {
    'brochures': {
      name: 'Brochures',
      patternId: 'ldpat-brochures',
      description: 'Custom brochure design for tri-fold, bi-fold, gate-fold, and multi-panel formats. We create layouts that guide the reader through your message with clear hierarchy and compelling visuals. Every brochure is print-ready with proper bleeds and fold marks.',
      features: ['Tri-fold, bi-fold, and gate-fold layouts', 'Print-ready files with bleeds and crop marks', 'Custom illustrations and infographics', 'Paper stock and finish consultation', 'Unlimited revisions until approval'],
      sizes: ['8.5×11 in', '8.5×14 in', '11×17 in', 'Custom']
    },
    'catalogs': {
      name: 'Catalogs',
      patternId: 'ldpat-catalogs',
      description: 'Product and service catalog design with organized grids, clean typography, and consistent page templates. We build catalogs that make browsing intuitive and purchasing easy. From 8-page lookbooks to 200-page product bibles.',
      features: ['Product grid and listing layouts', 'Consistent template system throughout', 'Table of contents and index design', 'SKU and pricing table formatting', 'Digital and print-ready exports'],
      sizes: ['8.5×11 in', '6×9 in', '9×12 in', 'Custom']
    },
    'annual-reports': {
      name: 'Annual Reports',
      patternId: 'ldpat-annualreports',
      description: 'Annual report design that transforms complex data into compelling narratives. We combine financial charts, infographics, and editorial photography into a polished document that reflects your organization\'s achievements and vision.',
      features: ['Data visualization and infographics', 'Financial table and chart design', 'Executive portrait integration', 'Sustainability and impact sections', 'Interactive PDF and print versions'],
      sizes: ['8.5×11 in', 'A4', '9×12 in', 'Custom']
    },
    'magazines': {
      name: 'Magazines',
      patternId: 'ldpat-magazines',
      description: 'Magazine layout design with editorial spreads, feature articles, and advertising placements. We create page templates that balance photography, typography, and white space for maximum readability and visual impact.',
      features: ['Editorial spread and feature layouts', 'Master page template systems', 'Ad placement and sizing guides', 'Cover design with masthead', 'Digital flipbook export option'],
      sizes: ['8.5×11 in', '8.375×10.875 in', 'A4', 'Custom']
    },
    'newsletters': {
      name: 'Newsletters',
      patternId: 'ldpat-newsletters',
      description: 'Newsletter design for recurring internal and external communications. We build flexible templates that your team can update each issue while maintaining brand consistency and professional presentation.',
      features: ['Reusable issue-to-issue templates', 'Header and section navigation design', 'Photo and pull-quote formatting', 'Print and email-ready versions', 'Brand-consistent color system'],
      sizes: ['8.5×11 in', '11×17 in folded', 'Digital', 'Custom']
    },
    'white-papers': {
      name: 'White Papers',
      patternId: 'ldpat-whitepapers',
      description: 'Professional white paper layouts that present research and thought leadership with authority. We design clean, data-rich documents that position your organization as an industry expert and generate qualified leads.',
      features: ['Clean academic-style formatting', 'Chart and data table integration', 'Footnote and citation styling', 'Lead-gen cover page design', 'Gated PDF download formatting'],
      sizes: ['8.5×11 in', 'A4', 'Letter', 'Custom']
    },
    'ebooks': {
      name: 'E-books',
      patternId: 'ldpat-ebooks',
      description: 'Digital e-book design optimized for screen reading and tablet devices. We create layouts with proper digital typography, interactive navigation, and responsive formatting that works across readers and devices.',
      features: ['Screen-optimized typography', 'Interactive table of contents', 'EPUB and PDF export formats', 'Tablet and phone-friendly layouts', 'Hyperlinked cross-references'],
      sizes: ['Standard ebook', 'Fixed layout', 'PDF', 'Custom']
    },
    'lookbooks': {
      name: 'Lookbooks',
      patternId: 'ldpat-lookbooks',
      description: 'Visual lookbook design that showcases products, collections, or portfolios with editorial flair. Full-bleed photography, minimal text, and sophisticated layouts that let your work speak for itself.',
      features: ['Full-bleed photo layouts', 'Minimal, editorial typography', 'Collection and season organization', 'Print and digital versions', 'Mood board-inspired spreads'],
      sizes: ['8.5×11 in', '9×12 in', '7×10 in', 'Custom']
    },
    'media-kits': {
      name: 'Media Kits',
      patternId: 'ldpat-mediakits',
      description: 'Press and media kit design that packages your brand story, stats, and assets into a polished, easy-to-navigate document. Everything a journalist or partner needs to feature your brand accurately.',
      features: ['Brand story and history section', 'Key statistics and metrics display', 'Executive bio and headshot pages', 'Logo usage and asset guidelines', 'Contact and social media directory'],
      sizes: ['8.5×11 in', 'A4', 'Digital PDF', 'Custom']
    },
    'pitch-decks': {
      name: 'Pitch Decks',
      patternId: 'ldpat-pitchdecks',
      description: 'Investor and client pitch deck design that tells your story with clarity and conviction. We structure slides for maximum impact — from problem statements to financial projections — with visuals that reinforce your narrative.',
      features: ['Narrative arc and slide structure', 'Data visualization for financials', 'Custom icon and illustration sets', 'Keynote, PowerPoint, and Google Slides', 'Presenter notes and script support'],
      sizes: ['16:9 widescreen', '4:3 standard', 'Custom ratio', 'PDF']
    },
    'proposals': {
      name: 'Proposals',
      patternId: 'ldpat-proposals',
      description: 'Business proposal templates that combine professionalism with persuasion. We design structured documents with clear pricing tables, scope sections, and branded covers that help you close deals faster.',
      features: ['Branded cover and intro pages', 'Scope of work section templates', 'Pricing and timeline tables', 'Terms and signature pages', 'Editable template for future use'],
      sizes: ['8.5×11 in', 'A4', 'Digital PDF', 'Custom']
    },
    'manuals': {
      name: 'Manuals',
      patternId: 'ldpat-manuals',
      description: 'Technical manual and instruction guide design with clear step-by-step layouts, numbered procedures, and safety callouts. We make complex information accessible through smart visual hierarchy and consistent formatting.',
      features: ['Step-by-step procedural layouts', 'Safety and warning callout boxes', 'Technical diagram integration', 'Index and glossary formatting', 'Multi-language layout support'],
      sizes: ['8.5×11 in', '6×9 in', 'A4', 'Custom']
    },
    'style-guides': {
      name: 'Style Guides',
      patternId: 'ldpat-styleguides',
      description: 'Brand style guide design that documents your visual identity system in a clear, usable format. From logo specifications to color values, typography scales to photo treatments — every brand rule in one reference document.',
      features: ['Logo usage rules and clear space', 'Color palette with exact values', 'Typography scale and pairing specs', 'Photography and illustration guidelines', 'Do/don\'t visual examples'],
      sizes: ['8.5×11 in', 'A4', 'Digital PDF', 'Custom']
    },
    'case-studies': {
      name: 'Case Studies',
      patternId: 'ldpat-casestudies',
      description: 'Case study layouts that tell client success stories with data-backed results. We design documents that walk readers from challenge through solution to measurable outcomes, with pull quotes, metrics, and before-after comparisons.',
      features: ['Challenge-solution-result structure', 'Metric and KPI highlight boxes', 'Client quote and testimonial callouts', 'Before-and-after comparisons', 'CTA integration for lead generation'],
      sizes: ['8.5×11 in', 'A4', '1-pager', 'Custom']
    },
    'research-reports': {
      name: 'Research Reports',
      patternId: 'ldpat-researchreports',
      description: 'Research report design that presents findings with academic rigor and visual clarity. We handle complex data sets, methodology sections, and multi-chapter structures while keeping the document engaging and scannable.',
      features: ['Multi-chapter structure and navigation', 'Complex data table formatting', 'Methodology and appendix sections', 'Citation and bibliography styling', 'Executive summary design'],
      sizes: ['8.5×11 in', 'A4', 'Letter', 'Custom']
    },
    'datasheets': {
      name: 'Datasheets',
      patternId: 'ldpat-datasheets',
      description: 'Product and technical datasheet design that presents specifications, features, and performance data in a scannable single-page or two-page format. Engineered for quick reference and easy comparison.',
      features: ['Specification table layouts', 'Product image and diagram placement', 'Performance chart integration', 'Comparison grid formatting', 'Quick-reference sidebar design'],
      sizes: ['8.5×11 in', 'A4', '2-page spread', 'Custom']
    },
    'fact-sheets': {
      name: 'Fact Sheets',
      patternId: 'ldpat-factsheets',
      description: 'Fact sheet design that distills key information into a single, impactful page. Perfect for sales teams, trade shows, and stakeholder briefings where quick comprehension matters most.',
      features: ['Single-page information hierarchy', 'Key stat and metric callouts', 'Bullet point and icon formatting', 'Contact and CTA footer design', 'Print and digital versions'],
      sizes: ['8.5×11 in', 'A4', 'Half-page', 'Custom']
    },
    'program-guides': {
      name: 'Program Guides',
      patternId: 'ldpat-programguides',
      description: 'Program and event guide design with schedules, speaker bios, venue maps, and sponsor recognition. We create guides that attendees actually use — well-organized, easy to navigate, and branded throughout.',
      features: ['Schedule and timeline layouts', 'Speaker and presenter bios', 'Venue map and floor plan integration', 'Sponsor and exhibitor directories', 'Notes pages and QR code integration'],
      sizes: ['5.5×8.5 in', '8.5×11 in', '6×9 in', 'Custom']
    },
    'directories': {
      name: 'Directories',
      patternId: 'ldpat-directories',
      description: 'Directory design for member organizations, industry associations, and community groups. We build alphabetical, categorical, and geographic listing systems with clear navigation and consistent entry formatting.',
      features: ['Alphabetical and categorical sorting', 'Member listing card templates', 'Advertisement page integration', 'Index and cross-reference system', 'Annual update template system'],
      sizes: ['8.5×11 in', '6×9 in', '5.5×8.5 in', 'Custom']
    },
    'yearbooks': {
      name: 'Yearbooks',
      patternId: 'ldpat-yearbooks',
      description: 'Yearbook design that captures memories and milestones in a commemorative volume. From portrait grids and activity pages to superlatives and senior tributes — we create keepsakes that last a lifetime.',
      features: ['Portrait grid and class layouts', 'Activity and event photo spreads', 'Superlative and tribute page templates', 'Cover design with custom artwork', 'Hardcover and softcover specifications'],
      sizes: ['8.5×11 in', '9×12 in', '8×10 in', 'Custom']
    }
  };
  
  var LAYOUT_SLUG_TO_URL = {
    'brochures':'Brochures','catalogs':'Catalogs','annual-reports':'AnnualReports',
    'magazines':'Magazines','newsletters':'Newsletters','white-papers':'WhitePapers',
    'ebooks':'Ebooks','lookbooks':'Lookbooks','media-kits':'MediaKits',
    'pitch-decks':'PitchDecks','proposals':'Proposals','manuals':'Manuals',
    'style-guides':'StyleGuides','case-studies':'CaseStudies','research-reports':'ResearchReports',
    'datasheets':'Datasheets','fact-sheets':'FactSheets','program-guides':'ProgramGuides',
    'directories':'Directories','yearbooks':'Yearbooks'
  };
  var LAYOUT_URL_TO_SLUG = {};
  Object.keys(LAYOUT_SLUG_TO_URL).forEach(function(k) {
    LAYOUT_URL_TO_SLUG[LAYOUT_SLUG_TO_URL[k].toLowerCase()] = k;
  });
  
  function openLayoutDesignSub(slug) {
    var data = layoutDesignData[slug];
    if (!data) return;
    var label = document.getElementById('layout-design-sub-label');
    var content = document.getElementById('layout-design-sub-content');
    label.textContent = 'LAYOUT DESIGN \u2014 ' + data.name.toUpperCase();
    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Layout Design</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + data.name + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">SERVICE DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Available Formats</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('layout-design-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof LAYOUT_SLUG_TO_URL !== 'undefined') {
      var layoutUrlSeg = LAYOUT_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Services/LayoutDesign/' + layoutUrlSeg);
    }
  }
  
  function closeLayoutDesignSub() {
    var subPanel = document.getElementById('layout-design-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var parentPanel = document.querySelector('#panel-ld-marketing, #panel-ld-publications, #panel-ld-reports, #panel-ld-business');
    var meshWrap = parentPanel && parentPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Services/LayoutDesign');
  }
  
  
  // ── Mockups Category Data ──
  var mockupsData = {
    'product': {
      name: 'Product Mockups',
      patternId: 'mupat-product',
      description: 'Photorealistic product mockups that place your design on real-world items. We create high-resolution renders for presentations, e-commerce listings, and marketing materials that show your product at its best.',
      features: ['High-resolution photorealistic renders', 'Multiple angle and perspective views', 'Custom lighting and shadow setups', 'Background scene customization', 'Layered PSD files delivered'],
      sizes: ['3000×2000 px', '4000×3000 px', '6000×4000 px', 'Custom']
    },
    'packaging': {
      name: 'Packaging Mockups',
      patternId: 'mupat-packaging',
      description: 'Packaging mockup design that visualizes your box, bag, bottle, or container design before production. See how your packaging looks on shelves, in hands, and in lifestyle settings with photorealistic accuracy.',
      features: ['Box, bag, and bottle mockups', 'Shelf-scene and lifestyle contexts', 'Dieline overlay and artwork mapping', 'Multiple colorway previews', 'Print-ready proofing views'],
      sizes: ['3000×2000 px', '4000×3000 px', '5000×3500 px', 'Custom']
    },
    'digital': {
      name: 'Digital Mockups',
      patternId: 'mupat-digital',
      description: 'Digital device mockups featuring your designs on screens — laptops, tablets, phones, and monitors. Perfect for portfolio presentations, client approvals, and app store screenshots.',
      features: ['Laptop, tablet, and phone frames', 'Multi-device responsive showcases', 'Isometric and perspective views', 'Custom screen content placement', 'Dark and light device options'],
      sizes: ['3000×2000 px', '4000×3000 px', 'Retina 2x', 'Custom']
    },
    'tshirt': {
      name: 'T-Shirt Mockups',
      patternId: 'mupat-tshirt',
      description: 'Apparel mockups that show your designs on t-shirts, hoodies, and other garments. Realistic fabric textures, proper shadow mapping, and model-based or flat-lay presentations that sell your merch before it\'s printed.',
      features: ['Front, back, and sleeve views', 'Realistic fabric texture mapping', 'Model-based and flat-lay options', 'Multiple garment color swaps', 'Wrinkle and fold realism'],
      sizes: ['3000×3000 px', '4000×4000 px', '5000×5000 px', 'Custom']
    },
    'mug': {
      name: 'Mug Mockups',
      patternId: 'mupat-mug',
      description: 'Drinkware mockup design for coffee mugs, travel tumblers, and ceramic cups. We wrap your artwork realistically around curved surfaces with proper perspective distortion and shadow casting.',
      features: ['Ceramic and travel mug options', 'Full-wrap artwork mapping', 'Steam and beverage detail options', 'Lifestyle and isolated backgrounds', 'Multiple handle orientations'],
      sizes: ['11 oz standard', '15 oz large', 'Travel tumbler', 'Custom']
    },
    'phone-case': {
      name: 'Phone Case Mockups',
      patternId: 'mupat-phonecase',
      description: 'Phone case mockups for all major device models. We render your designs on slim, tough, and clear case styles with accurate edge wrapping and device color matching for e-commerce and portfolio presentations.',
      features: ['iPhone and Android device models', 'Slim, tough, and clear case styles', 'Edge wrap and corner detail', 'In-hand and flat-lay views', 'Multiple device color options'],
      sizes: ['iPhone 15/16 series', 'Samsung Galaxy', 'Universal fit', 'Custom']
    },
    'business-card': {
      name: 'Business Card Mockups',
      patternId: 'mupat-bizcard',
      description: 'Business card mockup presentations that showcase your stationery design with professional flair. Stacked, fanned, and lifestyle arrangements on premium surfaces that sell the design before it goes to print.',
      features: ['Stacked and fanned arrangements', 'Spot UV and foil effect previews', 'Rounded and square corner options', 'Textured paper stock simulation', 'Front and back views'],
      sizes: ['3.5×2 in', '3.5×2.5 in (Euro)', 'Square', 'Custom']
    },
    'book': {
      name: 'Book Mockups',
      patternId: 'mupat-book',
      description: 'Book cover and interior mockups for novels, textbooks, and coffee table books. We create hardcover and paperback renders showing spine, front, and back covers in bookshelf and lifestyle settings.',
      features: ['Hardcover and paperback options', 'Spine, front, and back cover views', 'Open-book interior spreads', 'Bookshelf and table scenes', 'Dust jacket and emboss effects'],
      sizes: ['6×9 in', '8.5×11 in', '5×8 in', 'Custom']
    },
    'billboard': {
      name: 'Billboard Mockups',
      patternId: 'mupat-billboard',
      description: 'Outdoor advertising mockups that place your designs on billboards, bus shelters, and building wraps. Realistic urban environments with proper scale, lighting, and weather conditions.',
      features: ['Highway and urban billboard scenes', 'Bus shelter and transit placements', 'Day and night lighting options', 'Building wrap and facade mockups', 'Proper viewing distance scale'],
      sizes: ['14×48 ft bulletin', '11×5 ft poster', 'Bus shelter', 'Custom']
    },
    'poster': {
      name: 'Poster Mockups',
      patternId: 'mupat-poster',
      description: 'Poster mockup presentations for gallery walls, street postings, and retail displays. We create framed, pinned, and rolled presentations that show your poster design in its intended environment.',
      features: ['Framed and unframed options', 'Gallery wall arrangements', 'Street poster and wheat-paste scenes', 'Multiple paper texture simulations', 'Shadow and lighting accuracy'],
      sizes: ['18×24 in', '24×36 in', '27×40 in', 'Custom']
    },
    'website': {
      name: 'Website Mockups',
      patternId: 'mupat-website',
      description: 'Browser-frame website mockups that present your web design in realistic desktop and laptop contexts. Perfect for client presentations, case studies, and portfolio pieces that demonstrate responsive design work.',
      features: ['Browser chrome frame options', 'Laptop and desktop screen placement', 'Scrolling page preview mockups', 'Multi-page flow presentations', 'Responsive breakpoint comparisons'],
      sizes: ['1920×1080 desktop', '1440×900 laptop', '768×1024 tablet', 'Custom']
    },
    'app': {
      name: 'App Mockups',
      patternId: 'mupat-app',
      description: 'Mobile app mockups showing your UI designs on the latest phone models. We create app store screenshot formats, in-hand device shots, and multi-screen flow presentations for pitches and portfolios.',
      features: ['App store screenshot formats', 'In-hand device photography style', 'Multi-screen user flow layouts', 'Notification and widget previews', 'iOS and Android device frames'],
      sizes: ['iPhone Pro Max', 'iPhone standard', 'Android flagship', 'Custom']
    },
    'signage': {
      name: 'Signage Mockups',
      patternId: 'mupat-signage',
      description: 'Storefront and wayfinding signage mockups that show your designs in architectural context. From hanging signs to monument markers, we render accurate previews with proper materials and lighting.',
      features: ['Storefront and facade integration', 'Illuminated and non-lit options', 'Monument and pylon sign views', 'Interior wayfinding placements', 'Material finish simulations'],
      sizes: ['Small retail', 'Medium commercial', 'Large monument', 'Custom']
    },
    'vehicle': {
      name: 'Vehicle Mockups',
      patternId: 'mupat-vehicle',
      description: 'Fleet and vehicle wrap mockups for cars, vans, trucks, and trailers. We map your graphics onto vehicle templates with proper curvature, panel lines, and paint-matched backgrounds for client approval.',
      features: ['Car, van, and truck templates', 'Full wrap and partial wrap options', 'Side, rear, and 3/4 angle views', 'Fleet consistency previews', 'Panel line and contour mapping'],
      sizes: ['Sedan', 'SUV/Van', 'Box truck', 'Custom vehicle']
    },
    'label': {
      name: 'Label Mockups',
      patternId: 'mupat-label',
      description: 'Product label mockups for bottles, jars, cans, and containers. We wrap your label design onto realistic product shapes with proper curvature and transparency to preview how your packaging will look on shelves.',
      features: ['Bottle, jar, and can surfaces', 'Curved surface wrapping accuracy', 'Clear and opaque label options', 'Shelf and lifestyle scenes', 'Multi-label product families'],
      sizes: ['Wine bottle', 'Mason jar', 'Beverage can', 'Custom']
    },
    'box': {
      name: 'Box Mockups',
      patternId: 'mupat-box',
      description: 'Box packaging mockups showing your designs on mailer boxes, product packaging, and retail boxes. We create open-box, closed-box, and stacked presentations with accurate dieline mapping.',
      features: ['Open and closed box views', 'Stacked and grouped arrangements', 'Mailer and retail box styles', 'Custom dieline artwork mapping', 'Tissue paper and insert previews'],
      sizes: ['Small mailer', 'Medium retail', 'Large shipping', 'Custom']
    },
    'bag': {
      name: 'Bag Mockups',
      patternId: 'mupat-bag',
      description: 'Shopping bag and tote bag mockups for retail branding and promotional merchandise. We render paper bags, canvas totes, and drawstring bags with realistic fabric textures and handle details.',
      features: ['Paper and canvas bag options', 'Handle and gusset detail', 'Filled and empty bag poses', 'In-hand lifestyle photography', 'Full-color print area mapping'],
      sizes: ['Small gift bag', 'Medium shopping bag', 'Large tote', 'Custom']
    },
    'hat': {
      name: 'Hat Mockups',
      patternId: 'mupat-hat',
      description: 'Cap and hat mockups for snapbacks, dad hats, beanies, and trucker caps. We show your embroidery or print designs on realistic headwear with proper curvature, stitching detail, and visor perspectives.',
      features: ['Snapback, dad hat, and beanie styles', 'Front, side, and back views', 'Embroidery texture simulation', 'Multiple hat color options', 'On-model and flat-lay views'],
      sizes: ['Snapback', 'Dad hat', 'Beanie', 'Custom']
    },
    'sticker': {
      name: 'Sticker Mockups',
      patternId: 'mupat-sticker',
      description: 'Sticker mockup presentations showing your designs peeling off sheets, applied to surfaces, and arranged in collections. Realistic adhesive curl, shadow casting, and surface texture integration.',
      features: ['Peel-off and applied surface views', 'Sheet and individual presentations', 'Laptop and water bottle scenes', 'Die-cut edge accuracy', 'Holographic and clear previews'],
      sizes: ['2×2 in', '3×3 in', '4×4 in', 'Custom']
    },
    'banner': {
      name: 'Banner Mockups',
      patternId: 'mupat-banner',
      description: 'Banner and display stand mockups for trade shows, events, and retail environments. We render retractable banners, X-stands, and hanging banners in realistic venue settings with proper scale.',
      features: ['Retractable and X-stand options', 'Trade show booth context scenes', 'Hanging and wall-mounted styles', 'Indoor and outdoor environments', 'Multiple size and ratio options'],
      sizes: ['33×80 in retractable', '24×63 in X-stand', '8×3 ft hanging', 'Custom']
    }
  };
  
  var MOCKUPS_SLUG_TO_URL = {
    'product':'ProductMockups','packaging':'PackagingMockups','digital':'DigitalMockups',
    'tshirt':'TShirtMockups','mug':'MugMockups','phone-case':'PhoneCaseMockups',
    'business-card':'BusinessCardMockups','book':'BookMockups','billboard':'BillboardMockups',
    'poster':'PosterMockups','website':'WebsiteMockups','app':'AppMockups',
    'signage':'SignageMockups','vehicle':'VehicleMockups','label':'LabelMockups',
    'box':'BoxMockups','bag':'BagMockups','hat':'HatMockups',
    'sticker':'StickerMockups','banner':'BannerMockups'
  };
  var MOCKUPS_URL_TO_SLUG = {};
  Object.keys(MOCKUPS_SLUG_TO_URL).forEach(function(k) {
    MOCKUPS_URL_TO_SLUG[MOCKUPS_SLUG_TO_URL[k].toLowerCase()] = k;
  });
  
  function openMockupsSub(slug) {
    var data = mockupsData[slug];
    if (!data) return;
    var label = document.getElementById('mockups-sub-label');
    var content = document.getElementById('mockups-sub-content');
    label.textContent = 'MOCKUPS \u2014 ' + data.name.toUpperCase();
    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Mockups</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + data.name + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">SERVICE DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Available Sizes</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('mockups-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof MOCKUPS_SLUG_TO_URL !== 'undefined') {
      var mockupsUrlSeg = MOCKUPS_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Services/Mockups/' + mockupsUrlSeg);
    }
  }
  
  function closeMockupsSub() {
    var subPanel = document.getElementById('mockups-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var parentPanel = document.querySelector('#panel-mu-apparel, #panel-mu-print, #panel-mu-signage, #panel-mu-digital');
    var meshWrap = parentPanel && parentPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Services/Mockups');
  }
  
  
  // ── Web Design Category Data ──
  var webDesignData = {
    'website-design': {
      name: 'Website Design',
      patternId: 'wdpat-websitedesign',
      description: 'Custom website design from concept to launch. We build responsive, brand-aligned websites with clear navigation, compelling visuals, and conversion-focused layouts that work across every device and browser.',
      features: ['Custom design from scratch', 'Responsive across all devices', 'SEO-optimized page structure', 'CMS integration and training', 'Performance and speed optimization'],
      sizes: ['Single page', '5-page site', '10+ page site', 'Custom']
    },
    'landing-pages': {
      name: 'Landing Pages',
      patternId: 'wdpat-landingpages',
      description: 'High-converting landing page design built for specific campaigns, products, or lead generation goals. We optimize every element — headline, hero, social proof, and CTA — for maximum conversion rates.',
      features: ['Conversion-optimized layout', 'A/B test variant design', 'Lead capture form integration', 'Social proof and trust signals', 'Fast load time optimization'],
      sizes: ['Short-form', 'Long-form scroll', 'Multi-step funnel', 'Custom']
    },
    'ui-ux': {
      name: 'UI/UX Design',
      patternId: 'wdpat-uiux',
      description: 'User interface and experience design that puts your users first. We conduct research, build user flows, and design pixel-perfect interfaces that are intuitive, accessible, and delightful to use.',
      features: ['User research and persona development', 'Information architecture mapping', 'Pixel-perfect interface design', 'Usability testing and iteration', 'Design handoff with dev specs'],
      sizes: ['MVP scope', 'Full product', 'Feature redesign', 'Custom']
    },
    'ecommerce': {
      name: 'E-commerce Sites',
      patternId: 'wdpat-ecommerce',
      description: 'E-commerce website design that drives sales. We create online stores with intuitive product browsing, streamlined checkout flows, and trust-building design patterns that reduce cart abandonment.',
      features: ['Product catalog and filtering design', 'Shopping cart and checkout optimization', 'Payment gateway integration design', 'Inventory and variant display systems', 'Customer account and order tracking'],
      sizes: ['Starter store (50 products)', 'Growth store (500 products)', 'Enterprise catalog', 'Custom']
    },
    'portfolio': {
      name: 'Portfolio Sites',
      patternId: 'wdpat-portfolio',
      description: 'Portfolio website design that showcases creative work with impact. We build gallery-style sites with project case studies, smooth transitions, and layouts that let your work speak for itself.',
      features: ['Gallery and case study layouts', 'Project filtering and categories', 'Lightbox and fullscreen views', 'Client testimonial integration', 'Contact and inquiry forms'],
      sizes: ['Single portfolio', 'Multi-discipline', 'Agency site', 'Custom']
    },
    'blog': {
      name: 'Blog Design',
      patternId: 'wdpat-blog',
      description: 'Blog and content platform design with reader-focused typography, clear navigation, and content discovery features. We create blog experiences that keep readers engaged and coming back for more.',
      features: ['Article and post template design', 'Category and tag navigation', 'Related content suggestions', 'Newsletter signup integration', 'Social sharing and comments'],
      sizes: ['Personal blog', 'Publication', 'Content hub', 'Custom']
    },
    'saas': {
      name: 'SaaS Dashboards',
      patternId: 'wdpat-saas',
      description: 'SaaS dashboard and admin panel design for data-rich applications. We create clean, functional interfaces with data visualization, user management, and workflow tools that your customers will love using.',
      features: ['Dashboard and analytics views', 'Data table and chart components', 'User management interfaces', 'Settings and configuration panels', 'Notification and alert systems'],
      sizes: ['MVP dashboard', 'Full admin suite', 'Analytics add-on', 'Custom']
    },
    'mobile-web': {
      name: 'Mobile Web',
      patternId: 'wdpat-mobileweb',
      description: 'Mobile-first web design optimized for touch interaction and small screens. We prioritize speed, readability, and thumb-friendly navigation to deliver the best possible mobile browsing experience.',
      features: ['Touch-optimized interface design', 'Thumb-zone navigation mapping', 'Progressive web app (PWA) design', 'Offline-first content strategies', 'Mobile form and input optimization'],
      sizes: ['Mobile site', 'PWA', 'Responsive retrofit', 'Custom']
    },
    'email-templates': {
      name: 'Email Templates',
      patternId: 'wdpat-email',
      description: 'Email template design for marketing campaigns, transactional emails, and newsletters. We build bulletproof HTML emails that render perfectly across Gmail, Outlook, Apple Mail, and every major client.',
      features: ['Cross-client compatible HTML', 'Marketing campaign templates', 'Transactional email design', 'Dark mode compatible layouts', 'Modular block system for reuse'],
      sizes: ['Single template', 'Template system (5+)', 'Full email suite', 'Custom']
    },
    'wireframing': {
      name: 'Wireframing',
      patternId: 'wdpat-wireframing',
      description: 'Low and mid-fidelity wireframes that map out page structure, content hierarchy, and user flows before visual design begins. We validate layouts early to save time and budget in the design process.',
      features: ['Low-fidelity structural layouts', 'Content hierarchy mapping', 'User flow and journey diagrams', 'Annotation and specification notes', 'Stakeholder review documentation'],
      sizes: ['Key pages (5-10)', 'Full sitemap', 'User flow set', 'Custom']
    },
    'prototyping': {
      name: 'Prototyping',
      patternId: 'wdpat-prototyping',
      description: 'Interactive prototypes that simulate real user experiences before development begins. We build clickable, animated prototypes for user testing, stakeholder demos, and developer handoff.',
      features: ['Clickable interactive screens', 'Transition and animation previews', 'User testing session support', 'Developer handoff specifications', 'Figma and InVision prototypes'],
      sizes: ['Key flow prototype', 'Full app prototype', 'Micro-interaction set', 'Custom']
    },
    'design-systems': {
      name: 'Design Systems',
      patternId: 'wdpat-designsystems',
      description: 'Scalable design systems with reusable components, tokens, and documentation. We build component libraries that ensure consistency across your product as teams and features grow.',
      features: ['Component library with variants', 'Design token system (colors, spacing)', 'Documentation and usage guidelines', 'Figma and code-ready assets', 'Governance and contribution rules'],
      sizes: ['Starter system', 'Full product system', 'Multi-brand system', 'Custom']
    },
    'micro-interactions': {
      name: 'Micro-interactions',
      patternId: 'wdpat-microinteractions',
      description: 'Micro-interaction design that adds polish and delight to your digital product. We create hover effects, loading states, button animations, and feedback patterns that make your interface feel alive.',
      features: ['Hover and focus state design', 'Loading and progress animations', 'Button and form feedback', 'Toast notification animations', 'Scroll-triggered effects'],
      sizes: ['Component set (10)', 'Full page interactions', 'Product-wide system', 'Custom']
    },
    'responsive': {
      name: 'Responsive Design',
      patternId: 'wdpat-responsive',
      description: 'Responsive design that adapts your website beautifully across desktop, tablet, and mobile breakpoints. We test every layout at every size to ensure a seamless experience regardless of device.',
      features: ['Desktop, tablet, and mobile layouts', 'Breakpoint strategy and planning', 'Fluid grid and flexible images', 'Touch and cursor interaction parity', 'Cross-browser compatibility testing'],
      sizes: ['3 breakpoints', '5 breakpoints', 'Custom breakpoint system', 'Audit only']
    },
    'accessibility': {
      name: 'Accessibility Audit',
      patternId: 'wdpat-accessibility',
      description: 'WCAG accessibility audit and remediation for your website or web application. We test against AA and AAA standards, identify barriers, and provide actionable fixes to make your digital presence inclusive.',
      features: ['WCAG 2.1 AA/AAA compliance testing', 'Screen reader and keyboard testing', 'Color contrast and font size audit', 'ARIA landmark and label review', 'Remediation report with priorities'],
      sizes: ['Single page audit', 'Full site audit', 'Ongoing monitoring', 'Custom']
    },
    'animations': {
      name: 'Web Animations',
      patternId: 'wdpat-animations',
      description: 'Web animation design and implementation using CSS, JavaScript, and Lottie. We create scroll animations, page transitions, and motion graphics that enhance storytelling without sacrificing performance.',
      features: ['CSS and JS animation design', 'Scroll-triggered sequences', 'Page transition effects', 'Lottie and SVG animations', 'Performance-optimized implementation'],
      sizes: ['Hero animation', 'Page animation set', 'Full site motion system', 'Custom']
    },
    'icon-systems': {
      name: 'Icon Systems',
      patternId: 'wdpat-icons',
      description: 'Custom icon system design with consistent style, sizing, and visual weight. We create icon libraries in SVG format that scale perfectly and maintain brand alignment across your entire digital product.',
      features: ['Custom icon design and illustration', 'Consistent grid and sizing system', 'SVG and icon font exports', 'Multiple weight and style variants', 'Naming convention and documentation'],
      sizes: ['Starter set (30 icons)', 'Standard set (60 icons)', 'Comprehensive set (100+)', 'Custom']
    },
    'cms-themes': {
      name: 'CMS Themes',
      patternId: 'wdpat-cms',
      description: 'Custom CMS theme design for WordPress, Shopify, Squarespace, and other platforms. We create themes that give you full design control while staying easy to manage and update without developer help.',
      features: ['WordPress and Shopify themes', 'Custom post type and page templates', 'Theme options and customizer panels', 'Plugin and app integration design', 'Documentation and training guides'],
      sizes: ['Blog theme', 'Business theme', 'E-commerce theme', 'Custom']
    },
    'web-apps': {
      name: 'Web Apps',
      patternId: 'wdpat-webapps',
      description: 'Web application design for complex tools, platforms, and internal systems. We design intuitive interfaces for multi-step workflows, data management, and collaboration features that users can learn quickly.',
      features: ['Complex workflow interface design', 'Data management and CRUD screens', 'Role-based access UI patterns', 'Onboarding and empty state design', 'Real-time collaboration interfaces'],
      sizes: ['MVP app', 'Full platform', 'Feature module', 'Custom']
    },
    'web-style-guides': {
      name: 'Style Guides',
      patternId: 'wdpat-webstyleguides',
      description: 'Web-specific style guide documentation that defines your digital brand standards. We document typography, colors, spacing, components, and interaction patterns in a living reference your team can rely on.',
      features: ['Digital color and typography specs', 'Spacing and grid documentation', 'Component usage guidelines', 'Interaction and motion standards', 'Living style guide website option'],
      sizes: ['Core guide', 'Comprehensive guide', 'Living style guide site', 'Custom']
    }
  };
  
  var WEBDESIGN_SLUG_TO_URL = {
    'website-design':'WebsiteDesign','landing-pages':'LandingPages','ui-ux':'UIUXDesign',
    'ecommerce':'EcommerceSites','portfolio':'PortfolioSites','blog':'BlogDesign',
    'saas':'SaaSDashboards','mobile-web':'MobileWeb','email-templates':'EmailTemplates',
    'wireframing':'Wireframing','prototyping':'Prototyping','design-systems':'DesignSystems',
    'micro-interactions':'MicroInteractions','responsive':'ResponsiveDesign',
    'accessibility':'AccessibilityAudit','animations':'WebAnimations',
    'icon-systems':'IconSystems','cms-themes':'CMSThemes',
    'web-apps':'WebApps','web-style-guides':'StyleGuides'
  };
  var WEBDESIGN_URL_TO_SLUG = {};
  Object.keys(WEBDESIGN_SLUG_TO_URL).forEach(function(k) {
    WEBDESIGN_URL_TO_SLUG[WEBDESIGN_SLUG_TO_URL[k].toLowerCase()] = k;
  });
  
  function openWebDesignSub(slug) {
    var data = webDesignData[slug];
    if (!data) return;
    var label = document.getElementById('web-design-sub-label');
    var content = document.getElementById('web-design-sub-content');
    label.textContent = 'WEB DESIGN \u2014 ' + data.name.toUpperCase();
    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Web Design</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + data.name + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">SERVICE DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<div style="margin-bottom:8px;"><span class="anno" style="color:var(--bp-cyan);">Deliverables</span></div>' +
        '<div class="sticker-size-pills">' + sizesHtml + '</div>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('web-design-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof WEBDESIGN_SLUG_TO_URL !== 'undefined') {
      var webUrlSeg = WEBDESIGN_SLUG_TO_URL[slug] || slug;
      history.pushState(null, '', '/Services/WebDesign/' + webUrlSeg);
    }
  }
  
  function closeWebDesignSub() {
    var subPanel = document.getElementById('web-design-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var parentPanel = document.querySelector('#panel-wd-sites, #panel-wd-apps, #panel-wd-ux, #panel-wd-polish');
    var meshWrap = parentPanel && parentPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) history.pushState(null, '', '/Services/WebDesign');
  }
  
  // ════════ PHOTOGRAPHY DATA ════════
  
  var photographyData = {
    'product':          { name:'Product Photography',  patternId:'phpat-product',       description:'High-quality product images on clean backgrounds with precise lighting and consistent styling. We capture every angle, texture, and detail your e-commerce listings and marketing materials demand. Multiple shots per product with fast turnaround.', features:['White background isolation','Multi-angle coverage','Consistent lighting setups','High-res for print and web','Batch processing available'], sizes:['Web-optimized','Print-ready 300dpi','Social media crops','Custom'] },
    'lifestyle':        { name:'Lifestyle Shoots',     patternId:'phpat-lifestyle',     description:'Contextual photography that places your products and brand in real-world settings. We art-direct every scene to tell a story that resonates with your target audience. Styled environments, natural lighting, and authentic compositions.', features:['Art-directed scenes','Natural and styled lighting','Model coordination','Location scouting','Brand narrative alignment'], sizes:['Full campaign set','Single scene','Social bundle','Custom'] },
    'editing':          { name:'Photo Editing',        patternId:'phpat-editing',       description:'Professional post-production services including color correction, exposure balancing, and creative retouching. We transform raw captures into polished final images ready for any platform or print application.', features:['Color correction','Exposure balancing','Batch editing workflows','Creative retouching','Format conversion'], sizes:['Per-image','Batch (10-50)','Batch (50-200)','Custom'] },
    'headshots':        { name:'Headshots',            patternId:'phpat-headshots',     description:'Professional headshots for corporate teams, LinkedIn profiles, and personal branding. We use controlled studio lighting and clean backdrops to produce polished, consistent portraits across your entire organization.', features:['Studio or on-site setup','Consistent team styling','Multiple backdrop options','Quick retouching included','Digital delivery same-week'], sizes:['Individual session','Team (5-15)','Enterprise (15+)','Custom'] },
    'event':            { name:'Event Photography',    patternId:'phpat-event',         description:'Comprehensive event coverage capturing keynote moments, candid interactions, and venue details. Our photographers work discreetly to document conferences, galas, product launches, and corporate gatherings from start to finish.', features:['Multi-photographer coverage','Candid and staged shots','Same-day highlight previews','Full event documentation','Quick-turnaround editing'], sizes:['Half-day (4hrs)','Full-day (8hrs)','Multi-day','Custom'] },
    'food':             { name:'Food Photography',     patternId:'phpat-food',          description:'Appetizing food imagery styled and lit to showcase texture, color, and presentation. We work with chefs and food stylists to create mouthwatering visuals for menus, delivery apps, social media, and advertising campaigns.', features:['Professional food styling','Steam and texture capture','Menu-ready compositions','Overhead and angled shots','Color-accurate output'], sizes:['Per-dish','Full menu shoot','Campaign set','Custom'] },
    'flat-lay':         { name:'Flat Lay',             patternId:'phpat-flatlay',       description:'Overhead flat-lay compositions meticulously arranged to showcase product collections, brand kits, or curated groupings. Every element is precisely positioned for maximum visual impact on social feeds and marketing materials.', features:['Styled arrangements','Overhead precision shots','Brand color coordination','Props and accessories included','Grid-ready compositions'], sizes:['Single layout','Collection (3-5)','Campaign set','Custom'] },
    '360-product':      { name:'360° Product',         patternId:'phpat-360',           description:'Interactive 360-degree product photography using turntable capture systems. Customers can spin and explore your product from every angle on your e-commerce site, increasing engagement and reducing return rates.', features:['Turntable capture system','36 or 72 frame spins','Web-embed ready output','Zoom-capable detail','Consistent lighting all angles'], sizes:['Single product','Bundle (5-10)','Catalog (10+)','Custom'] },
    'aerial':           { name:'Aerial & Drone',       patternId:'phpat-aerial',        description:'Licensed drone photography capturing sweeping aerial perspectives of properties, construction sites, events, and landscapes. FAA-compliant pilots deliver stunning bird\'s-eye views that ground-level cameras simply cannot achieve.', features:['FAA-licensed pilots','4K aerial stills','Property and site mapping','Sunset and golden hour','RAW and edited delivery'], sizes:['Single property','Multi-site','Event aerial','Custom'] },
    'interior':         { name:'Interior & Architecture', patternId:'phpat-interior',   description:'Architectural and interior photography showcasing spaces with precise perspective control and balanced ambient lighting. We capture real estate, hospitality venues, retail spaces, and office environments with magazine-quality results.', features:['Wide-angle precision','HDR exposure blending','Twilight exterior shots','Perspective correction','Virtual staging ready'], sizes:['Single room','Full property','Commercial space','Custom'] },
    'fashion':          { name:'Fashion Photography',  patternId:'phpat-fashion',       description:'Editorial and commercial fashion photography for lookbooks, catalogs, and advertising campaigns. We coordinate with stylists, hair and makeup artists, and models to produce imagery that elevates your apparel and accessories brand.', features:['Model casting coordination','Stylist and HMUA management','Studio or location shoots','Editorial and commercial styles','Lookbook sequencing'], sizes:['Single look','Lookbook (8-15)','Full campaign','Custom'] },
    'studio':           { name:'Studio Portraits',     patternId:'phpat-studio',        description:'Controlled studio portrait sessions with professional lighting setups, backdrops, and direction. Ideal for executive portraits, actor headshots, personal branding, and creative projects requiring precise technical control.', features:['Multi-light setups','Backdrop variety','Tethered shooting preview','Professional direction','Same-session variety'], sizes:['30-min session','60-min session','Half-day studio','Custom'] },
    'on-location':      { name:'On-Location',          patternId:'phpat-onlocation',    description:'Photography services at your venue, office, or chosen location. We bring professional lighting and equipment to any environment, adapting to available space and natural conditions for authentic, on-brand results.', features:['Portable lighting kit','Environment adaptation','Travel-ready team','Natural light blending','Location-specific styling'], sizes:['Half-day on-site','Full-day on-site','Multi-location','Custom'] },
    'stock':            { name:'Stock Photography',    patternId:'phpat-stock',         description:'Custom brand stock photography libraries built specifically for your organization. No more generic stock — we create a library of authentic, on-brand images you can use across all channels without licensing restrictions.', features:['Exclusive brand library','Unlimited internal usage','Diverse scene variety','Quarterly refresh options','Keyword-tagged delivery'], sizes:['Starter (25 images)','Standard (50 images)','Premium (100+)','Custom'] },
    'compositing':      { name:'Photo Compositing',    patternId:'phpat-compositing',   description:'Advanced photo compositing and manipulation combining multiple images into seamless final visuals. We blend elements, swap backgrounds, add effects, and create impossible scenes that look completely natural.', features:['Multi-layer blending','Background replacement','Element addition/removal','Shadow and reflection work','Photorealistic output'], sizes:['Simple composite','Complex composite','Campaign set','Custom'] },
    'color-correction': { name:'Color Correction',     patternId:'phpat-colorcorrect',  description:'Precise color correction ensuring accurate, consistent tones across your entire image library. We calibrate white balance, adjust exposure curves, and match colors to your brand standards for cohesive visual identity.', features:['White balance calibration','Exposure curve adjustment','Brand color matching','Cross-platform consistency','Batch color profiles'], sizes:['Per-image','Batch (10-50)','Batch (50-200)','Custom'] },
    'bg-removal':       { name:'Background Removal',   patternId:'phpat-bgremoval',     description:'Clean, precise background removal and isolation for product images, portraits, and marketing assets. We handle complex edges like hair, transparent objects, and intricate shapes with pixel-perfect accuracy.', features:['Pixel-perfect edge work','Complex hair masking','Transparent object handling','Shadow preservation options','Multiple export formats'], sizes:['Per-image','Batch (10-50)','Batch (50-200)','Custom'] },
    'retouching':       { name:'Photo Retouching',     patternId:'phpat-retouching',    description:'Detailed retouching services for portraits, products, and commercial imagery. We smooth skin naturally, remove blemishes, enhance details, and polish every image to publication-ready quality while maintaining authenticity.', features:['Natural skin smoothing','Blemish and wrinkle removal','Detail enhancement','Body and product reshaping','Non-destructive workflow'], sizes:['Basic retouch','Advanced retouch','Beauty/editorial retouch','Custom'] },
    'catalog':          { name:'Catalog Photography',  patternId:'phpat-catalog',       description:'High-volume product photography for catalogs, e-commerce platforms, and wholesale sheets. We maintain strict consistency in lighting, angles, and backgrounds across hundreds of SKUs with efficient batch workflows.', features:['Consistent SKU styling','High-volume throughput','Multiple angle standards','Size reference inclusion','Database-ready file naming'], sizes:['Small catalog (20-50)','Medium (50-150)','Large (150+)','Custom'] },
    'social-content':   { name:'Social Content',       patternId:'phpat-social',        description:'Photography specifically created for social media platforms — Instagram, TikTok, LinkedIn, and more. We shoot with platform dimensions, engagement patterns, and feed aesthetics in mind from the start.', features:['Platform-specific framing','Feed aesthetic planning','Story and reel stills','Carousel-ready sets','Hashtag and trend aligned'], sizes:['Monthly pack (10)','Monthly pack (20)','Monthly pack (30+)','Custom'] }
  };
  
  var PHOTOGRAPHY_SLUG_TO_URL = {
    'product':'ProductPhotography', 'lifestyle':'LifestyleShoots', 'editing':'PhotoEditing',
    'headshots':'Headshots', 'event':'EventPhotography', 'food':'FoodPhotography',
    'flat-lay':'FlatLay', '360-product':'360Product', 'aerial':'AerialDrone',
    'interior':'InteriorArchitecture', 'fashion':'FashionPhotography', 'studio':'StudioPortraits',
    'on-location':'OnLocation', 'stock':'StockPhotography', 'compositing':'PhotoCompositing',
    'color-correction':'ColorCorrection', 'bg-removal':'BackgroundRemoval', 'retouching':'PhotoRetouching',
    'catalog':'CatalogPhotography', 'social-content':'SocialContent'
  };
  var PHOTOGRAPHY_URL_TO_SLUG = {};
  Object.keys(PHOTOGRAPHY_SLUG_TO_URL).forEach(function(k) { PHOTOGRAPHY_URL_TO_SLUG[PHOTOGRAPHY_SLUG_TO_URL[k].toLowerCase()] = k; });
  
  function openPhotographySub(slug) {
    var data = photographyData[slug];
    if (!data) return;
    var label = document.getElementById('photography-sub-label');
    var content = document.getElementById('photography-sub-content');
    label.textContent = 'PHOTOGRAPHY \u2014 ' + data.name.toUpperCase();
    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Photography</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + data.name + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">SERVICE DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('photography-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof PHOTOGRAPHY_SLUG_TO_URL !== 'undefined') {
      var photoUrlSeg = PHOTOGRAPHY_SLUG_TO_URL[slug] || slug;
      history.pushState({ panel:'panel-photography', sub:slug }, '', '/Services/Photography/' + photoUrlSeg);
    }
  }
  
  function closePhotographySub() {
    var subPanel = document.getElementById('photography-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var parentPanel = document.querySelector('#panel-ph-product, #panel-ph-people, #panel-ph-post, #panel-ph-creative');
    var meshWrap = parentPanel && parentPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) {
      history.pushState({ panel:'panel-photography' }, '', '/Services/Photography');
    }
  }
  
  
  // ════════ VIDEO PRODUCTION DATA ════════
  
  var videoProductionData = {
    'promo':            { name:'Promo Videos',         patternId:'vppat-promo',         description:'High-impact promotional videos that showcase your brand, product, or service in 30-90 second formats. We handle scripting, shooting, and editing to create content that drives conversions across web, social, and broadcast channels.', features:['Script development','Professional cinematography','Licensed music selection','Multi-platform export','Call-to-action integration'], sizes:['30-second spot','60-second spot','90-second spot','Custom'] },
    'social-clips':     { name:'Social Clips',         patternId:'vppat-social',        description:'Short-form video content optimized for Instagram, TikTok, LinkedIn, and Facebook feeds. We create thumb-stopping clips with platform-native dimensions, captions, and pacing designed to maximize engagement and shareability.', features:['Platform-specific sizing','Hook-first editing','Caption overlays','Trending audio integration','Batch delivery options'], sizes:['15-second clip','30-second clip','60-second clip','Custom'] },
    'motion-graphics':  { name:'Motion Graphics',      patternId:'vppat-motion',        description:'Animated visual elements including logo reveals, lower thirds, data visualizations, and kinetic typography. We create custom motion design that elevates your video content and reinforces brand identity across all touchpoints.', features:['Logo animation','Lower third design','Data visualization','Kinetic typography','Brand motion system'], sizes:['Single element','Element package (5)','Full motion kit','Custom'] },
    'brand-films':      { name:'Brand Films',          patternId:'vppat-brand',         description:'Cinematic brand stories that communicate your mission, values, and culture through compelling narrative filmmaking. We produce documentary-style and scripted films that create emotional connections with your audience.', features:['Narrative development','Cinematic cinematography','Interview direction','Professional color grade','Licensed score'], sizes:['2-3 minute film','5-minute film','Long-form (10+min)','Custom'] },
    'product-demos':    { name:'Product Demos',        patternId:'vppat-demos',         description:'Clear, compelling product demonstration videos that walk viewers through features, benefits, and use cases. We combine screen capture, live-action, and motion graphics to create demos that educate and convert.', features:['Feature walkthrough','Screen capture integration','Voiceover narration','Callout animations','Multi-version cuts'], sizes:['Quick demo (60s)','Standard (2-3min)','In-depth (5+min)','Custom'] },
    'testimonials':     { name:'Testimonials',         patternId:'vppat-testimonials',  description:'Authentic customer testimonial videos that build trust and social proof for your brand. We coach interviewees for natural delivery, capture b-roll of their environment, and edit compelling stories that resonate with prospects.', features:['Interview coaching','B-roll capture','Natural delivery direction','Subtitled versions','Multi-testimonial series'], sizes:['Single testimonial','3-pack series','5-pack series','Custom'] },
    'event-coverage':   { name:'Event Coverage',       patternId:'vppat-eventcov',      description:'Multi-camera event videography capturing conferences, galas, product launches, and trade shows. We deliver highlight reels, full session recordings, and social-ready clips to extend the life and reach of your events.', features:['Multi-camera setup','Live audio capture','Same-day highlights','Full session recording','Social clip extraction'], sizes:['Half-day (4hrs)','Full-day (8hrs)','Multi-day','Custom'] },
    'explainer':        { name:'Explainer Videos',     patternId:'vppat-explainer',     description:'Concept-to-clarity videos that break down complex products, services, or processes into easy-to-understand visual narratives. We combine animation, live-action, and voiceover to make the complicated feel simple.', features:['Script and storyboard','Animated illustrations','Professional voiceover','Background music','Multiple revision rounds'], sizes:['60-second explainer','90-second explainer','2-minute explainer','Custom'] },
    'training':         { name:'Training Videos',      patternId:'vppat-training',      description:'Internal training and onboarding video content that standardizes knowledge transfer across your organization. We produce modular, chapter-based videos with screen recordings, demonstrations, and assessable segments.', features:['Modular chapter structure','Screen recording integration','Quiz-ready segments','LMS-compatible export','Presenter-led or narrated'], sizes:['Single module','Course (5 modules)','Full program (10+)','Custom'] },
    'animation':        { name:'Animation',            patternId:'vppat-animation',     description:'Custom 2D and 3D animation for commercials, explainers, social content, and internal communications. Our animators bring characters, products, and abstract concepts to life with fluid motion and polished visual storytelling.', features:['2D character animation','3D product rendering','Storyboard development','Frame-by-frame quality','Style guide adherence'], sizes:['15-second animation','30-second animation','60-second animation','Custom'] },
    'aerial-drone':     { name:'Aerial & Drone Video', patternId:'vppat-aerial',        description:'Licensed drone videography capturing sweeping aerial footage of properties, events, construction progress, and landscapes. FAA-compliant operations deliver cinematic perspectives impossible from ground level.', features:['FAA-licensed operators','4K aerial footage','Smooth gimbal stabilization','Orbit and tracking shots','RAW and graded delivery'], sizes:['Single location','Multi-site','Event aerial','Custom'] },
    'timelapse':        { name:'Time-lapse',           patternId:'vppat-timelapse',     description:'Time-lapse video capturing hours, days, or months of activity compressed into captivating sequences. Ideal for construction progress, event setups, manufacturing processes, and natural phenomena documentation.', features:['Long-duration capture','Weatherproof equipment','Flicker-free processing','Day-to-night transitions','Progress documentation'], sizes:['Single-day capture','Multi-day','Long-term (weeks)','Custom'] },
    'live-streaming':   { name:'Live Streaming',       patternId:'vppat-livestream',    description:'Professional live streaming services for conferences, product launches, webinars, and virtual events. We handle multi-camera switching, graphics overlays, and platform delivery to YouTube, LinkedIn, or your custom destination.', features:['Multi-camera switching','Graphics and lower thirds','Platform delivery setup','Audience Q&A integration','Recording backup'], sizes:['Single-camera stream','Multi-camera (2-3)','Full production (4+)','Custom'] },
    'video-editing':    { name:'Video Editing',        patternId:'vppat-editing',       description:'Professional post-production editing services transforming raw footage into polished final videos. We handle assembly, pacing, transitions, color, audio mixing, and graphics integration with fast turnaround times.', features:['Assembly and rough cut','Pacing and rhythm editing','Transition design','Audio sync and mixing','Multiple revision rounds'], sizes:['Short-form (<2min)','Standard (2-5min)','Long-form (5+min)','Custom'] },
    'color-grading':    { name:'Color Grading',        patternId:'vppat-colorgrade',    description:'Cinematic color grading that establishes mood, enhances visual storytelling, and ensures consistency across your video content. We apply custom LUTs, scene-by-scene correction, and brand-specific color treatments.', features:['Custom LUT creation','Scene-by-scene grading','Skin tone optimization','Brand color consistency','HDR and SDR delivery'], sizes:['Short-form (<2min)','Standard (2-10min)','Long-form (10+min)','Custom'] },
    'sound-design':     { name:'Sound Design',         patternId:'vppat-sound',         description:'Complete audio post-production including sound effects, Foley, ambient design, music selection, and final mixing. We ensure your video sounds as polished as it looks with broadcast-standard audio quality.', features:['SFX and Foley design','Ambient soundscapes','Music licensing','Dialogue cleanup','Broadcast-standard mixing'], sizes:['Short-form (<2min)','Standard (2-10min)','Long-form (10+min)','Custom'] },
    'subtitles':        { name:'Subtitles & Captions', patternId:'vppat-subtitles',     description:'Accurate subtitle and closed caption creation for accessibility compliance and social media engagement. We provide burned-in captions, SRT files, and multi-language translations to expand your content\'s reach globally.', features:['SRT/VTT file delivery','Burned-in caption options','ADA compliance','Multi-language translation','Timed to speech patterns'], sizes:['Per-minute pricing','Short-form (<5min)','Long-form (5+min)','Custom'] },
    'youtube':          { name:'YouTube Content',      patternId:'vppat-youtube',       description:'End-to-end YouTube video production optimized for the platform\'s algorithm and audience expectations. We handle thumbnails, intros, end screens, chapter markers, and SEO-driven titles to maximize views and subscriber growth.', features:['Thumbnail design','Intro and end screen','Chapter marker editing','SEO title optimization','Retention-focused pacing'], sizes:['Short video (<10min)','Standard (10-20min)','Long-form (20+min)','Custom'] },
    'reels-shorts':     { name:'Reels & Shorts',       patternId:'vppat-reels',         description:'Vertical short-form video content for Instagram Reels, YouTube Shorts, and TikTok. We create scroll-stopping content with trending formats, quick cuts, text overlays, and hooks designed for maximum reach and engagement.', features:['Vertical 9:16 format','Hook-first structure','Text overlay animations','Trending format adaptation','Batch content creation'], sizes:['Single reel/short','Weekly pack (3)','Monthly pack (12)','Custom'] },
    'corporate':        { name:'Corporate Videos',     patternId:'vppat-corporate',     description:'Professional corporate video production for internal communications, investor presentations, recruitment, and stakeholder updates. We maintain a polished, authoritative tone while keeping content engaging and on-brand.', features:['Executive interviews','Company culture footage','Data visualization','Multi-department coverage','Confidential handling'], sizes:['Short update (1-2min)','Standard (3-5min)','Full presentation (10+)','Custom'] }
  };
  
  var VIDEO_PRODUCTION_SLUG_TO_URL = {
    'promo':'PromoVideos', 'social-clips':'SocialClips', 'motion-graphics':'MotionGraphics',
    'brand-films':'BrandFilms', 'product-demos':'ProductDemos', 'testimonials':'Testimonials',
    'event-coverage':'EventCoverage', 'explainer':'ExplainerVideos', 'training':'TrainingVideos',
    'animation':'Animation', 'aerial-drone':'AerialDroneVideo', 'timelapse':'Timelapse',
    'live-streaming':'LiveStreaming', 'video-editing':'VideoEditing', 'color-grading':'ColorGrading',
    'sound-design':'SoundDesign', 'subtitles':'SubtitlesCaptions', 'youtube':'YouTubeContent',
    'reels-shorts':'ReelsShorts', 'corporate':'CorporateVideos'
  };
  var VIDEO_PRODUCTION_URL_TO_SLUG = {};
  Object.keys(VIDEO_PRODUCTION_SLUG_TO_URL).forEach(function(k) { VIDEO_PRODUCTION_URL_TO_SLUG[VIDEO_PRODUCTION_SLUG_TO_URL[k].toLowerCase()] = k; });
  
  function openVideoProductionSub(slug) {
    var data = videoProductionData[slug];
    if (!data) return;
    var label = document.getElementById('video-production-sub-label');
    var content = document.getElementById('video-production-sub-content');
    label.textContent = 'VIDEO PRODUCTION \u2014 ' + data.name.toUpperCase();
    var featuresHtml = data.features.map(function(f) { return '<li>' + f + '</li>'; }).join('');
    var sizesHtml = data.sizes.map(function(s) { return '<span class="sticker-size-pill">' + s + '</span>'; }).join('');
    content.className = 'sticker-sub-grid';
    content.innerHTML =
      '<div class="sticker-sub-hero" style="text-align:center;">' +
        '<svg viewBox="0 0 140 140" style="width:100%;max-width:320px;"><circle cx="70" cy="70" r="68" fill="url(#' + data.patternId + ')" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="section-num" style="margin-bottom:12px;">Video Production</div>' +
        '<h2 style="font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-0.03em;margin-bottom:16px;color:var(--white);">' + data.name + '</h2>' +
        '<div class="dim-line" style="max-width:340px;margin-bottom:24px;"><div class="dl"></div><span class="dt">SERVICE DETAILS</span><div class="dl"></div></div>' +
        '<p style="font-size:15px;line-height:1.8;color:var(--muted);max-width:520px;margin-bottom:28px;text-align:justify;">' + data.description + '</p>' +
        '<ul class="sticker-feature-list">' + featuresHtml + '</ul>' +
        '<a href="/Contact" class="btn btn-lime" onclick="openPanel(\'panel-contact\');return false;">Get a Custom Quote</a>' +
      '</div>';
    if (window._meshStop) window._meshStop();
    var subPanel = document.getElementById('video-production-sub-panel');
    subPanel.classList.add('open');
    subPanel.scrollTop = 0;
    var meshWrap = subPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush && typeof VIDEO_PRODUCTION_SLUG_TO_URL !== 'undefined') {
      var vpUrlSeg = VIDEO_PRODUCTION_SLUG_TO_URL[slug] || slug;
      history.pushState({ panel:'panel-video-production', sub:slug }, '', '/Services/VideoProduction/' + vpUrlSeg);
    }
  }
  
  function closeVideoProductionSub() {
    var subPanel = document.getElementById('video-production-sub-panel');
    subPanel.classList.remove('open');
    if (window._meshStop) window._meshStop();
    var parentPanel = document.querySelector('#panel-vp-promo, #panel-vp-social, #panel-vp-events, #panel-vp-post');
    var meshWrap = parentPanel && parentPanel.querySelector('.mesh-wrap');
    if (meshWrap && window._meshStart) window._meshStart(meshWrap);
    if (!_routerSuppressPush) {
      history.pushState({ panel:'panel-video-production' }, '', '/Services/VideoProduction');
    }
  }

  // ══════════════════════════════════════════════════════════
  //  BRAND STRATEGY — Sub-Navigation
  // ══════════════════════════════════════════════════════════
  
  var bsNavItems = [
    { label: 'Research & Analysis', panelId: 'panel-bs-research' },
    { label: 'Positioning', panelId: 'panel-bs-positioning' },
    { label: 'Architecture', panelId: 'panel-bs-architecture' },
    { label: 'Direction', panelId: 'panel-bs-direction' }
  ];
  var bsPanelIds = bsNavItems.map(function(i) { return i.panelId; });
  
  function renderBSSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Strategy</div>';
    var items = bsNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < bsNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      var href = (typeof PANEL_ID_TO_URL !== 'undefined' && PANEL_ID_TO_URL[item.panelId]) || '#';
      return '<a class="' + cls + '" href="' + href + '" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }
  
  function injectBSSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderBSSubnav(panelId);
  }
  
  
  // ══════════════════════════════════════════════════════════
  //  BRAND IDENTITY — Sub-Navigation
  // ══════════════════════════════════════════════════════════
  
  var biNavItems = [
    { label: 'Logo & Marks', panelId: 'panel-bi-logos' },
    { label: 'Systems & Guidelines', panelId: 'panel-bi-systems' },
    { label: 'Collateral', panelId: 'panel-bi-collateral' },
    { label: 'Applied Identity', panelId: 'panel-bi-applied' }
  ];
  var biPanelIds = biNavItems.map(function(i) { return i.panelId; });
  
  function renderBISubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Identity</div>';
    var items = biNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < biNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      var href = (typeof PANEL_ID_TO_URL !== 'undefined' && PANEL_ID_TO_URL[item.panelId]) || '#';
      return '<a class="' + cls + '" href="' + href + '" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }
  
  function injectBISubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderBISubnav(panelId);
  }
  
  
  // ══════════════════════════════════════════════════════════
  //  GRAPHIC DESIGN — Sub-Navigation
  // ══════════════════════════════════════════════════════════
  
  var gdNavItems = [
    { label: 'Print & Editorial', panelId: 'panel-gd-print' },
    { label: 'Digital & Social', panelId: 'panel-gd-digital' },
    { label: 'Illustration & Art', panelId: 'panel-gd-illustration' },
    { label: 'Product & Merch', panelId: 'panel-gd-product' }
  ];
  var gdPanelIds = gdNavItems.map(function(i) { return i.panelId; });
  
  function renderGDSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Design</div>';
    var items = gdNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < gdNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      var href = (typeof PANEL_ID_TO_URL !== 'undefined' && PANEL_ID_TO_URL[item.panelId]) || '#';
      return '<a class="' + cls + '" href="' + href + '" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }
  
  function injectGDSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderGDSubnav(panelId);
  }
  
  
  // ══════════════════════════════════════════════════════════
  //  openPanel() additions — inject subnavs
  // ══════════════════════════════════════════════════════════
  //
  // Add these lines inside openPanel() after the existing apparel subnav injection:
  //
  //   if (bsPanelIds.indexOf(id) !== -1) injectBSSubnav(id);
  //   if (biPanelIds.indexOf(id) !== -1) injectBISubnav(id);
  //   if (gdPanelIds.indexOf(id) !== -1) injectGDSubnav(id);
  //
  
  
  // ══════════════════════════════════════════════════════════
  //  SVC_DATA link updates
  // ══════════════════════════════════════════════════════════
  //
  // Replace the existing SVC_DATA entries for these 3 categories:
  //
  // 'brand-strategy': {
  //   ...existing icon, anno, title, desc...
  //   links: [
  //     { label: 'Research & Analysis', panel: 'panel-bs-research' },
  //     { label: 'Positioning', panel: 'panel-bs-positioning' },
  //     { label: 'Architecture', panel: 'panel-bs-architecture' },
  //     { label: 'Direction', panel: 'panel-bs-direction' }
  //   ]
  // },
  //
  // 'brand-identity': {
  //   ...existing icon, anno, title, desc...
  //   links: [
  //     { label: 'Logo & Marks', panel: 'panel-bi-logos' },
  //     { label: 'Systems & Guidelines', panel: 'panel-bi-systems' },
  //     { label: 'Collateral', panel: 'panel-bi-collateral' },
  //     { label: 'Applied Identity', panel: 'panel-bi-applied' }
  //   ]
  // },
  //
  // 'graphic-design': {
  //   ...existing icon, anno, title, desc...
  //   links: [
  //     { label: 'Print & Editorial', panel: 'panel-gd-print' },
  //     { label: 'Digital & Social', panel: 'panel-gd-digital' },
  //     { label: 'Illustration & Art', panel: 'panel-gd-illustration' },
  //     { label: 'Product & Merch', panel: 'panel-gd-product' }
  //   ]
  // },
  //
  
  
  // ══════════════════════════════════════════════════════════
  //  closeBrandStrategySub() update
  // ══════════════════════════════════════════════════════════
  //
  // The existing closeBrandStrategySub() references 'panel-brand-strategy'
  // which no longer exists. Update it to navigate back to the last active
  // BS subdivision panel. One approach:
  //
  //   var _lastBSPanel = 'panel-bs-research';
  //   // Set _lastBSPanel in openPanel() when a BS panel opens
  //   // Then in closeBrandStrategySub():
  //   //   var parentPanel = document.getElementById(_lastBSPanel);
  //
  // Similarly for closeBrandIdentitySub() and closeGraphicDesignSub().
  
  // ══════════════════════════════════════════════════════════
  //  LAYOUT DESIGN — Sub-Navigation
  // ══════════════════════════════════════════════════════════
  
  var ldNavItems = [
    { label: 'Marketing', panelId: 'panel-ld-marketing' },
    { label: 'Publications', panelId: 'panel-ld-publications' },
    { label: 'Reports', panelId: 'panel-ld-reports' },
    { label: 'Business', panelId: 'panel-ld-business' }
  ];
  var ldPanelIds = ldNavItems.map(function(i) { return i.panelId; });
  
  function renderLDSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Layout</div>';
    var items = ldNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < ldNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      var href = (typeof PANEL_ID_TO_URL !== 'undefined' && PANEL_ID_TO_URL[item.panelId]) || '#';
      return '<a class="' + cls + '" href="' + href + '" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }
  
  function injectLDSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderLDSubnav(panelId);
  }
  
  
  // ══════════════════════════════════════════════════════════
  //  MOCKUPS — Sub-Navigation
  // ══════════════════════════════════════════════════════════
  
  var muNavItems = [
    { label: 'Apparel & Accessories', panelId: 'panel-mu-apparel' },
    { label: 'Print & Packaging', panelId: 'panel-mu-print' },
    { label: 'Signage & Display', panelId: 'panel-mu-signage' },
    { label: 'Digital', panelId: 'panel-mu-digital' }
  ];
  var muPanelIds = muNavItems.map(function(i) { return i.panelId; });
  
  function renderMUSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Mockups</div>';
    var items = muNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < muNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      var href = (typeof PANEL_ID_TO_URL !== 'undefined' && PANEL_ID_TO_URL[item.panelId]) || '#';
      return '<a class="' + cls + '" href="' + href + '" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }
  
  function injectMUSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderMUSubnav(panelId);
  }
  
  
  // ══════════════════════════════════════════════════════════
  //  WEB DESIGN — Sub-Navigation
  // ══════════════════════════════════════════════════════════
  
  var wdNavItems = [
    { label: 'Sites', panelId: 'panel-wd-sites' },
    { label: 'Applications', panelId: 'panel-wd-apps' },
    { label: 'UX & Prototyping', panelId: 'panel-wd-ux' },
    { label: 'Polish', panelId: 'panel-wd-polish' }
  ];
  var wdPanelIds = wdNavItems.map(function(i) { return i.panelId; });
  
  function renderWDSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Web</div>';
    var items = wdNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < wdNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      var href = (typeof PANEL_ID_TO_URL !== 'undefined' && PANEL_ID_TO_URL[item.panelId]) || '#';
      return '<a class="' + cls + '" href="' + href + '" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }
  
  function injectWDSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderWDSubnav(panelId);
  }
  
  // ════════ PHOTOGRAPHY SUBNAV ════════
  
  var phNavItems = [
    { label: 'Product & Commercial', panelId: 'panel-ph-product' },
    { label: 'People & Events', panelId: 'panel-ph-people' },
    { label: 'Post-Production', panelId: 'panel-ph-post' },
    { label: 'Creative & Specialty', panelId: 'panel-ph-creative' }
  ];
  var phPanelIds = phNavItems.map(function(i) { return i.panelId; });
  
  function renderPhSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Photo</div>';
    var items = phNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < phNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      return '<a class="' + cls + '" href="#" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }
  
  function injectPhSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderPhSubnav(panelId);
  }
  
  
  // ════════ VIDEO PRODUCTION SUBNAV ════════
  
  var vpNavItems = [
    { label: 'Promo & Brand', panelId: 'panel-vp-promo' },
    { label: 'Social & Digital', panelId: 'panel-vp-social' },
    { label: 'Event & Live', panelId: 'panel-vp-events' },
    { label: 'Post-Production', panelId: 'panel-vp-post' }
  ];
  var vpPanelIds = vpNavItems.map(function(i) { return i.panelId; });
  
  function renderVpSubnav(activePanelId) {
    var header = '<div class="printing-subnav-header">Video</div>';
    var items = vpNavItems.map(function(item, i) {
      var num = String(i + 1).length < 2 ? '0' + (i + 1) : '' + (i + 1);
      var cls = 'printing-subnav-link' + (item.panelId === activePanelId ? ' active' : '');
      var tick = i < vpNavItems.length - 1 ? '<div class="printing-subnav-tick"></div>' : '';
      return '<a class="' + cls + '" href="#" onclick="openPanel(\'' + item.panelId + '\');return false;">' +
        '<div class="corner top-left"></div><div class="corner top-right"></div>' +
        '<div class="corner bottom-left"></div><div class="corner bottom-right"></div>' +
        '<span class="printing-subnav-num">' + num + '</span>' +
        '<span class="printing-subnav-label">' + item.label + '</span></a>' + tick;
    }).join('');
    var footer = '<div class="printing-subnav-footer">4 Divisions</div>';
    return header + '<div class="printing-subnav-items">' + items + '</div>' + footer;
  }
  
  function injectVpSubnav(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var nav = panel.querySelector('.printing-subnav');
    if (nav) nav.innerHTML = renderVpSubnav(panelId);
  }  // ── CLIENT-SIDE ROUTER ──────────────────────────────────────────

  var PANEL_ID_TO_URL = {
    'panel-stickers':    '/Printing/StickersAndDecals',
    'panel-packaging':   '/Printing/LabelsAndPackaging',
    'panel-signs':       '/Printing/BannersAndSigns',
    'panel-largeformat': '/Printing/LargeFormatGraphics',
    'panel-events':      '/Printing/EventGraphics',
    'panel-marketing':   '/Printing/MarketingMaterials',
    'panel-dtg':         '/Apparel/DTG',
    'panel-dtf':         '/Apparel/DTF',
    'panel-screenprint': '/Apparel/ScreenPrinting',
    'panel-embroidery':  '/Apparel/Embroidery',
    'panel-projects':    '/Work',
    'panel-about':       '/About',
    'panel-contact':     '/Contact',
    'panel-bs-research':     '/brand-strategy/research-analysis',
    'panel-bs-positioning':  '/brand-strategy/positioning',
    'panel-bs-architecture': '/brand-strategy/architecture',
    'panel-bs-direction':    '/brand-strategy/direction',
    'panel-bi-logos':        '/brand-identity/logo-marks',
    'panel-bi-systems':      '/brand-identity/systems-guidelines',
    'panel-bi-collateral':   '/brand-identity/collateral',
    'panel-bi-applied':      '/brand-identity/applied-identity',
    'panel-gd-print':        '/graphic-design/print-editorial',
    'panel-gd-digital':      '/graphic-design/digital-social',
    'panel-gd-illustration': '/graphic-design/illustration-art',
    'panel-gd-product':      '/graphic-design/product-merch',
    'panel-ld-marketing':    '/layout-design/marketing',
    'panel-ld-publications': '/layout-design/publications',
    'panel-ld-reports':      '/layout-design/reports',
    'panel-ld-business':     '/layout-design/business',
    'panel-mu-apparel':      '/mockups/apparel-accessories',
    'panel-mu-print':        '/mockups/print-packaging',
    'panel-mu-signage':      '/mockups/signage-display',
    'panel-mu-digital':      '/mockups/digital',
    'panel-wd-sites':        '/web-design/sites',
    'panel-wd-apps':         '/web-design/applications',
    'panel-wd-ux':           '/web-design/ux-prototyping',
    'panel-wd-polish':       '/web-design/polish',
    'panel-ph-product':      '/photography/product-commercial',
    'panel-ph-people':       '/photography/people-events',
    'panel-ph-post':         '/photography/post-production',
    'panel-ph-creative':     '/photography/creative-specialty',
    'panel-vp-promo':        '/video-production/promo-brand',
    'panel-vp-social':       '/video-production/social-digital',
    'panel-vp-events':       '/video-production/event-live',
    'panel-vp-post':         '/video-production/post-production'
  };

  var PROJECT_ID_TO_URL = {
    'project-meridian': '/Work/Meridian',
    'project-apex':     '/Work/Apex',
    'project-solstice': '/Work/Solstice',
    'project-harbor':   '/Work/Harbor'
  };

  var STICKER_SLUG_TO_URL = {
    'die-cut':'DieCut','rounded-corner':'RoundedCorner','kiss-cut':'KissCut',
    'decal':'Decal','oval':'Oval','circle':'CircleStickers',
    'rectangular':'Rectangular','square':'Square','bumper':'Bumper',
    'clear':'Clear','transfer':'Transfer','vinyl':'VinylLettering',
    'window':'WindowClings','front-adhesive':'FrontAdhesive',
    'holographic':'Holographic','glitter':'Glitter','fabric':'Fabric',
    'floor':'Floor','qr-code':'QRCode','sheets':'StickerSheets'
  };
  var STICKER_URL_TO_SLUG = {};
  Object.keys(STICKER_SLUG_TO_URL).forEach(function(k) {
    STICKER_URL_TO_SLUG[STICKER_SLUG_TO_URL[k].toLowerCase()] = k;
  });

  // Reverse lookup: lowercase path → { type, id, parent? }
  var ROUTES = {};
  Object.keys(PANEL_ID_TO_URL).forEach(function(id) {
    ROUTES[PANEL_ID_TO_URL[id].toLowerCase()] = { type: 'panel', id: id };
  });
  Object.keys(PROJECT_ID_TO_URL).forEach(function(id) {
    var parentId = 'panel-projects';
    ROUTES[PROJECT_ID_TO_URL[id].toLowerCase()] = { type: 'project', id: id, parent: parentId };
  });

  var _routerSuppressPush = false;

  function closeAllPanels() {
    document.querySelectorAll('.page-panel.open').forEach(function(p) { p.classList.remove('open'); });
    document.querySelectorAll('.project-panel.open').forEach(function(p) {
      p.classList.remove('open');
      var back = p.querySelector('.project-back');
      if (back) back.classList.remove('visible');
    });
    document.body.classList.remove('panel-open');
    document.getElementById('logo-dark').style.display  = 'block';
    document.getElementById('logo-white').style.display = 'none';
    document.getElementById('site-logo').style.cursor   = 'default';
    if (window._meshStop) window._meshStop();
  }

  function routerDispatch(pathname) {
    var key = pathname.toLowerCase().replace(/\/+$/, '') || '/';

    // Sticker sub-routes: /printing/stickersanddecals/<slug>
    var stickerPrefix = '/printing/stickersanddecals/';
    if (key.indexOf(stickerPrefix) === 0 && key.length > stickerPrefix.length) {
      var urlSlug = key.slice(stickerPrefix.length);
      var stickerSlug = STICKER_URL_TO_SLUG[urlSlug];
      if (stickerSlug) {
        _routerSuppressPush = true;
        openPanel('panel-stickers');
        openStickerSub(stickerSlug);
        _routerSuppressPush = false;
        return;
      }
    }

    // Label sub-routes: /printing/labelsandpackaging/<slug>
    var labelPrefix = '/printing/labelsandpackaging/';
    if (key.indexOf(labelPrefix) === 0 && key.length > labelPrefix.length) {
      var labelUrlSlug = key.slice(labelPrefix.length);
      var labelSlug = LABEL_URL_TO_SLUG[labelUrlSlug];
      if (labelSlug) {
        _routerSuppressPush = true;
        openPanel('panel-packaging');
        openLabelSub(labelSlug);
        _routerSuppressPush = false;
        return;
      }
    }

    // Banner sub-routes: /printing/bannersandsigns/<slug>
    var bannerPrefix = '/printing/bannersandsigns/';
    if (key.indexOf(bannerPrefix) === 0 && key.length > bannerPrefix.length) {
      var bannerUrlSlug = key.slice(bannerPrefix.length);
      var bannerSlug = BANNER_URL_TO_SLUG[bannerUrlSlug];
      if (bannerSlug) {
        _routerSuppressPush = true;
        openPanel('panel-signs');
        openBannerSub(bannerSlug);
        _routerSuppressPush = false;
        return;
      }
    }

    // Large Format sub-routes: /printing/largeformatgraphics/<slug>
    var lfPrefix = '/printing/largeformatgraphics/';
    if (key.indexOf(lfPrefix) === 0 && key.length > lfPrefix.length) {
      var lfUrlSlug = key.slice(lfPrefix.length);
      var lfSlug = LF_URL_TO_SLUG[lfUrlSlug];
      if (lfSlug) {
        _routerSuppressPush = true;
        openPanel('panel-largeformat');
        openLargeFormatSub(lfSlug);
        _routerSuppressPush = false;
        return;
      }
    }

    // Event sub-routes: /printing/eventgraphics/<slug>
    var eventPrefix = '/printing/eventgraphics/';
    if (key.indexOf(eventPrefix) === 0 && key.length > eventPrefix.length) {
      var eventUrlSlug = key.slice(eventPrefix.length);
      var eventSlug = EVENT_URL_TO_SLUG[eventUrlSlug];
      if (eventSlug) {
        _routerSuppressPush = true;
        openPanel('panel-events');
        openEventSub(eventSlug);
        _routerSuppressPush = false;
        return;
      }
    }

    // Marketing sub-routes: /printing/marketingmaterials/<slug>
    var mkPrefix = '/printing/marketingmaterials/';
    if (key.indexOf(mkPrefix) === 0 && key.length > mkPrefix.length) {
      var mkUrlSlug = key.slice(mkPrefix.length);
      var mkSlug = MARKETING_URL_TO_SLUG[mkUrlSlug];
      if (mkSlug) {
        _routerSuppressPush = true;
        openPanel('panel-marketing');
        openMarketingSub(mkSlug);
        _routerSuppressPush = false;
        return;
      }
    }

    // Homepage
    if (key === '/' || key === '') {
      closeAllPanels();
      return;
    }

    var route = ROUTES[key];
    if (!route) { closeAllPanels(); return; }

    if (route.type === 'panel') {
      // Close any open project panels first
      document.querySelectorAll('.project-panel.open').forEach(function(p) {
        p.classList.remove('open');
        var back = p.querySelector('.project-back');
        if (back) back.classList.remove('visible');
      });
      openPanel(route.id);
    } else if (route.type === 'project') {
      openPanel(route.parent);
      openProject(route.id);
    }
  }

  // Browser back/forward
  window.addEventListener('popstate', function() {
    _routerSuppressPush = true;
    routerDispatch(window.location.pathname);
    _routerSuppressPush = false;
  });

  // Initial load: open panel matching current URL (defer until DOM is ready)
  function _routerInit() {
    var path = window.location.pathname;
    if (path && path !== '/') {
      _routerSuppressPush = true;
      routerDispatch(path);
      _routerSuppressPush = false;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _routerInit);
  } else {
    // DOM already ready (shouldn't happen since script is before project panels, but just in case)
    _routerInit();
  }

