/* ==========================================================================
   JZWXZ Blog · Minimal Client Interactions
   - Light / Castle Town Dark theme persistence
   - Mobile sidebar drawer
   - Authentic Deltarune Dark Fountain + Twinkling Starlight FX (Dark Mode)
   ========================================================================== */

(function () {
  const STORAGE_THEME = 'jzwxz_theme';
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function getTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  /* ------------------------------------------------------------------------
     Canonical Deltarune Dark Fountain + Starlight Canvas (Dark Mode only)
     Reference: spr_castle_fountain (jet-black core + rising arched waves),
     spr_fountainedge (scalloped white/iridescent rims), bg_fountain1 (cycling hue)
     ------------------------------------------------------------------------ */
  const canvas = document.getElementById('castle-fx-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let rafId = 0;
  let cw = 0;
  let ch = 0;

  // Deterministic pixel stars across the upper midnight sky
  const stars = Array.from({ length: 50 }, (_, i) => {
    const s1 = Math.sin(i * 12.9898) * 43758.5453;
    const s2 = Math.sin(i * 78.233 + 1.7) * 43758.5453;
    const s3 = Math.sin(i * 45.164 + 3.1) * 43758.5453;
    let x = s1 - Math.floor(s1);
    if (x > 0.41 && x < 0.59) {
      x = x < 0.5 ? x - 0.16 : x + 0.16;
    }
    const y = 0.03 + (s2 - Math.floor(s2)) * 0.4;
    const speed = 1.0 + (s3 - Math.floor(s3)) * 2.2;
    const phase = (i * 1.37) % (Math.PI * 2);
    const size = i % 5 === 0 ? 3 : 2;
    const palette = ['#f0f7ff', '#a5f3fc', '#ddd6fe', '#c7d2fe'];
    return { x, y, speed, phase, size, color: palette[i % palette.length] };
  });

  // Rising glowing orbs / edge wisps flanking the Dark Fountain
  const orbs = Array.from({ length: 24 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const r1 = Math.abs((Math.sin(i * 23.17) * 43758.5453) % 1);
    const r2 = Math.abs((Math.sin(i * 41.89 + 1.2) * 43758.5453) % 1);
    return {
      side,
      spread: 0.72 + r1 * 0.65,
      progress: r2,
      speed: 0.14 + (i % 6) * 0.03,
      size: i % 4 === 0 ? 4 : 2,
      phase: (i * 1.1) % (Math.PI * 2),
    };
  });

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.max(1, Math.floor(rect.width));
    ch = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let lastTs = 0;

  // Pixel-quantized scalloped edge function matching spr_fountainedge
  function fountainHalfWidth(y, baseH, maxHalfW, t) {
    const norm = Math.max(0, Math.min(1, 1 - y / baseH)); // 0 at castle base, 1 at top
    const scrollY = y + t * 88;
    // Scalloped rhythmic wave (like spr_fountainedge)
    const scallop = Math.sin(scrollY * 0.055) * 7.5 + Math.sin(scrollY * 0.11 - 0.8) * 2.5;
    const baseExpand = Math.pow(1 - norm, 2.2) * 14;
    return Math.max(16, Math.round((maxHalfW + baseExpand + scallop) / 2) * 2);
  }

  function drawFrame(ts) {
    if (!ctx || getTheme() !== 'dark' || document.hidden) {
      rafId = 0;
      return;
    }

    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;
    const t = ts / 1000;

    ctx.clearRect(0, 0, cw, ch);

    const cx = Math.round(cw * 0.5);
    // Aligns cleanly behind the castle spire in castle-town-bg.webp
    const baseY = Math.round(ch * 0.42);
    const maxHalfW = Math.min(cw * 0.048, 46);

    // Canonical Deltarune slowly cycling iridescent Dark Fountain hue (cyan -> indigo -> violet -> magenta)
    const hue = 195 + Math.sin(t * 0.35) * 65 + 35; // cycles smoothly ~165..295
    const hue2 = hue + 32;

    // 1. Soft cycling outer atmospheric aura around the Dark Fountain
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const auraW = maxHalfW * 3.4;
    const auraGrad = ctx.createLinearGradient(cx - auraW, 0, cx + auraW, 0);
    auraGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    auraGrad.addColorStop(0.28, `hsla(${hue2}, 82%, 56%, 0.14)`);
    auraGrad.addColorStop(0.5, `hsla(${hue}, 92%, 68%, 0.32)`);
    auraGrad.addColorStop(0.72, `hsla(${hue2}, 82%, 56%, 0.14)`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    const vMask = ctx.createLinearGradient(0, baseY + 18, 0, 0);
    vMask.addColorStop(0, 'rgba(0,0,0,0)');
    vMask.addColorStop(0.18, 'rgba(255,255,255,1)');
    vMask.addColorStop(1, 'rgba(255,255,255,1)');

    ctx.fillStyle = auraGrad;
    ctx.fillRect(cx - auraW, 0, auraW * 2, baseY + 10);
    ctx.restore();

    // 2. Build the canonical scalloped Dark Fountain pillar path (pixel-stepped)
    const stepY = 4;
    const leftPts = [];
    const rightPts = [];
    for (let y = baseY; y >= -4; y -= stepY) {
      const hw = fountainHalfWidth(y, baseY, maxHalfW, t);
      leftPts.push([cx - hw, y]);
      rightPts.push([cx + hw, y]);
    }

    function tracePillarPath() {
      ctx.beginPath();
      ctx.moveTo(leftPts[0][0], leftPts[0][1]);
      for (let i = 1; i < leftPts.length; i++) ctx.lineTo(leftPts[i][0], leftPts[i][1]);
      for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i][0], rightPts[i][1]);
      ctx.closePath();
    }

    // 3. Fill PITCH-BLACK void core + clip internal surging arched waves (spr_castle_fountain style!)
    ctx.save();
    tracePillarPath();
    // Fade the very bottom cleanly behind the castle spire silhouette
    const coreGrad = ctx.createLinearGradient(0, baseY, 0, baseY - 46);
    coreGrad.addColorStop(0, 'rgba(4, 5, 12, 0.35)');
    coreGrad.addColorStop(1, 'rgba(3, 4, 10, 0.96)');
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.clip();

    // Internal rising liquid-light arched crests (direct homage to spr_castle_fountain 6 frames!)
    const crestSpacing = 74;
    const scrollOffset = (t * 82) % crestSpacing;
    for (let k = -1; k < Math.ceil(baseY / crestSpacing) + 2; k++) {
      const cy = baseY - (k * crestSpacing + scrollOffset);
      if (cy > baseY + 24 || cy < -60) continue;

      const archW = maxHalfW * 0.88;
      const archH = 26;

      // Upper luminous indigo-violet liquid dome crest
      ctx.fillStyle = `hsla(${hue2}, 72%, 58%, 0.62)`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, archW, archH, 0, Math.PI, 0);
      ctx.lineTo(cx + archW, cy + 14);
      ctx.ellipse(cx, cy + 14, archW * 0.92, archH * 0.72, 0, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();

      // Subtle vertical drip/comb lines trailing above each crest (just like spr_castle_fountain)
      ctx.fillStyle = `hsla(${hue}, 85%, 72%, 0.35)`;
      for (let s = -3; s <= 3; s++) {
        const sx = Math.round(cx + s * (archW * 0.24));
        const streakH = 10 + Math.abs((s * 7 + k * 5) % 14);
        ctx.fillRect(sx - 1, Math.round(cy - archH - streakH + 6), 2, streakH);
      }

      // Inner crisp dark void bubble carving underneath the crest
      ctx.fillStyle = 'rgba(3, 4, 10, 0.92)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 16, archW * 0.86, archH * 0.66, 0, Math.PI, 0);
      ctx.fill();
    }

    // Subtle dark-cyan/white vertical highlight diamond peeking right above the castle spire
    const sparkPulse = 0.65 + 0.35 * Math.sin(t * 5.2);
    ctx.fillStyle = `hsla(${hue - 15}, 95%, 78%, ${(0.55 * sparkPulse).toFixed(2)})`;
    ctx.beginPath();
    ctx.moveTo(cx, baseY - 22);
    ctx.lineTo(cx + 8, baseY - 4);
    ctx.lineTo(cx, baseY + 4);
    ctx.lineTo(cx - 8, baseY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Canonical glowing iridescent + crisp white scalloped rims along left & right edges
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawSideRim = (pts) => {
      // Wide outer cycling neon halo
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = `hsla(${hue}, 92%, 64%, 0.52)`;
      ctx.lineWidth = 10;
      ctx.stroke();

      // Mid saturated cobalt/violet rim
      ctx.strokeStyle = `hsla(${hue2}, 86%, 68%, 0.86)`;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Crisp inner pixel-bright white edge (signature spr_fountainedge highlight!)
      ctx.strokeStyle = 'rgba(242, 249, 255, 0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawSideRim(leftPts);
    drawSideRim(rightPts);
    ctx.restore();

    // 5. Rising luminous orbs flanking the Dark Fountain edges
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const o of orbs) {
      o.progress += o.speed * dt;
      if (o.progress > 1) o.progress -= 1;

      const y = baseY * (1 - o.progress);
      const hw = fountainHalfWidth(y, baseY, maxHalfW, t);
      const x = cx + o.side * (hw * o.spread + Math.sin(t * 2.4 + o.phase) * 6);
      const alpha = Math.sin(o.progress * Math.PI) * 0.82;

      ctx.fillStyle = `hsla(${hue}, 95%, 82%, ${alpha.toFixed(3)})`;
      ctx.fillRect(Math.round(x), Math.round(y), o.size, o.size);
    }
    ctx.restore();

    // 6. Twinkling pixel starlight across the midnight sky
    for (const s of stars) {
      const pulse = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      const alpha = 0.16 + Math.pow(pulse, 2.2) * 0.84;
      const sx = Math.round(s.x * cw);
      const sy = Math.round(s.y * ch);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.fillRect(sx, sy, s.size, s.size);

      if (pulse > 0.72) {
        const arm = s.size === 3 ? 3 : 2;
        ctx.globalAlpha = (pulse - 0.72) * 2.4;
        ctx.fillRect(sx - arm, sy + Math.floor(s.size / 2), s.size + arm * 2, 1);
        ctx.fillRect(sx + Math.floor(s.size / 2), sy - arm, 1, s.size + arm * 2);
      }
    }
    ctx.globalAlpha = 1;

    rafId = window.requestAnimationFrame(drawFrame);
  }

  function syncCastleFX() {
    if (!canvas || !ctx || reduceMotion) return;
    if (getTheme() === 'dark' && !document.hidden) {
      resizeCanvas();
      if (!rafId) {
        lastTs = 0;
        rafId = window.requestAnimationFrame(drawFrame);
      }
    } else if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
      ctx.clearRect(0, 0, cw, ch);
    }
  }

  window.addEventListener('resize', () => {
    if (getTheme() === 'dark') resizeCanvas();
  });

  document.addEventListener('visibilitychange', syncCastleFX);

  /* ------------------------------------------------------------------------
     Theme Toggle
     ------------------------------------------------------------------------ */
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_THEME, theme);
    } catch {}
    if (themeLabel) {
      themeLabel.textContent = theme === 'dark' ? '浅色纸墨' : '城堡镇夜色';
    }
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    syncCastleFX();
  }

  applyTheme(getTheme());

  themeBtn?.addEventListener('click', () => {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  });

  /* ------------------------------------------------------------------------
     PDF / Hextra-Style Collapsible 2-Level Sidebar Tree
     Click any level-1 folder row to expand its pure-text items; click again to collapse.
     ------------------------------------------------------------------------ */
  document.querySelectorAll('.nav-group[data-nav-group]').forEach((group) => {
    const folderBtn = group.querySelector('.nav-folder');
    if (!folderBtn) return;

    folderBtn.addEventListener('click', () => {
      const open = group.classList.toggle('is-open');
      folderBtn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ------------------------------------------------------------------------
     Mobile Sidebar Drawer
     ------------------------------------------------------------------------ */
  const sidebar = document.getElementById('site-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuBtn = document.getElementById('mobile-menu-btn');

  function setDrawer(open) {
    sidebar?.classList.toggle('is-open', open);
    backdrop?.classList.toggle('is-open', open);
    menuBtn?.setAttribute('aria-expanded', String(open));
  }

  menuBtn?.addEventListener('click', () => {
    setDrawer(!sidebar?.classList.contains('is-open'));
  });

  backdrop?.addEventListener('click', () => setDrawer(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setDrawer(false);
  });
})();
