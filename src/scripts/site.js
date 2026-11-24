/* ==========================================================================
   JZWXZ Blog · Minimal Client Interactions
   - Light / Castle Town Dark theme persistence
   - Mobile sidebar drawer
   - Ralsei Ch.1 / Ch.2 / Blush sprite toggle & dialogue whispers
   - Home Castle Town Save Point interactive easter egg
   ========================================================================== */

(function () {
  const STORAGE_THEME = 'jzwxz_theme';
  const STORAGE_RALSEI = 'jzwxz_ralsei_pose';

  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');

  // Ralsei sprite states (from local Deltarune Ch1 & Ch2 data.win)
  const RALSEI_POSES = [
    {
      id: 'ch2',
      src: '/assets/deltarune/ralsei-ch2.png',
      badge: 'Ch.2',
      line: 'Welcome to Castle Town. Take your time reading.',
    },
    {
      id: 'ch2-blush',
      src: '/assets/deltarune/ralsei-ch2-blush.png',
      badge: 'Ch.2',
      line: 'Oh! Thanks for visiting my little corner!',
    },
    {
      id: 'ch1',
      src: '/assets/deltarune/ralsei-ch1.png',
      badge: 'Ch.1',
      line: 'The power of clean proofs shines within you.',
    },
    {
      id: 'ch1-blush',
      src: '/assets/deltarune/ralsei-ch1-blush.png',
      badge: 'Ch.1',
      line: 'Remember to take breaks between theorems!',
    },
  ];

  const SAVE_LINES = [
    'The warmth of Castle Town fills you with determination.  [File saved]',
    'Every lemma and line of code is safely archived.  [File saved]',
    'At times, you see a quiet desk beside the fountain.  [File saved]',
  ];

  function getTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme, syncRalsei = false) {
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
    if (syncRalsei) {
      // Dark mode pairs naturally with Ch.1 Hat Ralsei; Light mode pairs with Ch.2 Hatless Ralsei
      applyRalseiPose(theme === 'dark' ? 'ch1' : 'ch2', true);
    }
  }

  function applyRalseiPose(poseId, persist = true) {
    const pose = RALSEI_POSES.find((p) => p.id === poseId) || RALSEI_POSES[0];
    if (persist) {
      try {
        sessionStorage.setItem(STORAGE_RALSEI, pose.id);
      } catch {}
    }

    const sidebarImg = document.getElementById('ralsei-sidebar-img');
    const sidebarBadge = document.getElementById('ralsei-sidebar-badge');
    const sidebarSpeech = document.getElementById('ralsei-sidebar-speech');
    const dioramaImg = document.getElementById('diorama-ralsei-img');
    const dioramaDialogue = document.getElementById('diorama-dialogue');

    if (sidebarImg) sidebarImg.src = pose.src;
    if (sidebarBadge) sidebarBadge.textContent = pose.badge;
    if (sidebarSpeech) sidebarSpeech.textContent = pose.line;
    if (dioramaImg) dioramaImg.src = pose.src;
    if (dioramaDialogue && persist) dioramaDialogue.textContent = pose.line;

    document.body.dataset.ralseiPose = pose.id;
  }

  function cycleRalseiPose() {
    const currentId = document.body.dataset.ralseiPose || 'ch2';
    const idx = RALSEI_POSES.findIndex((p) => p.id === currentId);
    const next = RALSEI_POSES[(idx + 1) % RALSEI_POSES.length];
    applyRalseiPose(next.id, true);
  }

  // Initialize theme UI label & Ralsei pose
  const initialTheme = getTheme();
  applyTheme(initialTheme, false);

  let initialPose = initialTheme === 'dark' ? 'ch1' : 'ch2';
  try {
    const savedPose = sessionStorage.getItem(STORAGE_RALSEI);
    if (savedPose && RALSEI_POSES.some((p) => p.id === savedPose)) {
      initialPose = savedPose;
    }
  } catch {}
  applyRalseiPose(initialPose, false);

  themeBtn?.addEventListener('click', () => {
    const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, true);
  });

  // Ralsei click interactions (sidebar + home diorama)
  document.getElementById('ralsei-sidebar-btn')?.addEventListener('click', cycleRalseiPose);
  document.getElementById('diorama-ralsei-btn')?.addEventListener('click', cycleRalseiPose);

  // Save Point interactive easter egg on Home diorama
  const saveBtn = document.getElementById('diorama-savepoint-btn');
  const dioramaDialogue = document.getElementById('diorama-dialogue');
  let saveIdx = 0;

  saveBtn?.addEventListener('click', () => {
    if (dioramaDialogue) {
      dioramaDialogue.textContent = SAVE_LINES[saveIdx % SAVE_LINES.length];
      saveIdx += 1;
    }
    saveBtn.classList.add('is-saved');
    window.setTimeout(() => saveBtn.classList.remove('is-saved'), 950);
  });

  // Mobile sidebar drawer
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
