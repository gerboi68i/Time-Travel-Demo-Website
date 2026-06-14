(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  /* ---------- Utilities ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const fmt = (n, digits = 4) => {
    if (n === 0) return '0';
    const abs = Math.abs(n);
    if (abs < 1e-4 || abs >= 1e6) return n.toExponential(digits);
    return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  };
  const C = 299792458; // m/s
  const G = 9.80665;   // m/s^2

  /* ---------- Mobile nav ---------- */
  const navToggle = $('#nav-toggle');
  const navLinks = $('#nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      navLinks.classList.toggle('active', !expanded);
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('active');
      });
    });
  }

  /* ---------- Scroll progress ---------- */
  const progressBar = $('#scroll-progress');
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ---------- Active nav link ---------- */
  const sections = $$('section[id]');
  const navAnchors = $$('.nav-links a[href^="#"]');
  function setActiveNav() {
    let current = '';
    const scrollPos = window.scrollY + 100;
    for (const sec of sections) {
      if (sec.offsetTop <= scrollPos) current = sec.getAttribute('id');
    }
    navAnchors.forEach(a => {
      a.setAttribute('aria-current', a.getAttribute('href') === '#' + current ? 'page' : 'false');
    });
  }
  window.addEventListener('scroll', setActiveNav, { passive: true });
  setActiveNav();

  /* ---------- Section reveals ---------- */
  if (!prefersReducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
    sections.forEach(sec => observer.observe(sec));
  } else {
    sections.forEach(sec => sec.classList.add('visible'));
  }

  /* ---------- KaTeX rendering ---------- */
  function renderMath() {
    if (typeof katex === 'undefined' || typeof renderMathInElement === 'undefined') return;
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false,
      trust: true,
      strict: false
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderMath);
  } else {
    renderMath();
  }
  // Retry after a delay in case CDN loads slowly
  window.addEventListener('load', renderMath);

  /* ---------- Hero canvas: Minkowski lightcone ---------- */
  const heroCanvas = $('#hero-canvas');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let width, height, dpr;
    let frame = 0;
    let animationId;

    function resizeHero() {
      const rect = heroCanvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      heroCanvas.width = width * dpr;
      heroCanvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawHero() {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width, height) * 0.42;

      // Grid
      ctx.strokeStyle = 'rgba(154, 163, 178, 0.08)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = cx % step; x < width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = cy % step; y < height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = 'rgba(234, 234, 242, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke(); // time axis
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke(); // space axis

      // Draw animated lightcone
      const progress = prefersReducedMotion ? 1 : Math.min(1, frame / 120);
      const coneLen = maxR * progress;

      // Future lightcone (cyan)
      ctx.save();
      ctx.strokeStyle = 'rgba(77, 217, 230, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + coneLen, cy - coneLen);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - coneLen, cy - coneLen);
      ctx.stroke();

      // Glow
      ctx.shadowColor = 'rgba(77, 217, 230, 0.5)';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();

      // Past lightcone (amber)
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 107, 91, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + coneLen, cy + coneLen);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - coneLen, cy + coneLen);
      ctx.stroke();
      ctx.shadowColor = 'rgba(255, 107, 91, 0.5)';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();

      // Animated worldline drawing from bottom to top
      const worldlineProgress = prefersReducedMotion ? 1 : Math.min(1, Math.max(0, (frame - 60) / 120));
      if (worldlineProgress > 0) {
        const wobble = Math.sin(frame * 0.02) * 10;
        ctx.save();
        ctx.strokeStyle = 'rgba(234, 234, 242, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cx + wobble, cy + maxR * worldlineProgress);
        ctx.lineTo(cx + wobble * 0.6, cy - maxR * 0.3 * worldlineProgress);
        ctx.stroke();
        ctx.restore();
      }

      // Labels
      ctx.fillStyle = 'rgba(77, 217, 230, 0.9)';
      ctx.font = '12px "IBM Plex Mono", monospace';
      ctx.fillText('future', cx + 12, cy - maxR + 20);
      ctx.fillStyle = 'rgba(255, 107, 91, 0.9)';
      ctx.fillText('past', cx + 12, cy + maxR - 12);

      frame++;
      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(drawHero);
      }
    }

    resizeHero();
    drawHero();
    window.addEventListener('resize', () => {
      resizeHero();
      if (prefersReducedMotion) drawHero();
    });
  }

  /* ---------- Worldline canvas (block universe) ---------- */
  const worldlineCanvas = $('#worldline-canvas');
  if (worldlineCanvas) {
    const ctx = worldlineCanvas.getContext('2d');
    let width, height, dpr;
    let frame = 0;

    function resizeWorldline() {
      const rect = worldlineCanvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      worldlineCanvas.width = width * dpr;
      worldlineCanvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawWorldline() {
      ctx.clearRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(154, 163, 178, 0.08)';
      ctx.lineWidth = 1;
      const step = 35;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Time axis
      ctx.strokeStyle = 'rgba(234, 234, 242, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.15, 0);
      ctx.lineTo(width * 0.15, height);
      ctx.stroke();

      // A few worldlines
      const lines = [
        { x: 0.25, color: 'rgba(77, 217, 230, 0.8)', label: 'inertial observer' },
        { x: 0.45, color: 'rgba(255, 107, 91, 0.8)', label: 'accelerated worldline' },
        { x: 0.65, color: 'rgba(234, 234, 242, 0.7)', label: 'another observer' }
      ];

      const t = prefersReducedMotion ? 1 : (frame % 300) / 300;
      const drawLen = height * t;

      lines.forEach((line, i) => {
        const baseX = width * line.x;
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.setLineDash(i === 1 ? [4, 4] : []);
        ctx.beginPath();
        for (let y = 0; y <= drawLen; y += 2) {
          const phase = i * 1.2 + y * 0.015;
          const x = baseX + (i === 1 ? Math.sin(phase) * 30 : 0);
          if (y === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Event dot at tip
        if (drawLen > 10) {
          const tipY = drawLen;
          const tipX = baseX + (i === 1 ? Math.sin(i * 1.2 + tipY * 0.015) * 30 : 0);
          ctx.fillStyle = line.color;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(234, 234, 242, 0.6)';
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillText('time →', width * 0.15 + 8, 20);

      frame++;
      if (!prefersReducedMotion) {
        requestAnimationFrame(drawWorldline);
      }
    }

    resizeWorldline();
    drawWorldline();
    window.addEventListener('resize', () => {
      resizeWorldline();
      if (prefersReducedMotion) drawWorldline();
    });
  }

  /* ---------- Velocity calculator ---------- */
  const speedSlider = $('#speed-slider');
  const speedNumber = $('#speed-number');
  const speedKmh = $('#speed-kmh');
  const travelerTime = $('#traveler-time');
  const travelerUnit = $('#traveler-unit');
  const gammaOut = $('#gamma-out');
  const earthTimeOut = $('#earth-time-out');
  const futureGainOut = $('#future-gain-out');

  const unitToSeconds = {
    years: 365.25 * 24 * 3600,
    days: 24 * 3600,
    hours: 3600,
    seconds: 1
  };

  function formatDuration(seconds) {
    if (seconds >= 365.25 * 24 * 3600) return fmt(seconds / (365.25 * 24 * 3600), 4) + ' years';
    if (seconds >= 24 * 3600) return fmt(seconds / (24 * 3600), 4) + ' days';
    if (seconds >= 3600) return fmt(seconds / 3600, 4) + ' hours';
    if (seconds >= 1) return fmt(seconds, 4) + ' seconds';
    if (seconds >= 1e-3) return fmt(seconds * 1e3, 4) + ' milliseconds';
    if (seconds >= 1e-6) return fmt(seconds * 1e6, 4) + ' microseconds';
    return fmt(seconds, 4) + ' seconds';
  }

  function updateVelocityCalc() {
    const v = clamp(parseFloat(speedSlider.value) || 0, 0, 0.9999);
    const tauVal = parseFloat(travelerTime.value) || 0;
    const tauSeconds = tauVal * unitToSeconds[travelerUnit.value];
    const gamma = 1 / Math.sqrt(1 - v * v);
    const earthSeconds = gamma * tauSeconds;
    const gainSeconds = earthSeconds - tauSeconds;

    speedNumber.value = v.toFixed(4);
    speedSlider.value = v;
    speedKmh.textContent = fmt(v * C / 1000, 0);
    gammaOut.textContent = fmt(gamma, 5);
    earthTimeOut.textContent = formatDuration(earthSeconds);
    futureGainOut.textContent = formatDuration(gainSeconds);
  }

  if (speedSlider && speedNumber) {
    speedSlider.addEventListener('input', () => {
      speedNumber.value = speedSlider.value;
      updateVelocityCalc();
    });
    speedNumber.addEventListener('input', () => {
      let v = parseFloat(speedNumber.value) || 0;
      v = clamp(v, 0, 0.9999);
      speedSlider.value = v;
      updateVelocityCalc();
    });
    travelerTime.addEventListener('input', updateVelocityCalc);
    travelerUnit.addEventListener('change', updateVelocityCalc);

    $$('#velocity-calc .preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = parseFloat(btn.dataset.speed);
        speedSlider.value = v;
        speedNumber.value = v;
        updateVelocityCalc();
      });
    });

    updateVelocityCalc();
  }

  /* ---------- Human time-travel benchmark calculator ---------- */
  const hoursInput = $('#hours-input');
  const speedMode = $('#speed-mode');
  const humanGainOut = $('#human-gain-out');

  const speedModes = {
    jet: 900000 / 3600 / C,   // 900 km/h in m/s then /c
    iss: 7660 / C,
    fast: 50000 / C
  };

  function updateHumanCalc() {
    const hours = parseFloat(hoursInput.value) || 0;
    const T = hours * 3600;
    const beta = speedModes[speedMode.value];
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    const gain = T * (gamma - 1);
    humanGainOut.textContent = fmt(gain, 4) + ' s';
  }

  if (hoursInput && speedMode) {
    hoursInput.addEventListener('input', updateHumanCalc);
    speedMode.addEventListener('change', updateHumanCalc);
    $$('#human-calc .preset-human').forEach(btn => {
      btn.addEventListener('click', () => {
        hoursInput.value = btn.dataset.hours;
        updateHumanCalc();
      });
    });
    updateHumanCalc();
  }

  /* ---------- Gravity calculator ---------- */
  const heightInput = $('#height-input');
  const durationInput = $('#duration-input');
  const durationUnit = $('#duration-unit');
  const higherTimeOut = $('#higher-time-out');
  const heightDifferenceOut = $('#height-difference-out');

  function updateGravityCalc() {
    const h = parseFloat(heightInput.value) || 0;
    const tVal = parseFloat(durationInput.value) || 0;
    const tSeconds = tVal * unitToSeconds[durationUnit.value];
    const ratio = (G * h) / (C * C);
    const higherSeconds = tSeconds * (1 + ratio);
    const diffSeconds = higherSeconds - tSeconds;

    higherTimeOut.textContent = formatDuration(higherSeconds);
    heightDifferenceOut.textContent = formatDuration(diffSeconds);
  }

  if (heightInput && durationInput) {
    heightInput.addEventListener('input', updateGravityCalc);
    durationInput.addEventListener('input', updateGravityCalc);
    durationUnit.addEventListener('change', updateGravityCalc);
    updateGravityCalc();
  }

  /* ---------- Lightcone visualization ---------- */
  const lightconeCanvas = $('#lightcone-canvas');
  const boostSlider = $('#boost-slider');
  const boostValue = $('#boost-value');

  if (lightconeCanvas && boostSlider) {
    const ctx = lightconeCanvas.getContext('2d');
    let width, height, dpr;

    function resizeLightcone() {
      const rect = lightconeCanvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      lightconeCanvas.width = width * dpr;
      lightconeCanvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawLightcone() {
      const v = parseFloat(boostSlider.value) || 0;
      if (boostValue) boostValue.textContent = v.toFixed(2);

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const max = Math.min(width, height) * 0.45;

      // Grid
      ctx.strokeStyle = 'rgba(154, 163, 178, 0.08)';
      ctx.lineWidth = 1;
      for (let x = cx % 30; x < width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = cy % 30; y < height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = 'rgba(234, 234, 242, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke();

      // Lightcones
      ctx.strokeStyle = 'rgba(77, 217, 230, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + max, cy - max);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - max, cy - max);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 107, 91, 0.7)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + max, cy + max);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - max, cy + max);
      ctx.stroke();

      // Moving observer's worldline (slope = 1/v)
      if (v > 0.001) {
        ctx.strokeStyle = 'rgba(234, 234, 242, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        const dx = max * 0.9;
        const dt = dx / v;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx, cy - dt);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Lines of simultaneity for moving observer (slope = v)
      if (v > 0.001) {
        ctx.strokeStyle = 'rgba(154, 163, 178, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        const dx = max * 0.9;
        const dt = dx * v;
        // Line through origin
        ctx.beginPath();
        ctx.moveTo(cx - dx, cy - dt);
        ctx.lineTo(cx + dx, cy + dt);
        ctx.stroke();
        // A few parallel lines
        for (let i = -2; i <= 2; i++) {
          if (i === 0) continue;
          const offset = i * 35;
          ctx.beginPath();
          ctx.moveTo(cx - dx, cy - dt + offset);
          ctx.lineTo(cx + dx, cy + dt + offset);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Labels
      ctx.fillStyle = 'rgba(77, 217, 230, 0.9)';
      ctx.font = '12px "IBM Plex Mono", monospace';
      ctx.fillText('future', cx + 8, cy - max + 18);
      ctx.fillStyle = 'rgba(255, 107, 91, 0.9)';
      ctx.fillText('past', cx + 8, cy + max - 8);
      ctx.fillStyle = 'rgba(234, 234, 242, 0.6)';
      if (v > 0.001) ctx.fillText('simultaneity', cx + max * 0.35, cy + max * 0.3);
    }

    resizeLightcone();
    drawLightcone();
    window.addEventListener('resize', () => { resizeLightcone(); drawLightcone(); });
    boostSlider.addEventListener('input', drawLightcone);
  }

  /* ---------- Wormhole time-machine animation ---------- */
  const wormholeStart = $('#wormhole-start');
  const wormholeReset = $('#wormhole-reset');
  const clockA = $('#clock-a');
  const clockB = $('#clock-b');
  const traveler = $('#traveler');

  if (wormholeStart && wormholeReset && clockA && clockB && traveler) {
    let tripRunning = false;
    let tA = 0, tB = 0;
    let startTime = 0;
    const tripDuration = 4000; // ms

    function formatClock(t) {
      return 't = ' + t.toFixed(1);
    }

    function animateWormhole(timestamp) {
      if (!tripRunning) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / tripDuration);

      // Mouth A stays home; time ticks normally
      tA = elapsed / 1000;
      // Mouth B moves at high speed (in animation terms: time dilates by factor of 3)
      tB = (elapsed / 1000) / 3;

      clockA.textContent = formatClock(tA);
      clockB.textContent = formatClock(tB);

      // Animate traveler dot along the throat
      const xOffset = -57 + Math.sin(progress * Math.PI) * 114; // from A to B
      traveler.style.left = 'calc(50% + ' + xOffset + 'px)';
      traveler.classList.add('active');

      // Animate mouth B to suggest motion
      const mouthB = $('.mouth-b');
      if (mouthB) {
        const scale = 1 - 0.15 * Math.sin(progress * Math.PI);
        mouthB.style.transform = 'scale(' + scale + ')';
      }

      if (progress < 1) {
        requestAnimationFrame(animateWormhole);
      } else {
        tripRunning = false;
        traveler.classList.remove('active');
        if (mouthB) mouthB.style.transform = '';
      }
    }

    wormholeStart.addEventListener('click', () => {
      if (tripRunning) return;
      tA = 0; tB = 0; startTime = 0;
      tripRunning = true;
      clockA.textContent = formatClock(0);
      clockB.textContent = formatClock(0);
      requestAnimationFrame(animateWormhole);
    });

    wormholeReset.addEventListener('click', () => {
      tripRunning = false;
      tA = 0; tB = 0; startTime = 0;
      clockA.textContent = formatClock(0);
      clockB.textContent = formatClock(0);
      traveler.classList.remove('active');
      const mouthB = $('.mouth-b');
      if (mouthB) mouthB.style.transform = '';
    });
  }

  /* ---------- Gravity grid visualization ---------- */
  const gravityCanvas = $('#gravity-canvas');
  if (gravityCanvas) {
    const ctx = gravityCanvas.getContext('2d');
    let width, height, dpr;
    let mouse = { x: -1000, y: -1000 };
    let isInside = false;
    let points = [];
    const gridSpacing = 28;

    function resizeGravity() {
      const rect = gravityCanvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      gravityCanvas.width = width * dpr;
      gravityCanvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initPoints();
    }

    function initPoints() {
      points = [];
      for (let x = gridSpacing / 2; x < width; x += gridSpacing) {
        for (let y = gridSpacing / 2; y < height; y += gridSpacing) {
          points.push({ x, y, ox: x, oy: y });
        }
      }
    }

    function drawGravity() {
      ctx.clearRect(0, 0, width, height);

      // Update point positions based on mouse gravity
      points.forEach(p => {
        const dx = mouse.x - p.ox;
        const dy = mouse.y - p.oy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const strength = 1200 / (dist * dist + 200); // soft inverse-square
        const pull = Math.min(0.6, strength);
        p.x = p.ox + dx * pull;
        p.y = p.oy + dy * pull;
      });

      // Draw grid lines
      ctx.strokeStyle = 'rgba(154, 163, 178, 0.12)';
      ctx.lineWidth = 1;

      const cols = Math.ceil(width / gridSpacing);
      const rows = Math.ceil(height / gridSpacing);

      // Horizontal lines: each row j, draw all x values
      for (let j = 0; j < rows; j++) {
        ctx.beginPath();
        for (let i = 0; i < cols; i++) {
          const idx = i * rows + j;
          if (idx >= points.length) continue;
          const p = points[idx];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Vertical lines: each column i, draw all y values
      for (let i = 0; i < cols; i++) {
        ctx.beginPath();
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          if (idx >= points.length) continue;
          const p = points[idx];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Draw mass / time-slow indicator at mouse
      if (isInside) {
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
        gradient.addColorStop(0, 'rgba(255, 107, 91, 0.25)');
        gradient.addColorStop(1, 'rgba(255, 107, 91, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 120, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 107, 91, 0.9)';
        ctx.font = '11px "IBM Plex Mono", monospace';
        ctx.fillText('time slows here', mouse.x + 14, mouse.y - 14);
      }

      if (!prefersReducedMotion) {
        requestAnimationFrame(drawGravity);
      }
    }

    gravityCanvas.addEventListener('mousemove', e => {
      const rect = gravityCanvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      isInside = true;
    });
    gravityCanvas.addEventListener('mouseleave', () => { isInside = false; });
    gravityCanvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const rect = gravityCanvas.getBoundingClientRect();
      const touch = e.touches[0];
      mouse.x = touch.clientX - rect.left;
      mouse.y = touch.clientY - rect.top;
      isInside = true;
    }, { passive: false });
    gravityCanvas.addEventListener('touchend', () => { isInside = false; });

    resizeGravity();
    if (!prefersReducedMotion) {
      drawGravity();
    } else {
      drawGravity();
    }
    window.addEventListener('resize', () => {
      resizeGravity();
      if (prefersReducedMotion) drawGravity();
    });
  }

  /* ---------- Starfield parallax (subtle) ---------- */
  if (!prefersReducedMotion && !isTouch) {
    const starfield = $('.starfield');
    if (starfield) {
      window.addEventListener('scroll', () => {
        const y = window.scrollY * 0.05;
        starfield.style.transform = 'translateY(' + y + 'px)';
      }, { passive: true });
    }
  }

})();
