<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

function goToApp() {
  router.push('/app');
}

// State refs
const isMotionPaused = ref(false);
const paletteOpen = ref(false);
const paletteQuery = ref('');
const promptText = ref('');
const activeFloorFinish = ref('oak');
const activeSwatchLabel = ref('FINISH: NATURAL OAK');
const activeGalleryFilter = ref('all');
const generatingPlan = ref(false);
const planGenerated = ref(false);

const scrollProgressBar = ref(null);
const mainNav = ref(null);
const heroCanvas = ref(null);
const stickyWindow = ref(null);
const stickyChapterIndicator = ref(null);
const canvasStageLabel = ref(null);
const canvasProgressPct = ref(null);
const canvasPlanOverlay = ref(null);

const layerSketch = ref(null);
const layerMeasure = ref(null);
const layerFurnish = ref(null);

const chapterBars = [ref(null), ref(null), ref(null)];
const chapterItems = [ref(null), ref(null), ref(null)];

const axonoLayerSlab = ref(null);
const axonoLayerWalls = ref(null);
const axonoLayerFurniture = ref(null);
const axonoDriftLabel = ref(null);
const dynamicFloorSlab = ref(null);

let ctx = null;
let animationFrameId = null;
let particles = [];
let particleCount = 2500;
let mousePos = { x: -1000, y: -1000 };
let manifestoSpans = [];
let revealObserver = null;

// Swatch pattern map
const swatchPatterns = {
  oak: 'url(#oak-pattern)',
  terrazzo: 'url(#terrazzo-pattern)',
  linen: 'url(#linen-pattern)',
  slate: 'url(#slate-pattern)'
};

function selectSwatch(finish, label) {
  activeFloorFinish.value = finish;
  activeSwatchLabel.value = label;
  if (dynamicFloorSlab.value && swatchPatterns[finish]) {
    dynamicFloorSlab.value.setAttribute('fill', swatchPatterns[finish]);
  }
}

function handleGeneratePlan() {
  if (!promptText.value.trim()) {
    promptText.value = '64m² 2-bedroom corner flat with balcony facing south and integrated kitchen island';
  }
  generatingPlan.value = true;
  setTimeout(() => {
    generatingPlan.value = false;
    planGenerated.value = true;
    const storyEl = document.getElementById('story');
    if (storyEl) {
      storyEl.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      planGenerated.value = false;
    }, 3500);
  }, 1200);
}

function applyChip(text) {
  promptText.value = text;
}

function scrollToChapter(idx) {
  const storyEl = document.getElementById('story');
  if (!storyEl) return;
  const storyTop = storyEl.offsetTop;
  const totalStoryScroll = storyEl.offsetHeight - window.innerHeight;
  const targetScroll = storyTop + (idx * 0.35 * totalStoryScroll);
  window.scrollTo({ top: targetScroll, behavior: 'smooth' });
}

// Particle Generation
function generateFloorPlanTargets(count, width, height) {
  const targets = [];
  const pad = 30;
  const w = width - pad * 2;
  const h = height - pad * 2;

  function addLine(x1, y1, x2, y2, pointCount, layerType) {
    for (let i = 0; i < pointCount; i++) {
      const t = i / Math.max(pointCount - 1, 1);
      targets.push({
        x: pad + (x1 + (x2 - x1) * t) * w,
        y: pad + (y1 + (y2 - y1) * t) * h,
        layer: layerType,
      });
    }
  }

  function addArc(cx, cy, r, startAngle, endAngle, pointCount, layerType) {
    for (let i = 0; i < pointCount; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / Math.max(pointCount - 1, 1));
      targets.push({
        x: pad + (cx + Math.cos(angle) * r) * w,
        y: pad + (cy + Math.sin(angle) * r) * h,
        layer: layerType,
      });
    }
  }

  function addBox(x, y, bw, bh, pointCount, layerType) {
    const perSide = Math.max(Math.floor(pointCount / 4), 1);
    addLine(x, y, x + bw, y, perSide, layerType);
    addLine(x + bw, y, x + bw, y + bh, perSide, layerType);
    addLine(x + bw, y + bh, x, y + bh, perSide, layerType);
    addLine(x, y + bh, x, y, perSide, layerType);
  }

  // Layer 1: Walls
  addLine(0.05, 0.05, 0.95, 0.05, 260, 1);
  addLine(0.95, 0.05, 0.95, 0.95, 260, 1);
  addLine(0.95, 0.95, 0.05, 0.95, 260, 1);
  addLine(0.05, 0.95, 0.05, 0.05, 260, 1);
  addLine(0.50, 0.05, 0.50, 0.95, 200, 1);
  addLine(0.05, 0.55, 0.50, 0.55, 140, 1);

  // Layer 2: Doors
  addArc(0.50, 0.45, 0.08, Math.PI, 1.5 * Math.PI, 80, 2);
  addLine(0.50, 0.45, 0.42, 0.45, 30, 2);
  addArc(0.50, 0.65, 0.07, Math.PI, 0.5 * Math.PI, 70, 2);
  addLine(0.50, 0.65, 0.43, 0.65, 30, 2);
  addArc(0.95, 0.80, 0.09, Math.PI, 1.5 * Math.PI, 90, 2);
  addLine(0.95, 0.80, 0.86, 0.80, 30, 2);

  // Layer 3: Furniture Dots
  addBox(0.12, 0.12, 0.22, 0.26, 120, 3);
  addBox(0.14, 0.14, 0.08, 0.06, 30, 3);
  addBox(0.24, 0.14, 0.08, 0.06, 30, 3);
  addBox(0.60, 0.50, 0.28, 0.14, 100, 3);
  addBox(0.66, 0.68, 0.16, 0.08, 50, 3);
  addBox(0.65, 0.18, 0.18, 0.12, 70, 3);
  addLine(0.67, 0.14, 0.71, 0.14, 15, 3);
  addLine(0.77, 0.14, 0.81, 0.14, 15, 3);
  addLine(0.67, 0.34, 0.71, 0.34, 15, 3);
  addLine(0.77, 0.34, 0.81, 0.34, 15, 3);
  addBox(0.55, 0.80, 0.25, 0.08, 60, 3);

  while (targets.length < count) {
    targets.push({
      x: pad + (0.1 + Math.random() * 0.8) * w,
      y: pad + (0.1 + Math.random() * 0.8) * h,
      layer: 3
    });
  }

  return targets;
}

function initCanvas() {
  if (!heroCanvas.value) return;
  ctx = heroCanvas.value.getContext('2d');
  const rect = heroCanvas.value.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  heroCanvas.value.width = rect.width * dpr;
  heroCanvas.value.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  particleCount = window.innerWidth < 768 ? 900 : 2500;
  const targets = generateFloorPlanTargets(particleCount, rect.width, rect.height);

  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      cloudX: Math.random() * rect.width,
      cloudY: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      targetX: targets[i].x,
      targetY: targets[i].y,
      layer: targets[i].layer,
      radius: Math.random() * 1.4 + 0.8,
      alpha: Math.random() * 0.6 + 0.35,
    });
  }
}

