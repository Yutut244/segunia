/**
 * SeguIA Showcase - Main Interactive Engine
 * Strictly zero emojis - Pure SVG vector icons & deterministic analytics
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFlowSlider();
  initDeterministicCalculator();
  initFAQ();
  initSmoothScroll();
});

/* ==========================================================================
   Navigation & Header Interactions
   ========================================================================== */
function initNavbar() {
  const header = document.querySelector('.site-header');
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  // Sticky header background transition
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    navMenu.querySelectorAll('.nav-item-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }
}

/* ==========================================================================
   Deterministic Analytics Calculator (Exact SeguIA Algorithm)
   "La IA no hace los cálculos. El motor convencional calcula promedios y tendencias."
   ========================================================================== */
function initDeterministicCalculator() {
  const inputs = [
    document.getElementById('calcScore1'),
    document.getElementById('calcScore2'),
    document.getElementById('calcScore3'),
    document.getElementById('calcScore4'),
    document.getElementById('calcScore5')
  ];

  const presets = {
    juanCamilo: [85, 76, 68, 59, 55],
    progression: [60, 65, 72, 80, 88],
    stable: [75, 78, 74, 76, 75]
  };

  // Preset buttons
  const presetBtns = document.querySelectorAll('.calc-preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const presetKey = btn.dataset.preset;
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (presets[presetKey]) {
        presets[presetKey].forEach((val, idx) => {
          if (inputs[idx]) inputs[idx].value = val;
        });
        runCalculation();
      }
    });
  });

  // Input event listeners
  inputs.forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      runCalculation();
    });
  });

  function runCalculation() {
    const values = inputs.map(i => {
      const val = parseFloat(i.value);
      return isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
    });

    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = values[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      sumYY += y * y;
    }

    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    const avg = sumY / n;

    // Consecutive drops calculation
    let drops = 0;
    for (let i = values.length - 1; i > 0; i--) {
      if (values[i] < values[i - 1]) {
        drops++;
      } else {
        break;
      }
    }

    // Determine Alert Level & Responsible Badge
    let alertLevel = 'regular';
    let alertTitle = 'Seguimiento Regular';
    let alertMsg = 'El estudiante mantiene una trayectoria estable o ascendente. No se requieren medidas correctivas de urgencia.';
    let factors = [];

    if (slope <= -1.5 || (drops >= 3 && (values[0] - values[values.length - 1] >= 10)) || avg < 60) {
      alertLevel = 'priority';
      alertTitle = 'Atención Prioritaria Requerida';
      if (slope <= -1.5) factors.push(`Pendiente crítica de ${slope.toFixed(2)} pts/actividad`);
      if (drops >= 3) factors.push(`${drops} descensos continuos en evaluaciones`);
      if (avg < 60) factors.push(`Promedio (${avg.toFixed(1)}/100) inferior al umbral aprobatorio`);
      alertMsg = `Factores detonantes: ${factors.join(' | ')}. Se sugiere diseñar una intervención pedagógica focalizada.`;
    } else if (slope < -0.5 || drops >= 2) {
      alertLevel = 'recommended';
      alertTitle = 'Revisión Recomendada';
      if (slope < -0.5) factors.push(`Tendencia descendente moderada (${slope.toFixed(2)} pts/actividad)`);
      if (drops >= 2) factors.push(`${drops} actividades recientes a la baja`);
      alertMsg = `Factores detectados: ${factors.join(' | ')}. Se sugiere monitorear el desempeño en las próximas sesiones.`;
    } else {
      factors.push('Rendimiento consistente con la media pedagógica');
    }

    // Update DOM
    const elAvg = document.getElementById('calcResAvg');
    const elSlope = document.getElementById('calcResSlope');
    const elDrops = document.getElementById('calcResDrops');
    const elBanner = document.getElementById('calcAlertBanner');
    const elTitle = document.getElementById('calcAlertTitle');
    const elDesc = document.getElementById('calcAlertDesc');
    const elExplicability = document.getElementById('calcExplicabilityText');

    if (elAvg) elAvg.textContent = `${avg.toFixed(1)} / 100`;
    if (elSlope) elSlope.textContent = `${slope > 0 ? '+' : ''}${slope.toFixed(2)} pts/act`;
    if (elDrops) elDrops.textContent = `${drops} continua(s)`;

    if (elBanner) {
      elBanner.className = `calc-alert-banner ${alertLevel}`;
    }
    if (elTitle) elTitle.textContent = alertTitle;
    if (elDesc) elDesc.textContent = alertMsg;
    if (elExplicability) {
      elExplicability.textContent = `Regresión lineal (m = ${slope.toFixed(2)}, intercepto = ${intercept.toFixed(1)}). El motor estadístico valida determinísticamente los umbrales institucionales sin delegar el cómputo aritmético a modelos generativos de IA.`;
    }
  }

  // Initial calculation on load
  runCalculation();
}

