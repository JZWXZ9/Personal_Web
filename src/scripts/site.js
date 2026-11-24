/* ==========================================================================
   JZWXZ Blog · Minimal Client Interactions
   - Light / Castle Town Dark theme persistence
   - Mobile sidebar drawer
   - Castle Town live backdrop FX (Dark Fountain surge + twinkling starlight)
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
     Castle Town Live Canvas FX (runs ONLY in Dark Mode & when visible)
     ------------------------------------------------------------------------ */
  const canvas = document.getElementById('castle-fx-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let rafId = 0;
  let cw = 0;
  let ch = 0;

  // Deterministic pseudo-random stars across the upper midnight sky
  const stars = Array.from({ length: 48 }, (_, i) => {
    const s1 = Math.sin(i * 12.9898) * 43758.5453;
    const s2 = Math.sin(i * 78.233 + 1.7) * 43758.5453;
    const s3 = Math.sin(i * 45.164 + 3.1) * 43758.5453;
    let x = s1 - Math.floor(s1);
    // Keep stars mostly outside the bright center fountain column
    if (x > 0.43 && x < 0.57) {
      x = x < 0.5 ? x - 0.14 : x + 0.14;
    }
    const y = 0.03 + (s2 - Math.floor(s2)) * 0.42;
    const speed = 1.1 + (s3 - Math.floor(s3)) * 2.1;
    const phase = (i * 1.37) % (Math.PI * 2);
    const size = i % 5 === 0 ? 3 : 2;
    const palette = ['#f0f7ff', '#a5f3fc', '#ddd6fe', '#c7d2fe'];
    return { x, y, speed, phase, size, color: palette[i % palette.length] };
  });

  // Rising luminous wisps & pixel sparks inside the Dark Fountain
  const wisps = Array.from({ length: 32 }, (_, i) => {
    const r1 = (Math.sin(i * 19.31) * 43758.5453) % 1;
    const r2 = (Math.sin(i * 37.73 + 2.4) * 43758.5453) % 1;
    return {
      offset: (Math.abs(r1) - 0.5) * 2, // -1 .. 1 across fountain width
      progress: Math.abs(r2), // 0 (bottom) .. 1 (top)
      speed: 0.16 + (i % 7) * 0.032,
      len: 14 + (i % 5) * 9,
      width: i % 3 === 0 ? 3 : 2,
      sway: (i * 0.9) % (Math.PI * 2),
      hue: i % 3 === 0 ? 'cyan' : i % 3 === 1 ? 'violet' : 'white',
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

  function drawFrame(ts) {
    if (!ctx || getTheme() !== 'dark' || document.hidden) {
      rafId = 0;
      return;
    }

    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;
    const t = ts / 1000;

    ctx.clearRect(0, 0, cw, ch);

    // 1. Surging Dark Fountain layered undulating energy ribbons
    const cx = cw * 0.5;
    const fountainBaseY = ch * 0.46;
    const beamHalfW = Math.min(cw * 0.075, 76);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const ribbons = [
      { color: 'rgba(139, 92, 246, 0.16)', width: beamHalfW * 1.55, amp: 8, freq: 0.016, speed: 2.6, phase: 0 },
      { color: 'rgba(192, 132, 252, 0.18)', width: beamHalfW * 1.05, amp: 6, freq: 0.022, speed: 3.4, phase: 1.8 },
      { color: 'rgba(56, 189, 248, 0.15)', width: beamHalfW * 0.72, amp: 5, freq: 0.028, speed: 4.1, phase: 3.2 },
      { color: 'rgba(232, 245, 255, 0.13)', width: beamHalfW * 0.34, amp: 3, freq: 0.032, speed: 4.8, phase: 0.9 },
    ];

    const stepY = 12;
    for (const r of ribbons) {
      ctx.beginPath();
      // Left edge going up
      for (let y = fountainBaseY; y >= 0; y -= stepY) {
        const norm = 1 - y / fountainBaseY; // 0 at base, 1 at top
        const taper = 1 - norm * 0.22;
        const wave = Math.sin(y * r.freq + t * r.speed + r.phase) * r.amp;
        const x = cx - r.width * taper + wave;
        if (y === fountainBaseY) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // Right edge going down
      for (let y = 0; y <= fountainBaseY; y += stepY) {
        const norm = 1 - y / fountainBaseY;
        const taper = 1 - norm * 0.22;
        const wave = Math.sin(y * r.freq + t * r.speed + r.phase + 0.8) * r.amp;
        const x = cx + r.width * taper + wave;
        ctx.lineTo(x, y);
      }
      ctx.closePath();

      const grad = ctx.createLinearGradient(cx, fountainBaseY, cx, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.18, r.color);
      grad.addColorStop(0.85, r.color);
      grad.addColorStop(1, 'rgba(139, 92, 246, 0.05)');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // 2. Rising Dark Fountain energy wisps & pixel sparks
    for (const w of wisps) {
      w.progress += w.speed * dt;
      if (w.progress > 1) w.progress -= 1;

      const y = fountainBaseY * (1 - w.progress);
      const spread = beamHalfW * (0.95 - w.progress * 0.2);
      const x = cx + w.offset * spread + Math.sin(t * 2.5 + w.sway + w.progress * 6) * 5;
      const alpha = Math.sin(w.progress * Math.PI) * 0.72;

      if (w.hue === 'cyan') ctx.fillStyle = `rgba(125, 211, 252, ${alpha.toFixed(3)})`;
      else if (w.hue === 'violet') ctx.fillStyle = `rgba(216, 180, 254, ${alpha.toFixed(3)})`;
      else ctx.fillStyle = `rgba(240, 249, 255, ${(alpha * 0.85).toFixed(3)})`;

      ctx.fillRect(Math.round(x), Math.round(y), w.width, w.len);
    }

    ctx.restore();

    // 3. Twinkling pixel starlight across the upper midnight sky
    for (const s of stars) {
      const pulse = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      const alpha = 0.16 + Math.pow(pulse, 2.2) * 0.84;
      const sx = Math.round(s.x * cw);
      const sy = Math.round(s.y * ch);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.fillRect(sx, sy, s.size, s.size);

      // Subtle 4-point pixel sparkle at peak twinkle
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