function renderParticles() {
  if (!heroCanvas.value || !ctx) return;
  if (isMotionPaused.value) return;

  const rect = heroCanvas.value.parentElement.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const scrollMax = window.innerHeight * 1.2;
  const scrollProgress = Math.min(Math.max(window.scrollY / scrollMax, 0), 1);

  if (canvasProgressPct.value) {
    canvasProgressPct.value.textContent = `${Math.round(scrollProgress * 100)}%`;
  }
  if (canvasStageLabel.value) {
    if (scrollProgress < 0.3) {
      canvasStageLabel.value.textContent = 'STAGE 01: FLOATING CLOUD';
    } else if (scrollProgress < 0.7) {
      canvasStageLabel.value.textContent = 'STAGE 02: BOUNDARY WALLS & ARCS';
    } else {
      canvasStageLabel.value.textContent = 'STAGE 03: FULLY CALIBRATED PLAN';
    }
  }

  if (canvasPlanOverlay.value) {
    canvasPlanOverlay.value.style.opacity = scrollProgress > 0.85 ? '1' : '0';
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.cloudX += p.vx;
    p.cloudY += p.vy;
    if (p.cloudX < 0) p.cloudX = w;
    if (p.cloudX > w) p.cloudX = 0;
    if (p.cloudY < 0) p.cloudY = h;
    if (p.cloudY > h) p.cloudY = 0;

    let layerWeight = 0;
    if (p.layer === 1) {
      layerWeight = Math.min(Math.max(scrollProgress / 0.5, 0), 1);
    } else if (p.layer === 2) {
      layerWeight = Math.min(Math.max((scrollProgress - 0.35) / 0.4, 0), 1);
    } else {
      layerWeight = Math.min(Math.max((scrollProgress - 0.65) / 0.35, 0), 1);
    }

    const ease = layerWeight * layerWeight * (3 - 2 * layerWeight);
    const destX = p.cloudX * (1 - ease) + p.targetX * ease;
    const destY = p.cloudY * (1 - ease) + p.targetY * ease;

    const dx = destX - mousePos.x;
    const dy = destY - mousePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let mx = 0, my = 0;
    if (dist < 80) {
      const force = (1 - dist / 80) * 20;
      mx = (dx / dist) * force;
      my = (dy / dist) * force;
    }

    p.x = destX + mx;
    p.y = destY + my;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(58, 75, 255, ${p.alpha * (0.6 + ease * 0.4)})`;
    ctx.fill();
  }

  animationFrameId = requestAnimationFrame(renderParticles);
}

function onScroll() {
  const scrollY = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? Math.min(Math.max(scrollY / docHeight, 0), 1) : 0;

  if (scrollProgressBar.value) {
    scrollProgressBar.value.style.width = `${progress * 100}%`;
  }

  if (mainNav.value) {
    if (scrollY > 40) {
      mainNav.value.classList.add('bg-paper/85', 'backdrop-blur-md', 'shadow-sm', 'border-b', 'border-hairline', 'py-3.5');
      mainNav.value.classList.remove('py-6');
    } else {
      mainNav.value.classList.remove('bg-paper/85', 'backdrop-blur-md', 'shadow-sm', 'border-b', 'border-hairline', 'py-3.5');
      mainNav.value.classList.add('py-6');
    }
  }

  // Sticky story section
  const storyEl = document.getElementById('story');
  if (storyEl && stickyWindow.value) {
    const rect = storyEl.getBoundingClientRect();
    const storyTop = window.scrollY + rect.top;
    const totalStoryScroll = storyEl.offsetHeight - window.innerHeight;
    const storyProgress = Math.min(Math.max((scrollY - storyTop) / totalStoryScroll, 0), 1);

    if (!isMotionPaused.value) {
      const tiltX = Math.max((0.3 - storyProgress) / 0.3, 0) * 14;
      const tiltY = Math.max((0.3 - storyProgress) / 0.3, 0) * -10;
      stickyWindow.value.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    } else {
      stickyWindow.value.style.transform = 'none';
    }

    let chapterIndex = 0;
    let chapterSubProg = 0;
    if (storyProgress < 0.333) {
      chapterIndex = 0;
      chapterSubProg = storyProgress / 0.333;
    } else if (storyProgress < 0.666) {
      chapterIndex = 1;
      chapterSubProg = (storyProgress - 0.333) / 0.333;
    } else {
      chapterIndex = 2;
      chapterSubProg = (storyProgress - 0.666) / 0.334;
    }

    if (stickyChapterIndicator.value) {
      stickyChapterIndicator.value.textContent = `CHAPTER 0${chapterIndex + 1}`;
    }

    if (layerSketch.value && layerMeasure.value && layerFurnish.value) {
      layerSketch.value.style.opacity = chapterIndex === 0 ? '1' : '0';
      layerMeasure.value.style.opacity = chapterIndex === 1 ? '1' : '0';
      layerFurnish.value.style.opacity = chapterIndex === 2 ? '1' : '0';
    }

    for (let i = 0; i < 3; i++) {
      const bar = chapterBars[i].value;
      const item = chapterItems[i].value;
      if (!bar || !item) continue;
      if (i < chapterIndex) {
        bar.style.width = '100%';
        item.style.opacity = '1';
      } else if (i === chapterIndex) {
        bar.style.width = `${chapterSubProg * 100}%`;
        item.style.opacity = '1';
      } else {
        bar.style.width = '0%';
        item.style.opacity = '0.4';
      }
    }
  }

  // Manifesto word opacity
  if (manifestoSpans.length > 0 && !isMotionPaused.value) {
    const viewportCenter = window.innerHeight / 2;
    manifestoSpans.forEach(span => {
      const r = span.getBoundingClientRect();
      const wordCenter = r.top + r.height / 2;
      const dist = Math.abs(wordCenter - viewportCenter);
      const factor = Math.min(Math.max(1 - dist / 350, 0), 1);
      span.style.opacity = (0.15 + factor * 0.85).toFixed(2);
    });
  }

  // Axonometric sine drift
  const axonoEl = document.getElementById('layers');
  if (axonoEl && axonoLayerSlab.value && axonoLayerFurniture.value && !isMotionPaused.value) {
    const r = axonoEl.getBoundingClientRect();
    const inViewFactor = (window.innerHeight - r.top) / (window.innerHeight + r.height);
    const clamped = Math.min(Math.max(inViewFactor, 0), 1);
    const sineVal = Math.sin(clamped * Math.PI);
    const maxDrift = 55;
    axonoLayerSlab.value.style.transform = `translateY(${(sineVal * maxDrift * 0.6).toFixed(1)}px)`;
    axonoLayerFurniture.value.style.transform = `translateY(${(-sineVal * maxDrift).toFixed(1)}px)`;
    if (axonoDriftLabel.value) {
      axonoDriftLabel.value.textContent = `${sineVal.toFixed(2)}x SINE AMPLITUDE (${Math.round(sineVal * maxDrift)}px)`;
    }
  }
}

function toggleMotion() {
  isMotionPaused.value = !isMotionPaused.value;
  if (isMotionPaused.value) {
    document.body.classList.add('motion-paused');
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } else {
    document.body.classList.remove('motion-paused');
    animationFrameId = requestAnimationFrame(renderParticles);
  }
}

function handleKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    paletteOpen.value = !paletteOpen.value;
  } else if (e.key === 'Escape' && paletteOpen.value) {
    paletteOpen.value = false;
  }
}

onMounted(() => {
  initCanvas();
  animationFrameId = requestAnimationFrame(renderParticles);

  // Setup Manifesto
  const manifestoTextEl = document.getElementById('manifesto-text');
  if (manifestoTextEl) {
    const text = 'Every room already knows its best layout. We just help it say so.';
    manifestoTextEl.innerHTML = '';
    text.split(' ').forEach(word => {
      const span = document.createElement('span');
      span.textContent = word + ' ';
      span.className = 'inline-block transition-opacity duration-150 opacity-15';
      if (word.includes('knows') || word.includes('best') || word.includes('layout')) {
        span.classList.add('font-serif', 'italic', 'text-cobalt');
      }
      manifestoTextEl.appendChild(span);
    });
    manifestoSpans = manifestoTextEl.querySelectorAll('span');
  }

  // Reveal observer
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', initCanvas);
  window.addEventListener('keydown', handleKeydown);

  if (heroCanvas.value) {
    heroCanvas.value.addEventListener('mousemove', (e) => {
      const r = heroCanvas.value.getBoundingClientRect();
      mousePos.x = e.clientX - r.left;
      mousePos.y = e.clientY - r.top;
    });
    heroCanvas.value.addEventListener('mouseleave', () => {
      mousePos.x = -1000;
      mousePos.y = -1000;
    });
  }

  onScroll();
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', initCanvas);
  window.removeEventListener('keydown', handleKeydown);
  if (revealObserver) revealObserver.disconnect();
});
</script>

<template>
  <div class="tessel-page bg-paper text-ink min-h-screen relative font-sans selection:bg-cobalt selection:text-white">
    <!-- Top 2px Cobalt Progress Bar -->
    <div ref="scrollProgressBar" class="fixed top-0 left-0 h-[2px] bg-cobalt z-50 w-0 transition-all duration-75"></div>

    <!-- Soft Radial Cobalt Glow near Top Right -->
    <div class="hero-glow pointer-events-none"></div>

    <!-- Navigation Bar -->
    <nav ref="mainNav" class="fixed top-0 left-0 w-full z-40 transition-all duration-300 py-6 px-6 sm:px-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <a href="#hero" class="flex items-center gap-3 group">
          <div class="w-6 h-6 border-2 border-ink flex items-center justify-center p-0.5 group-hover:border-cobalt transition-colors">
            <div class="w-full h-full bg-cobalt"></div>
          </div>
          <span class="font-sans font-bold tracking-widest text-xs uppercase text-ink">
            TESSEL <span class="text-muted font-normal">/ 01 ARCHITECTURE</span>
          </span>
        </a>

        <div class="hidden md:flex items-center gap-8 text-xs font-medium uppercase tracking-wider text-muted">
          <a href="#story" class="hover:text-ink transition-colors">The Process</a>
          <a href="#manifesto" class="hover:text-ink transition-colors">Manifesto</a>
          <a href="#gallery" class="hover:text-ink transition-colors">Floor Plans</a>
          <a href="#layers" class="hover:text-ink transition-colors">Axonometric</a>
          <a href="#pricing" class="hover:text-ink transition-colors">Pricing</a>
        </div>

        <div class="flex items-center gap-3">
          <button @click="paletteOpen = true" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline bg-panel/70 text-xs text-muted hover:text-ink hover:border-ink transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <span>Quick actions</span>
            <kbd class="px-1.5 py-0.5 text-[10px] bg-paper rounded font-mono border border-hairline">⌘K</kbd>
          </button>

          <button @click="goToApp" class="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-ink text-paper rounded-full hover:bg-cobalt transition-colors duration-200">
            Launch Notes App →
          </button>
        </div>
      </div>
    </nav>

    <!-- ==================== HERO SECTION ==================== -->
    <section id="hero" class="relative min-h-screen pt-32 pb-24 px-6 sm:px-10 bg-blueprint-grid overflow-hidden border-b border-hairline flex flex-col justify-between">
      <div class="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <!-- Left Column: Fluid Headline & Prompt Card -->
        <div class="lg:col-span-7 flex flex-col pt-4">
          <div class="inline-flex items-center gap-2 mb-6" data-reveal>
            <span class="w-2 h-2 rounded-full bg-cobalt animate-pulse"></span>
            <span class="text-xs uppercase tracking-widest font-mono text-muted">v2.4 Spatial Geometry Engine</span>
          </div>

          <h1 class="fluid-title text-ink font-sans font-medium mb-8" data-reveal>
            Rooms that <br class="hidden sm:inline">
            <span class="font-serif italic font-normal text-cobalt selection:text-white">draw themselves.</span>
          </h1>

          <p class="text-base sm:text-lg text-muted max-w-xl mb-10 leading-relaxed" data-reveal>
            Hand-drawn sketches, napkin diagrams, and iPhone scans converted into millimeter-calibrated CAD plans, wall schedules, and living layouts in under three seconds.
          </p>

          <!-- Prompt Card -->
          <div class="p-5 sm:p-6 rounded-2xl bg-panel border border-hairline shadow-sm max-w-xl" data-reveal>
            <div class="flex items-center justify-between mb-3 text-xs">
              <span class="font-mono text-muted uppercase tracking-wider">Plan Prompt / Sketch Ingestion</span>
              <span class="flex items-center gap-1.5 text-cobalt font-medium">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-cobalt"></span>
                Ready
              </span>
            </div>

            <textarea v-model="promptText" rows="3" class="w-full bg-paper border border-hairline rounded-xl p-3.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-cobalt focus:ring-1 focus:ring-cobalt transition-all resize-none font-sans" placeholder="Describe or upload your room... (e.g. 72m² two-bedroom flat, morning sun in master suite, wide corridor, open kitchen with monolithic island)"></textarea>

            <div class="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div class="flex items-center gap-2 overflow-x-auto py-1">
                <button @click="applyChip('64m² 2-bedroom corner flat, double bedroom with ensuite, galley kitchen, balcony facing south')" class="text-[11px] px-2.5 py-1 rounded-md bg-paper border border-hairline text-muted hover:text-ink hover:border-cobalt transition-colors">2-Bed Flat</button>
                <button @click="applyChip('38m² open daylight studio, hidden fold-away bed, concrete ceiling, linear kitchenette')" class="text-[11px] px-2.5 py-1 rounded-md bg-paper border border-hairline text-muted hover:text-ink hover:border-cobalt transition-colors">Studio Loft</button>
                <button @click="applyChip('88m² neighbourhood artisan bakery, proofing bench, display counter, 18-seat banquette')" class="text-[11px] px-2.5 py-1 rounded-md bg-paper border border-hairline text-muted hover:text-ink hover:border-cobalt transition-colors">Bakery Plan</button>
              </div>

              <button @click="handleGeneratePlan" :disabled="generatingPlan" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cobalt text-white text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:shadow-lg transition-all duration-200" :class="{ 'opacity-75 cursor-wait': generatingPlan, 'bg-emerald-600': planGenerated }">
                <span>{{ generatingPlan ? 'Calculating...' : (planGenerated ? 'Plan generated!' : 'Generate plan') }}</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </div>

          <!-- Metric Badges -->
          <div class="grid grid-cols-3 gap-6 max-w-lg mt-10 pt-8 border-t border-hairline" data-reveal>
            <div>
              <div class="font-mono text-xl sm:text-2xl font-semibold text-ink">±1.5mm</div>
              <div class="text-xs text-muted uppercase tracking-wider mt-1">Survey accuracy</div>
            </div>
            <div>
              <div class="font-mono text-xl sm:text-2xl font-semibold text-ink">2.4s</div>
              <div class="text-xs text-muted uppercase tracking-wider mt-1">Generation cycle</div>
            </div>
            <div>
              <div class="font-mono text-xl sm:text-2xl font-semibold text-ink">48,000+</div>
              <div class="text-xs text-muted uppercase tracking-wider mt-1">Plans generated</div>
            </div>
          </div>
        </div>

        <!-- Right Column: Interactive 2,500 Particle Canvas -->
        <div class="lg:col-span-5 relative w-full flex flex-col items-center justify-center min-h-[460px] lg:min-h-[580px]">
          <div class="relative w-full aspect-[4/5] sm:aspect-square max-w-[520px] rounded-2xl bg-panel/60 border border-hairline p-4 shadow-sm backdrop-blur-sm overflow-hidden flex flex-col">
            <div class="flex items-center justify-between pb-3 border-b border-hairline text-[11px] font-mono text-muted">
              <span class="flex items-center gap-1.5 text-ink font-medium">
                <span class="w-1.5 h-1.5 bg-cobalt rounded-full"></span>
                CANVAS_SIM // 2,500 PARTICLES
              </span>
              <span ref="canvasStageLabel" class="text-cobalt">STAGE: SCATTERED CLOUD</span>
            </div>

            <div class="relative flex-1 w-full h-full overflow-hidden mt-2">
              <canvas ref="heroCanvas" class="w-full h-full block cursor-crosshair"></canvas>
              
              <div ref="canvasPlanOverlay" class="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-700 flex flex-col justify-between p-4 font-mono text-[10px] text-cobalt/80">
                <div class="flex justify-between">
                  <span>BEDROOM 01 // 14.8 m²</span>
                  <span>BATH // 5.2 m²</span>
                </div>
                <div class="flex justify-between items-end">
                  <span>LIVING & DINING // 32.4 m²</span>
                  <span class="bg-cobalt/10 px-2 py-0.5 rounded text-cobalt font-semibold">WALLS CONVERGED</span>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-muted">
              <span>SCROLL DOWN TO SETTLE (0–120VH)</span>
              <span ref="canvasProgressPct" class="text-ink font-semibold">0%</span>
            </div>
          </div>
        </div>

      </div>

      <div class="max-w-7xl mx-auto w-full flex items-center justify-between pt-8 text-xs font-mono text-muted uppercase tracking-widest">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 bg-muted rounded-full"></span>
          <span>TESSEL ARCHITECTURAL COMPUTING</span>
        </div>
        <div class="flex items-center gap-1 text-ink animate-bounce">
          <span>Scroll to reconstruct</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
        </div>
      </div>
    </section>

    <!-- ==================== STICKY STORY SECTION (300VH) ==================== -->
    <section id="story" class="relative h-[300vh] bg-paper border-b border-hairline">
      <div class="sticky top-0 h-screen w-full flex flex-col justify-between py-12 px-6 sm:px-10 overflow-hidden">
        
        <div class="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-hairline pb-4 z-20">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 text-xs font-mono uppercase bg-cobalt text-white rounded">STORY MODE</span>
            <span class="text-xs font-mono text-muted uppercase tracking-widest hidden sm:inline">FROM HAND NAPKIN TO CAD MODEL</span>
          </div>
          <div class="text-right font-mono text-xs text-muted">
            <span ref="stickyChapterIndicator" class="text-cobalt font-bold">CHAPTER 01</span> / 03
          </div>
        </div>

        <div class="max-w-5xl mx-auto w-full flex-1 flex items-center justify-center my-4 perspective-container z-10">
          <div ref="stickyWindow" class="window-tilt w-full max-w-4xl bg-panel rounded-2xl border border-hairline shadow-2xl overflow-hidden flex flex-col transition-all">
            
            <div class="px-5 py-3.5 bg-[#E1DBD0] border-b border-hairline flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-[#E56B6F]/70"></div>
                <div class="w-3 h-3 rounded-full bg-[#E9C46A]/70"></div>
                <div class="w-3 h-3 rounded-full bg-[#2A9D8F]/70"></div>
                <span class="ml-3 font-mono text-xs text-muted font-medium">tessel-workspace // apartment_104_v3.plan</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] font-mono">
                <span class="px-2 py-0.5 bg-paper rounded border border-hairline text-ink">Scale 1:50</span>
                <span class="px-2 py-0.5 bg-cobalt text-white rounded font-medium">LIVE PREVIEW</span>
              </div>
            </div>

            <div class="relative w-full aspect-[16/9] min-h-[320px] sm:min-h-[420px] bg-paper p-6 overflow-hidden flex flex-col justify-between">
              
              <!-- Layer 1: Sketch -->
              <div ref="layerSketch" class="absolute inset-0 p-8 flex flex-col justify-between transition-opacity duration-500 opacity-100">
                <div class="flex justify-between items-start">
                  <div class="bg-panel/80 px-3 py-1.5 rounded-lg border border-hairline font-mono text-xs text-muted">
                    STAGE 01: ROUGH INGESTION
                  </div>
                  <div class="text-right font-mono text-[11px] text-muted">
                    Confidence: 94.2%<br>Recognized: 4 enclosures
                  </div>
                </div>

                <div class="flex-1 flex items-center justify-center my-2">
                  <svg viewBox="0 0 700 380" class="w-full max-w-2xl h-auto" stroke="currentColor" fill="none">
                    <path d="M 60 50 Q 300 45 640 54 Q 645 200 638 330 Q 350 338 55 325 Q 52 180 60 50" stroke="#1B1D22" stroke-width="3" stroke-dasharray="8 3" opacity="0.8"/>
                    <path d="M 360 52 Q 365 190 358 330" stroke="#1B1D22" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.75"/>
                    <path d="M 60 210 Q 210 205 360 212" stroke="#1B1D22" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.75"/>
                    <text x="180" y="130" font-family="'Instrument Serif', serif" font-style="italic" font-size="28" fill="#77746C" text-anchor="middle">bedroom?</text>
                    <text x="180" y="270" font-family="'Instrument Serif', serif" font-style="italic" font-size="28" fill="#77746C" text-anchor="middle">bath + closet</text>
                    <text x="500" y="190" font-family="'Instrument Serif', serif" font-style="italic" font-size="36" fill="#77746C" text-anchor="middle">living & open kitchen</text>
                  </svg>
                </div>

                <div class="font-mono text-xs text-muted">
                  Input: Raw image scan (512x512) · Automatic corner snapping in progress
                </div>
              </div>

              <!-- Layer 2: Measure -->
              <div ref="layerMeasure" class="absolute inset-0 p-8 flex flex-col justify-between transition-opacity duration-500 opacity-0 pointer-events-none bg-blueprint-subgrid">
                <div class="flex justify-between items-start">
                  <div class="bg-cobalt/10 px-3 py-1.5 rounded-lg border border-cobalt/30 font-mono text-xs text-cobalt font-semibold">
                    STAGE 02: LASER MEASUREMENT & AXES
                  </div>
                  <div class="text-right font-mono text-[11px] text-cobalt">
                    Total Area: 64.80 m²<br>Orthogonal Snap: 90.0°
                  </div>
                </div>

                <div class="flex-1 flex items-center justify-center my-2">
                  <svg viewBox="0 0 700 380" class="w-full max-w-2xl h-auto" stroke="currentColor" fill="none">
                    <rect x="70" y="60" width="560" height="260" stroke="#1B1D22" stroke-width="6" fill="rgba(233,228,216,0.3)"/>
                    <line x1="340" y1="60" x2="340" y2="320" stroke="#1B1D22" stroke-width="5"/>
                    <line x1="70" y1="200" x2="340" y2="200" stroke="#1B1D22" stroke-width="5"/>

                    <line x1="70" y1="36" x2="630" y2="36" stroke="#3A4BFF" stroke-width="1.5"/>
                    <line x1="70" y1="28" x2="70" y2="44" stroke="#3A4BFF" stroke-width="1.5"/>
                    <line x1="630" y1="28" x2="630" y2="44" stroke="#3A4BFF" stroke-width="1.5"/>
                    <text x="350" y="30" font-family="'DM Sans', sans-serif" font-size="12" font-weight="700" fill="#3A4BFF" text-anchor="middle">8.40 m</text>

                    <line x1="40" y1="60" x2="40" y2="320" stroke="#3A4BFF" stroke-width="1.5"/>
                    <line x1="32" y1="60" x2="48" y2="60" stroke="#3A4BFF" stroke-width="1.5"/>
                    <line x1="32" y1="320" x2="48" y2="320" stroke="#3A4BFF" stroke-width="1.5"/>
                    <text x="25" y="195" font-family="'DM Sans', sans-serif" font-size="12" font-weight="700" fill="#3A4BFF" text-anchor="middle" transform="rotate(-90 25 195)">5.20 m</text>

                    <path d="M 630 260 A 45 45 0 0 0 585 305" stroke="#3A4BFF" stroke-width="1.5" stroke-dasharray="3 3"/>
                    <line x1="630" y1="260" x2="585" y2="260" stroke="#1B1D22" stroke-width="2"/>

                    <path d="M 340 150 A 40 40 0 0 1 300 110" stroke="#3A4BFF" stroke-width="1.5" stroke-dasharray="3 3"/>
                    <line x1="340" y1="150" x2="300" y2="150" stroke="#1B1D22" stroke-width="2"/>

                    <text x="205" y="130" font-family="'DM Sans', sans-serif" font-size="11" font-weight="600" fill="#1B1D22" text-anchor="middle">BEDROOM</text>
                    <text x="205" y="148" font-family="'DM Sans', sans-serif" font-size="10" fill="#77746C" text-anchor="middle">14.85 m² · 4.05 × 3.65m</text>

                    <text x="205" y="255" font-family="'DM Sans', sans-serif" font-size="11" font-weight="600" fill="#1B1D22" text-anchor="middle">BATHROOM</text>
                    <text x="205" y="272" font-family="'DM Sans', sans-serif" font-size="10" fill="#77746C" text-anchor="middle">6.20 m² · 3.10 × 2.00m</text>

                    <text x="485" y="180" font-family="'DM Sans', sans-serif" font-size="13" font-weight="700" fill="#1B1D22" text-anchor="middle">LIVING & KITCHEN</text>
                    <text x="485" y="202" font-family="'DM Sans', sans-serif" font-size="11" fill="#77746C" text-anchor="middle">43.75 m² · 8.40 × 5.20m</text>
                  </svg>
                </div>

                <div class="font-mono text-xs text-cobalt flex items-center justify-between">
                  <span>Vectorized perimeter: 27.20m</span>
                  <span>Structural columns aligned to Eurocode 2</span>
                </div>
              </div>

              <!-- Layer 3: Furnish -->
              <div ref="layerFurnish" class="absolute inset-0 p-8 flex flex-col justify-between transition-opacity duration-500 opacity-0 pointer-events-none bg-paper">
                <div class="flex justify-between items-start">
                  <div class="bg-ink px-3 py-1.5 rounded-lg font-mono text-xs text-paper font-semibold">
                    STAGE 03: ARCHITECTURAL FURNISHING & SUNLIGHT
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span class="font-mono text-xs text-ink font-medium">Optimal Circulation Clearance (>90cm)</span>
                  </div>
                </div>

                <div class="flex-1 flex items-center justify-center my-2">
                  <svg viewBox="0 0 700 380" class="w-full max-w-2xl h-auto" stroke="currentColor" fill="none">
                    <rect x="70" y="60" width="560" height="260" stroke="#1B1D22" stroke-width="7" fill="#F8F6F0"/>
                    <line x1="340" y1="60" x2="340" y2="320" stroke="#1B1D22" stroke-width="6"/>
                    <line x1="70" y1="200" x2="340" y2="200" stroke="#1B1D22" stroke-width="6"/>

                    <line x1="70" y1="90" x2="70" y2="160" stroke="#3A4BFF" stroke-width="3"/>
                    <line x1="66" y1="90" x2="66" y2="160" stroke="#3A4BFF" stroke-width="1.5"/>
                    <line x1="400" y1="60" x2="580" y2="60" stroke="#3A4BFF" stroke-width="3"/>
                    <line x1="400" y1="56" x2="580" y2="56" stroke="#3A4BFF" stroke-width="1.5"/>

                    <!-- King Bed -->
                    <rect x="120" y="80" width="110" height="90" rx="4" stroke="#1B1D22" stroke-width="2" fill="#E9E4D8"/>
                    <rect x="130" y="86" width="40" height="24" rx="2" stroke="#77746C" stroke-width="1.5" fill="#FAF8F5"/>
                    <rect x="180" y="86" width="40" height="24" rx="2" stroke="#77746C" stroke-width="1.5" fill="#FAF8F5"/>
                    <rect x="94" y="90" width="20" height="24" rx="2" stroke="#77746C" stroke-width="1.5" fill="#E9E4D8"/>
                    <rect x="236" y="90" width="20" height="24" rx="2" stroke="#77746C" stroke-width="1.5" fill="#E9E4D8"/>

                    <!-- Bathroom -->
                    <rect x="76" y="206" width="56" height="56" stroke="#1B1D22" stroke-width="1.5" fill="#E0DCD1"/>
                    <circle cx="104" cy="234" r="3" fill="#1B1D22"/>
                    <rect x="160" y="290" width="50" height="24" rx="3" stroke="#1B1D22" stroke-width="1.5" fill="#FAF8F5"/>
                    <ellipse cx="185" cy="302" rx="14" ry="7" stroke="#77746C" stroke-width="1"/>
                    <rect x="270" y="280" width="26" height="34" rx="8" stroke="#1B1D22" stroke-width="1.5" fill="#FAF8F5"/>

                    <!-- Living Sofa -->
                    <path d="M 420 180 L 530 180 L 530 250 L 490 250 L 490 220 L 420 220 Z" stroke="#1B1D22" stroke-width="2" fill="#E9E4D8"/>
                    <rect x="440" y="235" width="40" height="26" rx="3" stroke="#77746C" stroke-width="1.5" fill="#FAF8F5"/>

                    <!-- Monolithic Island -->
                    <rect x="380" y="80" width="130" height="42" rx="3" stroke="#1B1D22" stroke-width="2" fill="#E9E4D8"/>
                    <circle cx="410" cy="136" r="6" stroke="#77746C" stroke-width="1.5"/>
                    <circle cx="445" cy="136" r="6" stroke="#77746C" stroke-width="1.5"/>
                    <circle cx="480" cy="136" r="6" stroke="#77746C" stroke-width="1.5"/>

                    <!-- Dining -->
                    <rect x="540" y="110" width="70" height="40" rx="3" stroke="#1B1D22" stroke-width="2" fill="#FAF8F5"/>
                    <rect x="555" y="98" width="16" height="8" rx="2" stroke="#77746C" stroke-width="1.5"/>
                    <rect x="580" y="98" width="16" height="8" rx="2" stroke="#77746C" stroke-width="1.5"/>
                    <rect x="555" y="154" width="16" height="8" rx="2" stroke="#77746C" stroke-width="1.5"/>
                    <rect x="580" y="154" width="16" height="8" rx="2" stroke="#77746C" stroke-width="1.5"/>
                  </svg>
                </div>

                <div class="font-mono text-xs text-muted flex items-center justify-between">
                  <span>Natural daylighting index: 88%</span>
                  <span class="text-cobalt font-semibold">Ready for IFC / DXF / Revit Export</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="max-w-4xl mx-auto w-full z-20">
          <div class="grid grid-cols-3 gap-4 border-t border-hairline pt-4">
            <div :ref="el => chapterItems[0].value = el" @click="scrollToChapter(0)" class="chapter-step flex flex-col gap-1.5 cursor-pointer opacity-100 transition-opacity">
              <div class="h-1 bg-hairline rounded-full overflow-hidden">
                <div :ref="el => chapterBars[0].value = el" class="h-full bg-cobalt w-0 transition-all duration-150"></div>
              </div>
              <span class="font-mono text-[11px] text-ink font-semibold tracking-wider">01 SKETCH</span>
              <span class="text-xs text-muted hidden sm:inline">Hand drawing ingestion & AI corner inference</span>
            </div>

            <div :ref="el => chapterItems[1].value = el" @click="scrollToChapter(1)" class="chapter-step flex flex-col gap-1.5 cursor-pointer opacity-50 transition-opacity">
              <div class="h-1 bg-hairline rounded-full overflow-hidden">
                <div :ref="el => chapterBars[1].value = el" class="h-full bg-cobalt w-0 transition-all duration-150"></div>
              </div>
              <span class="font-mono text-[11px] text-ink font-semibold tracking-wider">02 MEASURE</span>
              <span class="text-xs text-muted hidden sm:inline">Millimeter calibration, axis alignment & dimensions</span>
            </div>

            <div :ref="el => chapterItems[2].value = el" @click="scrollToChapter(2)" class="chapter-step flex flex-col gap-1.5 cursor-pointer opacity-50 transition-opacity">
              <div class="h-1 bg-hairline rounded-full overflow-hidden">
                <div :ref="el => chapterBars[2].value = el" class="h-full bg-cobalt w-0 transition-all duration-150"></div>
              </div>
              <span class="font-mono text-[11px] text-ink font-semibold tracking-wider">03 FURNISH</span>
              <span class="text-xs text-muted hidden sm:inline">Ergonomic circulation & daylight orientation</span>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ==================== MANIFESTO SECTION ==================== -->
    <section id="manifesto" class="py-32 sm:py-48 px-6 sm:px-10 bg-paper border-b border-hairline relative">
      <div class="max-w-5xl mx-auto text-center flex flex-col items-center">
        <span class="font-mono text-xs uppercase tracking-widest text-muted mb-8" data-reveal>TESSEL MANIFESTO // 02</span>

        <h2 id="manifesto-text" class="fluid-subhead font-sans font-medium max-w-4xl leading-tight">
          Every room already knows its best layout. We just help it say so.
        </h2>

        <div class="mt-12 flex flex-col sm:flex-row items-center gap-6 text-sm text-muted" data-reveal>
          <span class="font-mono text-xs uppercase tracking-wider text-cobalt font-semibold">Calculated from 1.2M Architectural Plans</span>
          <span class="hidden sm:inline text-hairline">|</span>
          <span>Zero hallucinations. Pure parametric topology.</span>
        </div>
      </div>
    </section>

    <!-- ==================== GALLERY SECTION ==================== -->
    <section id="gallery" class="py-24 sm:py-32 px-6 sm:px-10 bg-panel/30 border-b border-hairline">
      <div class="max-w-7xl mx-auto">
        
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16" data-reveal>
          <div>
            <span class="font-mono text-xs uppercase tracking-widest text-muted">PORTFOLIO // REALIZED SPACES</span>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-sans font-medium text-ink mt-2">
              Generated with <span class="font-serif italic text-cobalt">exact precision.</span>
            </h2>
          </div>

          <div class="flex items-center gap-2 overflow-x-auto pb-2">
            <button @click="activeGalleryFilter = 'all'" :class="activeGalleryFilter === 'all' ? 'bg-ink text-paper' : 'bg-panel border border-hairline text-muted hover:text-ink'" class="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all">All Plans</button>
            <button @click="activeGalleryFilter = 'apartments'" :class="activeGalleryFilter === 'apartments' ? 'bg-ink text-paper' : 'bg-panel border border-hairline text-muted hover:text-ink'" class="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all">Apartments</button>
            <button @click="activeGalleryFilter = 'studios'" :class="activeGalleryFilter === 'studios' ? 'bg-ink text-paper' : 'bg-panel border border-hairline text-muted hover:text-ink'" class="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all">Studios</button>
            <button @click="activeGalleryFilter = 'retail'" :class="activeGalleryFilter === 'retail' ? 'bg-ink text-paper' : 'bg-panel border border-hairline text-muted hover:text-ink'" class="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all">Retail</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          
          <!-- Card 1 -->
          <div v-show="activeGalleryFilter === 'all' || activeGalleryFilter === 'apartments'" class="gallery-card group flex flex-col" data-reveal>
            <div class="sheet-stack relative w-full aspect-[4/3] mb-6 cursor-pointer">
              <div class="sheet-back-2 absolute inset-0 rounded-2xl bg-[#E2DCCF] border border-hairline shadow-sm"></div>
              <div class="sheet-back-1 absolute inset-0 rounded-2xl bg-[#EBE5D9] border border-hairline shadow-sm flex items-center justify-center p-4">
                <span class="font-mono text-[10px] text-muted">SHEET 02 // STRUCTURAL SPECIFICATION</span>
              </div>
              <div class="sheet-front absolute inset-0 rounded-2xl bg-paper border border-hairline p-5 shadow-md flex flex-col justify-between overflow-hidden">
                <div class="flex justify-between items-center text-[10px] font-mono text-muted">
                  <span class="font-semibold text-ink">PLAN NO. 081 // 2-BED</span>
                  <span class="text-cobalt">64 m²</span>
                </div>
                <div class="my-auto flex items-center justify-center py-2">
                  <svg viewBox="0 0 320 200" class="w-full h-auto" stroke="currentColor" fill="none">
                    <rect x="20" y="20" width="280" height="160" stroke="#1B1D22" stroke-width="3" fill="#F8F6F0"/>
                    <line x1="160" y1="20" x2="160" y2="180" stroke="#1B1D22" stroke-width="2.5"/>
                    <line x1="20" y1="100" x2="160" y2="100" stroke="#1B1D22" stroke-width="2"/>
                    <rect x="45" y="35" width="60" height="50" rx="2" stroke="#3A4BFF" stroke-width="1.5" fill="#E9E4D8"/>
                    <rect x="190" y="60" width="80" height="40" rx="3" stroke="#1B1D22" stroke-width="1.5" fill="#E9E4D8"/>
                    <rect x="220" y="15" width="60" height="10" stroke="#3A4BFF" stroke-width="1.5" stroke-dasharray="2 2"/>
                  </svg>
                </div>
                <div class="flex justify-between items-center text-[10px] font-mono text-muted">
                  <span>LEIPZIG, GERMANY</span>
                  <span class="font-semibold text-ink">GEN TIME: 2.1s</span>
                </div>
              </div>
            </div>
            <div class="flex items-baseline justify-between">
              <h3 class="text-xl font-medium text-ink group-hover:text-cobalt transition-colors">Linden Flat</h3>
              <span class="font-mono text-xs text-muted">Apartment · 64 m²</span>
            </div>
            <p class="text-sm text-muted mt-1.5 leading-relaxed">Two-bedroom renovation in a historic 1904 Altbau with preserved herringbone parquet and dual daylight cross-ventilation.</p>
          </div>

          <!-- Card 2 -->
          <div v-show="activeGalleryFilter === 'all' || activeGalleryFilter === 'studios'" class="gallery-card group flex flex-col" data-reveal>
            <div class="sheet-stack relative w-full aspect-[4/3] mb-6 cursor-pointer">
              <div class="sheet-back-2 absolute inset-0 rounded-2xl bg-[#E2DCCF] border border-hairline shadow-sm"></div>
              <div class="sheet-back-1 absolute inset-0 rounded-2xl bg-[#EBE5D9] border border-hairline shadow-sm flex items-center justify-center p-4">
                <span class="font-mono text-[10px] text-muted">SHEET 02 // JOINERY & POCKET DETAILS</span>
              </div>
              <div class="sheet-front absolute inset-0 rounded-2xl bg-paper border border-hairline p-5 shadow-md flex flex-col justify-between overflow-hidden">
                <div class="flex justify-between items-center text-[10px] font-mono text-muted">
                  <span class="font-semibold text-ink">PLAN NO. 119 // MICRO-STUDIO</span>
                  <span class="text-cobalt">38 m²</span>
                </div>
                <div class="my-auto flex items-center justify-center py-2">
                  <svg viewBox="0 0 320 200" class="w-full h-auto" stroke="currentColor" fill="none">
                    <rect x="30" y="20" width="260" height="160" stroke="#1B1D22" stroke-width="3" fill="#F8F6F0"/>
                    <line x1="120" y1="20" x2="120" y2="100" stroke="#1B1D22" stroke-width="2"/>
                    <rect x="35" y="25" width="80" height="70" stroke="#1B1D22" stroke-width="1.5" fill="#E0DCD1"/>
                    <rect x="170" y="40" width="90" height="35" rx="3" stroke="#3A4BFF" stroke-width="1.5" fill="#E9E4D8"/>
                    <rect x="220" y="130" width="55" height="30" stroke="#1B1D22" stroke-width="1.5"/>
                  </svg>
                </div>
                <div class="flex justify-between items-center text-[10px] font-mono text-muted">
                  <span>OSLO, NORWAY</span>
                  <span class="font-semibold text-ink">GEN TIME: 1.8s</span>
                </div>
              </div>
            </div>
            <div class="flex items-baseline justify-between">
              <h3 class="text-xl font-medium text-ink group-hover:text-cobalt transition-colors">Harbour Studio</h3>
              <span class="font-mono text-xs text-muted">Studio · 38 m²</span>
            </div>
            <p class="text-sm text-muted mt-1.5 leading-relaxed">Micro-loft optimization featuring an integrated birch plywood service core with hidden storage steps and drop-down dining leaf.</p>
          </div>

          <!-- Card 3 -->
          <div v-show="activeGalleryFilter === 'all' || activeGalleryFilter === 'retail'" class="gallery-card group flex flex-col" data-reveal>
            <div class="sheet-stack relative w-full aspect-[4/3] mb-6 cursor-pointer">
              <div class="sheet-back-2 absolute inset-0 rounded-2xl bg-[#E2DCCF] border border-hairline shadow-sm"></div>
              <div class="sheet-back-1 absolute inset-0 rounded-2xl bg-[#EBE5D9] border border-hairline shadow-sm flex items-center justify-center p-4">
                <span class="font-mono text-[10px] text-muted">SHEET 02 // MEP & EQUIPMENT CLEARANCES</span>
              </div>
              <div class="sheet-front absolute inset-0 rounded-2xl bg-paper border border-hairline p-5 shadow-md flex flex-col justify-between overflow-hidden">
                <div class="flex justify-between items-center text-[10px] font-mono text-muted">
                  <span class="font-semibold text-ink">PLAN NO. 204 // RETAIL</span>
                  <span class="text-cobalt">92 m²</span>
                </div>
                <div class="my-auto flex items-center justify-center py-2">
                  <svg viewBox="0 0 320 200" class="w-full h-auto" stroke="currentColor" fill="none">
                    <path d="M 20 20 L 300 20 L 300 130 L 210 130 L 210 180 L 20 180 Z" stroke="#1B1D22" stroke-width="3" fill="#F8F6F0"/>
                    <rect x="70" y="70" width="160" height="28" rx="2" stroke="#3A4BFF" stroke-width="2" fill="#E9E4D8"/>
                    <rect x="35" y="30" width="90" height="26" stroke="#1B1D22" stroke-width="1.5" fill="#E0DCD1"/>
                    <line x1="285" y1="30" x2="285" y2="115" stroke="#1B1D22" stroke-width="4"/>
                  </svg>
                </div>
                <div class="flex justify-between items-center text-[10px] font-mono text-muted">
                  <span>MILAN, ITALY</span>
                  <span class="font-semibold text-ink">GEN TIME: 2.7s</span>
                </div>
              </div>
            </div>
            <div class="flex items-baseline justify-between">
              <h3 class="text-xl font-medium text-ink group-hover:text-cobalt transition-colors">Corner Bakery</h3>
              <span class="font-mono text-xs text-muted">Commercial · 92 m²</span>
            </div>
            <p class="text-sm text-muted mt-1.5 leading-relaxed">High-turnover hospitality floor plan with optimized back-of-house flow, ADA-compliant corridors, and a monolithic travertine counter.</p>
          </div>

        </div>

      </div>
    </section>

    <!-- ==================== PRODUCT STORY & LIVE MATERIAL SWATCH EDITOR ==================== -->
    <section id="editor-story" class="py-24 sm:py-36 px-6 sm:px-10 bg-paper border-b border-hairline">
      <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        <div class="lg:col-span-5 flex flex-col gap-12 sm:gap-16 pt-4">
          <div>
            <span class="font-mono text-xs uppercase tracking-widest text-muted">WORKFLOW ENGINE // 03</span>
            <h2 class="text-3xl sm:text-4xl font-sans font-medium text-ink mt-2 leading-tight">
              Built for architects who value <span class="font-serif italic text-cobalt">their evenings.</span>
            </h2>
          </div>

          <div class="flex gap-5" data-reveal>
            <div class="w-8 h-8 rounded-full border border-ink flex items-center justify-center font-mono text-xs font-bold text-ink shrink-0 bg-panel">01</div>
            <div>
              <h3 class="text-xl font-medium text-ink">Hand sketch ingestion</h3>
              <p class="text-sm text-muted mt-2 leading-relaxed">Upload a pencil sketch from a site visit, a photo of a whiteboard session, or an iPad drawing. Tessel analyzes line weight and geometry to isolate exterior envelopes and internal partition walls.</p>
            </div>
          </div>

          <div class="flex gap-5" data-reveal>
            <div class="w-8 h-8 rounded-full border border-ink flex items-center justify-center font-mono text-xs font-bold text-ink shrink-0 bg-panel">02</div>
            <div>
              <h3 class="text-xl font-medium text-ink">Algorithmic wall calibration</h3>
              <p class="text-sm text-muted mt-2 leading-relaxed">Mathematical corner snapping resolves loose angles into strict 90° and 45° architectural axes. Dimensions lock into place with sub-millimeter tolerances against local municipal building codes.</p>
            </div>
          </div>

          <div class="flex gap-5" data-reveal>
            <div class="w-8 h-8 rounded-full border border-ink flex items-center justify-center font-mono text-xs font-bold text-ink shrink-0 bg-panel">03</div>
            <div>
              <h3 class="text-xl font-medium text-ink">Material swatches & daylight layout</h3>
              <p class="text-sm text-muted mt-2 leading-relaxed">Every room receives customized furniture configurations tested for human circulation clearances (>900mm). Switch material specifications live with instantaneous SVG floor tinting.</p>
            </div>
          </div>
        </div>

        <div class="lg:col-span-7 sticky top-28 w-full" data-reveal>
          <div class="rounded-2xl bg-panel border border-hairline shadow-xl overflow-hidden flex flex-col">
            
            <div class="px-5 py-3.5 bg-[#E1DBD0] border-b border-hairline flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="font-mono text-xs text-ink font-semibold">TESSEL STUDIO // LIVE CANVAS</span>
                <span class="text-hairline">|</span>
                <span class="font-mono text-xs text-cobalt font-medium">{{ activeSwatchLabel }}</span>
              </div>
              <button @click="goToApp" class="px-2.5 py-1 text-[11px] font-mono bg-paper rounded border border-hairline hover:border-ink transition-colors">Open in NotesBoard</button>
            </div>

            <div class="relative w-full aspect-[4/3] bg-paper p-6 overflow-hidden flex items-center justify-center">
              
              <svg viewBox="0 0 600 400" class="w-full h-auto max-w-lg transition-colors duration-500" stroke="currentColor" fill="none">
                <defs>
                  <pattern id="oak-pattern" width="40" height="12" patternUnits="userSpaceOnUse">
                    <rect width="40" height="12" fill="#E8D8C3"/>
                    <line x1="0" y1="12" x2="40" y2="12" stroke="#D5C1A7" stroke-width="0.8"/>
                    <line x1="40" y1="0" x2="40" y2="12" stroke="#D5C1A7" stroke-width="0.8"/>
                  </pattern>
                  <pattern id="terrazzo-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                    <rect width="24" height="24" fill="#E3DFD5"/>
                    <circle cx="5" cy="6" r="1.5" fill="#77746C"/>
                    <circle cx="18" cy="8" r="1.2" fill="#3A4BFF" opacity="0.6"/>
                    <circle cx="12" cy="18" r="1.8" fill="#1B1D22" opacity="0.7"/>
                    <rect x="2" y="16" width="2" height="2" fill="#C59B76"/>
                  </pattern>
                  <pattern id="linen-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
                    <rect width="16" height="16" fill="#EDE9DF"/>
                    <line x1="0" y1="8" x2="16" y2="8" stroke="#D8D2C2" stroke-width="0.7"/>
                    <line x1="8" y1="0" x2="8" y2="16" stroke="#D8D2C2" stroke-width="0.7"/>
                  </pattern>
                  <pattern id="slate-pattern" width="48" height="32" patternUnits="userSpaceOnUse">
                    <rect width="48" height="32" fill="#333740"/>
                    <line x1="0" y1="32" x2="48" y2="32" stroke="#252830" stroke-width="1"/>
                    <line x1="48" y1="0" x2="48" y2="32" stroke="#252830" stroke-width="1"/>
                  </pattern>
                </defs>

                <rect ref="dynamicFloorSlab" x="60" y="40" width="480" height="320" rx="4" fill="url(#oak-pattern)" stroke="#1B1D22" stroke-width="5" class="transition-all duration-300"/>
                <line x1="280" y1="40" x2="280" y2="360" stroke="#1B1D22" stroke-width="5"/>
                <line x1="60" y1="210" x2="280" y2="210" stroke="#1B1D22" stroke-width="5"/>
                <line x1="60" y1="80" x2="60" y2="160" stroke="#3A4BFF" stroke-width="3"/>
                <line x1="340" y1="40" x2="480" y2="40" stroke="#3A4BFF" stroke-width="3"/>

                <rect x="100" y="70" width="100" height="80" rx="3" stroke="#1B1D22" stroke-width="2" fill="#FAF8F5"/>
                <rect x="110" y="76" width="35" height="20" rx="2" stroke="#77746C" stroke-width="1.2" fill="#FFF"/>
                <rect x="155" y="76" width="35" height="20" rx="2" stroke="#77746C" stroke-width="1.2" fill="#FFF"/>
                <rect x="340" y="160" width="130" height="50" rx="4" stroke="#1B1D22" stroke-width="2" fill="#FAF8F5"/>
                <rect x="375" y="225" width="60" height="30" rx="3" stroke="#77746C" stroke-width="1.5" fill="#E9E4D8"/>
                <circle cx="400" cy="90" r="30" stroke="#1B1D22" stroke-width="2" fill="#FAF8F5"/>
                <circle cx="400" cy="46" r="6" stroke="#77746C" stroke-width="1.5"/>
                <circle cx="400" cy="134" r="6" stroke="#77746C" stroke-width="1.5"/>
                <circle cx="356" cy="90" r="6" stroke="#77746C" stroke-width="1.5"/>
                <circle cx="444" cy="90" r="6" stroke="#77746C" stroke-width="1.5"/>
              </svg>

              <!-- Floating Swatch Bar -->
              <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-ink/90 backdrop-blur-md p-1.5 rounded-full border border-hairline shadow-2xl flex items-center gap-1.5 z-20">
                <button @click="selectSwatch('oak', 'FINISH: NATURAL OAK')" :class="activeFloorFinish === 'oak' ? 'bg-cobalt text-paper' : 'text-paper/70 hover:text-paper'" class="px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#D5C1A7] inline-block border border-white/40"></span>
                  <span>Oak</span>
                </button>
                <button @click="selectSwatch('terrazzo', 'FINISH: VENETIAN TERRAZZO')" :class="activeFloorFinish === 'terrazzo' ? 'bg-cobalt text-paper' : 'text-paper/70 hover:text-paper'" class="px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#E3DFD5] inline-block border border-white/40"></span>
                  <span>Terrazzo</span>
                </button>
                <button @click="selectSwatch('linen', 'FINISH: TEXTURED LINEN')" :class="activeFloorFinish === 'linen' ? 'bg-cobalt text-paper' : 'text-paper/70 hover:text-paper'" class="px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#EDE9DF] inline-block border border-white/40"></span>
                  <span>Linen</span>
                </button>
                <button @click="selectSwatch('slate', 'FINISH: CHARCOAL SLATE')" :class="activeFloorFinish === 'slate' ? 'bg-cobalt text-paper' : 'text-paper/70 hover:text-paper'" class="px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#333740] inline-block border border-white/40"></span>
                  <span>Slate</span>
                </button>
              </div>

            </div>

            <div class="px-5 py-3 border-t border-hairline flex items-center justify-between text-xs font-mono text-muted bg-panel/50">
              <span>Circulation compliance: 100%</span>
              <span class="text-ink font-semibold">Area: 72.4 m²</span>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ==================== EXPLODED-AXONOMETRIC FIGURES ==================== -->
    <section id="layers" class="py-24 sm:py-36 px-6 sm:px-10 bg-blueprint-grid border-b border-hairline overflow-hidden">
      <div class="max-w-7xl mx-auto flex flex-col items-center">
        
        <div class="text-center max-w-2xl mb-16" data-reveal>
          <span class="font-mono text-xs uppercase tracking-widest text-muted">PARAMETRIC DECOMPOSITION // 04</span>
          <h2 class="text-3xl sm:text-5xl font-sans font-medium text-ink mt-2">
            Three layers. <span class="font-serif italic text-cobalt">Zero friction.</span>
          </h2>
          <p class="text-base text-muted mt-4">
            Scroll to inspect the exploded axonometric projection. The foundation slab, structural boundary walls, and interior layout drift apart and re-converge along a continuous mathematical curve.
          </p>
        </div>

        <div class="relative w-full max-w-4xl aspect-[16/10] min-h-[400px] sm:min-h-[500px] flex items-center justify-center">
          <svg viewBox="0 0 800 600" class="w-full h-full" fill="none">
            
            <!-- Layer 1: Slab -->
            <g ref="axonoLayerSlab" class="transition-transform duration-75">
              <polygon points="400,340 680,480 400,620 120,480" fill="#E8E3D7" stroke="#1B1D22" stroke-width="2"/>
              <polygon points="120,480 400,620 400,640 120,500" fill="#CEC7B8" stroke="#1B1D22" stroke-width="1.5"/>
              <polygon points="400,620 680,480 680,500 400,640" fill="#BDB5A4" stroke="#1B1D22" stroke-width="1.5"/>
              <line x1="120" y1="480" x2="60" y2="480" stroke="#77746C" stroke-width="1.5" stroke-dasharray="2 2"/>
              <text x="50" y="484" font-family="'DM Sans', sans-serif" font-size="11" font-weight="700" fill="#1B1D22" text-anchor="end">01 // CONCRETE SLAB + PARQUET SUBSTRATE</text>
            </g>

            <!-- Layer 2: Walls -->
            <g ref="axonoLayerWalls" class="transition-transform duration-75">
              <polygon points="120,380 400,240 400,290 120,430" fill="#E2DDD1" stroke="#1B1D22" stroke-width="2"/>
              <polygon points="400,240 680,380 680,430 400,290" fill="#D5CFC1" stroke="#1B1D22" stroke-width="2"/>
              <line x1="200" y1="470" x2="320" y2="410" stroke="#3A4BFF" stroke-width="3"/>
              <polygon points="400,290 400,340 300,390 300,340" fill="#E9E4D8" stroke="#1B1D22" stroke-width="2"/>
              <line x1="680" y1="380" x2="740" y2="380" stroke="#3A4BFF" stroke-width="1.5" stroke-dasharray="2 2"/>
              <text x="750" y="384" font-family="'DM Sans', sans-serif" font-size="11" font-weight="700" fill="#3A4BFF">02 // 240MM STRUCTURAL CAVITY WALLS</text>
            </g>

            <!-- Layer 3: Furniture -->
            <g ref="axonoLayerFurniture" class="transition-transform duration-75">
              <polygon points="260,280 340,320 280,350 200,310" fill="#F4F1EB" stroke="#1B1D22" stroke-width="2"/>
              <polygon points="200,310 280,350 280,360 200,320" fill="#D5CFC1" stroke="#1B1D22" stroke-width="1.5"/>
              <polygon points="480,300 580,350 540,370 440,320" fill="#F4F1EB" stroke="#1B1D22" stroke-width="2"/>
              <polygon points="420,380 480,410 440,430 380,400" fill="#E9E4D8" stroke="#1B1D22" stroke-width="1.5"/>
              <line x1="200" y1="310" x2="140" y2="310" stroke="#77746C" stroke-width="1.5" stroke-dasharray="2 2"/>
              <text x="130" y="314" font-family="'DM Sans', sans-serif" font-size="11" font-weight="700" fill="#1B1D22" text-anchor="end">03 // FURNITURE & JOINERY SPECIFICATION</text>
            </g>

          </svg>
        </div>

        <div class="mt-8 font-mono text-xs text-muted flex items-center gap-3">
          <span class="w-2 h-2 rounded-full bg-cobalt animate-pulse"></span>
          <span>AXONOMETRIC DISPERSION:</span>
          <span ref="axonoDriftLabel" class="font-semibold text-ink">0.00x SINE AMPLITUDE</span>
        </div>

      </div>
    </section>

    <!-- ==================== PRICING SECTION ==================== -->
    <section id="pricing" class="py-24 sm:py-36 px-6 sm:px-10 bg-paper border-b border-hairline">
      <div class="max-w-7xl mx-auto">
        
        <div class="text-center max-w-2xl mx-auto mb-16" data-reveal>
          <span class="font-mono text-xs uppercase tracking-widest text-muted">TRANSPARENT LICENSING // 05</span>
          <h2 class="text-3xl sm:text-5xl font-sans font-medium text-ink mt-2">
            Priced for independent practices <br class="hidden sm:inline">
            and <span class="font-serif italic text-cobalt">global studios.</span>
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div class="p-8 rounded-2xl bg-panel border border-hairline flex flex-col justify-between" data-reveal>
            <div>
              <div class="font-mono text-xs uppercase tracking-widest text-muted mb-2">STARTER</div>
              <h3 class="text-2xl font-medium text-ink">Solo Designer</h3>
              <p class="text-sm text-muted mt-2">Essential hand-to-CAD translation for freelancers and interior stylists.</p>
              <div class="my-8">
                <span class="font-mono text-4xl sm:text-5xl font-semibold text-ink">$0</span>
                <span class="text-sm text-muted">/ forever</span>
              </div>
              <ul class="flex flex-col gap-3 text-sm text-ink/90 border-t border-hairline pt-6">
                <li class="flex items-center gap-2.5">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Up to 10 plan generations / month</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Export high-resolution PNG & PDF</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Standard residential furniture library</span>
                </li>
              </ul>
            </div>
            <button @click="goToApp" class="mt-8 w-full py-3 rounded-xl border border-hairline bg-paper text-ink font-semibold text-xs uppercase tracking-wider hover:border-ink transition-colors">Start Free</button>
          </div>

          <div class="p-8 rounded-2xl bg-paper border-2 border-cobalt shadow-xl relative flex flex-col justify-between" data-reveal>
            <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-cobalt text-white font-mono text-[10px] uppercase tracking-widest rounded-full font-bold">MOST POPULAR</div>
            <div>
              <div class="font-mono text-xs uppercase tracking-widest text-cobalt mb-2">STUDIO</div>
              <h3 class="text-2xl font-medium text-ink">Boutique Office</h3>
              <p class="text-sm text-muted mt-2">For registered architects and studios delivering client permit packages.</p>
              <div class="my-8">
                <span class="font-mono text-4xl sm:text-5xl font-semibold text-ink">$29</span>
                <span class="text-sm text-muted">/ seat / month</span>
              </div>
              <ul class="flex flex-col gap-3 text-sm text-ink/90 border-t border-hairline pt-6">
                <li class="flex items-center gap-2.5 font-medium">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Unlimited plan generations</span>
                </li>
                <li class="flex items-center gap-2.5 font-medium">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Full DWG, DXF & IFC BIM Export</span>
                </li>
                <li class="flex items-center gap-2.5 font-medium">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Custom material swatches & branding</span>
                </li>
                <li class="flex items-center gap-2.5 font-medium">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Real-time co-authoring & comments</span>
                </li>
              </ul>
            </div>
            <button @click="goToApp" class="mt-8 w-full py-3 rounded-xl bg-cobalt text-white font-semibold text-xs uppercase tracking-wider hover:bg-ink transition-colors shadow-md">Upgrade to Studio</button>
          </div>

          <div class="p-8 rounded-2xl bg-panel border border-hairline flex flex-col justify-between" data-reveal>
            <div>
              <div class="font-mono text-xs uppercase tracking-widest text-muted mb-2">FIRM</div>
              <h3 class="text-2xl font-medium text-ink">Enterprise Practice</h3>
              <p class="text-sm text-muted mt-2">Custom deployment, SSO authentication, and API access for multi-office firms.</p>
              <div class="my-8">
                <span class="font-mono text-4xl sm:text-5xl font-semibold text-ink">$89</span>
                <span class="text-sm text-muted">/ seat / month</span>
              </div>
              <ul class="flex flex-col gap-3 text-sm text-ink/90 border-t border-hairline pt-6">
                <li class="flex items-center gap-2.5">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Everything in Studio tier</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Revit & ArchiCAD live plugins</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Private tenant with on-prem database</span>
                </li>
                <li class="flex items-center gap-2.5">
                  <svg class="w-4 h-4 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Dedicated architectural account partner</span>
                </li>
              </ul>
            </div>
            <button @click="goToApp" class="mt-8 w-full py-3 rounded-xl border border-hairline bg-paper text-ink font-semibold text-xs uppercase tracking-wider hover:border-ink transition-colors">Contact Sales</button>
          </div>

        </div>
      </div>
    </section>

    <!-- ==================== FOOTER ==================== -->
    <footer class="py-16 px-6 sm:px-10 bg-panel border-t border-hairline text-ink">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 border-2 border-ink flex items-center justify-center p-0.5">
              <div class="w-full h-full bg-cobalt"></div>
            </div>
            <span class="font-sans font-bold tracking-widest text-xs uppercase">TESSEL TECHNOLOGIES INC.</span>
          </div>
          <p class="text-xs text-muted max-w-sm mt-1">
            Precision geometric computing engine for the built environment. Zurich · London · Tokyo.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-8 text-xs font-mono text-muted uppercase tracking-wider">
          <a href="#hero" class="hover:text-ink transition-colors">Overview</a>
          <a href="#story" class="hover:text-ink transition-colors">Chapters</a>
          <a href="#gallery" class="hover:text-ink transition-colors">Floor Plans</a>
          <a href="#pricing" class="hover:text-ink transition-colors">Licensing</a>
          <button @click="goToApp" class="hover:text-cobalt text-ink font-semibold transition-colors">Launch Notes App →</button>
        </div>

        <div class="font-mono text-xs text-muted">
          © 2026 TESSEL. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>

    <!-- ==================== GLOBAL CMD+K COMMAND PALETTE ==================== -->
    <div v-if="paletteOpen" class="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4" @click.self="paletteOpen = false">
      <div class="w-full max-w-xl bg-paper rounded-2xl border border-hairline shadow-2xl overflow-hidden flex flex-col">
        <div class="p-4 border-b border-hairline flex items-center gap-3">
          <svg class="w-4 h-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input v-model="paletteQuery" type="text" placeholder="Type a command or jump to section..." class="w-full bg-transparent text-sm text-ink placeholder:text-muted/60 focus:outline-none font-sans" autofocus>
          <kbd class="px-2 py-0.5 text-[10px] bg-panel rounded font-mono border border-hairline text-muted">ESC</kbd>
        </div>

        <div class="p-2 max-h-80 overflow-y-auto flex flex-col gap-1 text-sm font-sans">
          <button @click="paletteOpen = false; promptText = '64m² 2-bedroom flat with central corridor'; document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })" class="flex items-center justify-between p-3 rounded-xl hover:bg-panel text-left transition-colors group">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-md bg-cobalt/10 text-cobalt flex items-center justify-center font-mono text-xs font-bold">+</span>
              <span class="font-medium text-ink group-hover:text-cobalt">New measured room plan</span>
            </div>
            <kbd class="font-mono text-xs text-muted">N</kbd>
          </button>

          <button @click="paletteOpen = false; goToApp()" class="flex items-center justify-between p-3 rounded-xl hover:bg-panel text-left transition-colors group">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-md bg-panel text-muted flex items-center justify-center font-mono text-xs font-bold">📝</span>
              <span class="font-medium text-ink group-hover:text-cobalt">Open NotesBoard Workspace</span>
            </div>
            <kbd class="font-mono text-xs text-muted">W</kbd>
          </button>

          <button @click="paletteOpen = false; scrollToChapter(0)" class="flex items-center justify-between p-3 rounded-xl hover:bg-panel text-left transition-colors group">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-md bg-panel text-muted flex items-center justify-center font-mono text-xs font-bold">↳</span>
              <span class="font-medium text-ink group-hover:text-cobalt">Jump to The 3-Step Process</span>
            </div>
            <kbd class="font-mono text-xs text-muted">1</kbd>
          </button>

          <button @click="paletteOpen = false; document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })" class="flex items-center justify-between p-3 rounded-xl hover:bg-panel text-left transition-colors group">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-md bg-panel text-muted flex items-center justify-center font-mono text-xs font-bold">↳</span>
              <span class="font-medium text-ink group-hover:text-cobalt">View Studio Pricing</span>
            </div>
            <kbd class="font-mono text-xs text-muted">P</kbd>
          </button>
        </div>

        <div class="p-3 bg-panel/60 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-muted">
          <span>USE ARROWS TO NAVIGATE, ENTER TO SELECT</span>
          <span>TESSEL COMMAND // 2026</span>
        </div>
      </div>
    </div>

    <!-- ==================== "PAUSE MOTION" PILL ==================== -->
    <button @click="toggleMotion" class="fixed bottom-6 right-6 z-40 px-3.5 py-2 rounded-full bg-ink/90 text-paper text-xs font-mono uppercase tracking-wider backdrop-blur-md shadow-lg border border-hairline hover:bg-cobalt transition-all duration-200 flex items-center gap-2">
      <span class="w-2 h-2 rounded-full" :class="isMotionPaused ? 'bg-amber-400' : 'bg-emerald-400'"></span>
      <span>{{ isMotionPaused ? 'Resume motion' : 'Pause motion' }}</span>
    </button>
  </div>
</template>

<style scoped>
.tessel-page {
  --paper: #F3EFE6;
  --panel: #E9E4D8;
  --ink: #1B1D22;
  --muted: #77746C;
  --cobalt: #3A4BFF;
  --hairline: rgba(27, 29, 34, 0.12);
  background-color: var(--paper);
}

.fluid-title {
  font-size: clamp(52px, 7.5vw, 112px);
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.fluid-subhead {
  font-size: clamp(28px, 4vw, 56px);
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.bg-blueprint-grid {
  background-image: 
    linear-gradient(to right, rgba(27, 29, 34, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(27, 29, 34, 0.045) 1px, transparent 1px);
  background-size: 36px 36px;
}

.bg-blueprint-subgrid {
  background-image: 
    linear-gradient(to right, rgba(58, 75, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(58, 75, 255, 0.08) 1px, transparent 1px);
  background-size: 18px 18px;
}

.hero-glow {
  position: absolute;
  top: -10%;
  right: -5%;
  width: 75vw;
  height: 75vw;
  max-width: 900px;
  max-height: 900px;
  background: radial-gradient(circle at 65% 35%, rgba(58, 75, 255, 0.16) 0%, rgba(58, 75, 255, 0.04) 45%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

:deep([data-reveal]) {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

:deep([data-reveal].revealed) {
  opacity: 1;
  transform: translateY(0);
}

:global(body.motion-paused) :deep([data-reveal]) {
  opacity: 1 !important;
  transform: none !important;
  transition: none !important;
}

:global(body.motion-paused) canvas {
  filter: grayscale(0.5);
}

.sheet-stack {
  position: relative;
}
.sheet-stack .sheet-back-2 {
  transform: rotate(-3deg) translateY(4px);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-stack .sheet-back-1 {
  transform: rotate(2deg) translateY(2px);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-stack .sheet-front {
  transform: rotate(0deg);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
}
.sheet-stack:hover .sheet-back-2 {
  transform: rotate(-6deg) translateY(8px) translateX(-4px);
}
.sheet-stack:hover .sheet-back-1 {
  transform: rotate(4deg) translateY(5px) translateX(4px);
}
.sheet-stack:hover .sheet-front {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px -8px rgba(27, 29, 34, 0.12);
}

.perspective-container {
  perspective: 1200px;
}
.window-tilt {
  transform-style: preserve-3d;
  will-change: transform;
  transition: transform 0.1s linear;
}
</style>