/* ==========================================================================
   FAQ Accordion
   ========================================================================== */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;
    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   Smooth Scrolling for Anchor Navigation
   ========================================================================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElem.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ==========================================================================
   Modern Interactive Pedagogical Flow Carousel
   ========================================================================== */
function initFlowSlider() {
  const timeline = document.getElementById('flowTimeline');
  const prevBtn = document.getElementById('flowPrevBtn');
  const nextBtn = document.getElementById('flowNextBtn');
  const pills = document.querySelectorAll('.flow-pill');
  const dots = document.querySelectorAll('.flow-dot');
  const cards = document.querySelectorAll('.flow-step-card');
  const counter = document.getElementById('flowStepCounter');

  if (!timeline || cards.length === 0) return;

  let currentIndex = 0;
  const total = cards.length;

  function updateActiveState(index) {
    currentIndex = Math.max(0, Math.min(index, total - 1));

    // Update cards active state
    cards.forEach((card, idx) => {
      if (idx === currentIndex) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update pills active state
    pills.forEach((pill, idx) => {
      if (idx === currentIndex) {
        pill.classList.add('active');
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        pill.classList.remove('active');
      }
    });

    // Update dots active state
    dots.forEach((dot, idx) => {
      if (idx === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update counter
    if (counter) {
      counter.textContent = `Fase 0${currentIndex + 1} de 0${total}`;
    }
  }

  function scrollToCard(index) {
    if (cards[index]) {
      const card = cards[index];
      const targetScroll = card.offsetLeft - timeline.offsetLeft;
      timeline.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
      updateActiveState(index);
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : total - 1;
      scrollToCard(newIndex);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const newIndex = currentIndex < total - 1 ? currentIndex + 1 : 0;
      scrollToCard(newIndex);
    });
  }

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const step = parseInt(pill.dataset.step, 10);
      if (!isNaN(step)) {
        scrollToCard(step);
      }
    });
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const step = parseInt(dot.dataset.step, 10);
      if (!isNaN(step)) {
        scrollToCard(step);
      }
    });
  });

  // Mouse Drag to Scroll (Luxury silky feel without browser scrollbars)
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  timeline.addEventListener('mousedown', (e) => {
    isDown = true;
    timeline.classList.add('is-dragging');
    startX = e.pageX - timeline.offsetLeft;
    scrollLeft = timeline.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    timeline.classList.remove('is-dragging');
    detectCurrentCard();
  });

  timeline.addEventListener('mouseleave', () => {
    if (isDown) {
      isDown = false;
      timeline.classList.remove('is-dragging');
      detectCurrentCard();
    }
  });

  timeline.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - timeline.offsetLeft;
    const walk = (x - startX) * 1.5;
    timeline.scrollLeft = scrollLeft - walk;
  });

  // Track closest card on scroll
  let scrollTimeout;
  timeline.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(detectCurrentCard, 80);
  });

  function detectCurrentCard() {
    const scrollCenter = timeline.scrollLeft + timeline.offsetWidth / 3;
    let closestIndex = 0;
    let closestDistance = Infinity;

    cards.forEach((card, idx) => {
      const cardCenter = card.offsetLeft - timeline.offsetLeft;
      const distance = Math.abs(cardCenter - scrollCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = idx;
      }
    });

    updateActiveState(closestIndex);
  }

  // Initialize first state
  updateActiveState(0);
}
