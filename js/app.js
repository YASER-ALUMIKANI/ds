/**
 * Diamond Screen (شركة الشاشة الماسية)
 * Modern B2B Web Application Engine & Interactive Quote Wizard
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentLang = localStorage.getItem('diamond_screen_lang') || 'ar';

  // DOM References
  const langToggleBtn = document.getElementById('langToggleBtn');
  const mobileNavToggle = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');
  const header = document.getElementById('mainHeader');
  const backToTopBtn = document.getElementById('backToTopBtn');
  const toastBox = document.getElementById('toastBox');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');

  // Modal Elements
  const quoteModal = document.getElementById('quoteModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalSelectedProduct = document.getElementById('modalSelectedProduct');
  const rfqForms = document.querySelectorAll('.rfq-form-element');
  let lastModalTrigger = null;
  let toastTimer = null;

  // Wizard State & Elements
  let currentWizardStep = 1;
  const wizardForm = document.getElementById('quoteWizardForm');
  const wizardPanes = document.querySelectorAll('.wizard-pane');
  const wizardBadges = document.querySelectorAll('.wizard-step-badge');
  const wizardNextBtn = document.getElementById('wizardNextBtn');
  const wizardPrevBtn = document.getElementById('wizardPrevBtn');
  const wizardSubmitBtn = document.getElementById('wizardSubmitBtn');

  // 1. Language Engine
  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('diamond_screen_lang', lang);
    const dict = translations[lang] || translations.ar;

    // Set Document attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

    // Update Language Toggle Button
    if (langToggleBtn) {
      langToggleBtn.innerHTML = `
        <i class="fas fa-globe"></i>
        <span>${dict.nav_lang_btn}</span>
      `;
    }

    // Translate text nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Translate placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    // Translate aria-label attributes
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (dict[key]) {
        el.setAttribute('aria-label', dict[key]);
      }
    });

    refreshGalleryText();
    renderVisitorCount(currentVisitorTotal);
  }

  // 2. Quote Wizard Navigation (Section 25 in Design Doc)
  function updateWizardUI() {
    wizardPanes.forEach(pane => {
      const step = parseInt(pane.getAttribute('data-step'), 10);
      if (step === currentWizardStep) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    wizardBadges.forEach(badge => {
      const step = parseInt(badge.getAttribute('data-step'), 10);
      badge.classList.remove('active', 'completed');
      if (step === currentWizardStep) {
        badge.classList.add('active');
      } else if (step < currentWizardStep) {
        badge.classList.add('completed');
      }
    });

    if (wizardPrevBtn) {
      wizardPrevBtn.style.visibility = (currentWizardStep === 1) ? 'hidden' : 'visible';
    }

    if (wizardNextBtn && wizardSubmitBtn) {
      if (currentWizardStep === 4) {
        wizardNextBtn.style.display = 'none';
        wizardSubmitBtn.style.display = 'inline-flex';
      } else {
        wizardNextBtn.style.display = 'inline-flex';
        wizardSubmitBtn.style.display = 'none';
      }
    }
  }

  function validateWizardStep(step = currentWizardStep) {
    const pane = document.querySelector(`.wizard-pane[data-step="${step}"]`);
    const invalidControl = pane && [...pane.querySelectorAll('input, textarea, select')]
      .find(control => !control.checkValidity());
    if (!invalidControl) return true;
    currentWizardStep = step;
    updateWizardUI();
    invalidControl.reportValidity();
    return false;
  }

  function validateWizardThrough(targetStep) {
    for (let step = 1; step < targetStep; step++) {
      if (!validateWizardStep(step)) return false;
    }
    return true;
  }

  // Global wizard navigation handlers
  window.dsWizardNext = function() {
    if (currentWizardStep < 4 && validateWizardStep()) {
      currentWizardStep++;
      updateWizardUI();
    }
  };

  window.dsWizardPrev = function() {
    if (currentWizardStep > 1) {
      currentWizardStep--;
      updateWizardUI();
    }
  };

  window.dsWizardGoTo = function(step) {
    const s = parseInt(step, 10);
    if (s >= 1 && s <= 4) {
      if (s > currentWizardStep && !validateWizardThrough(s)) return;
      currentWizardStep = s;
      updateWizardUI();
    }
  };

  // Direct Step Badges Navigation
  wizardBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      const step = parseInt(badge.getAttribute('data-step'), 10);
      window.dsWizardGoTo(step);
    });
  });

  if (wizardNextBtn) {
    wizardNextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.dsWizardNext();
    });
  }

  if (wizardPrevBtn) {
    wizardPrevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.dsWizardPrev();
    });
  }

  // 3. Modal Quote Trigger & Handling
  function openQuoteModal(productName = '', trigger = null) {
    if (!quoteModal) return;
    lastModalTrigger = trigger;
    if (modalSelectedProduct) {
      modalSelectedProduct.value = productName || (currentLang === 'ar' ? 'حل شاشة LED متكامل' : 'Custom LED Solution');
    }
    quoteModal.inert = false;
    quoteModal.setAttribute('aria-hidden', 'false');
    quoteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => quoteModal.querySelector('input:not([type="hidden"]):not([readonly]), textarea')?.focus());
  }

  function closeQuoteModal() {
    if (!quoteModal || !quoteModal.classList.contains('open')) return;
    quoteModal.classList.remove('open');
    quoteModal.setAttribute('aria-hidden', 'true');
    quoteModal.inert = true;
    document.body.style.overflow = '';
    lastModalTrigger?.focus();
    lastModalTrigger = null;
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeQuoteModal);
  if (quoteModal) {
    quoteModal.addEventListener('click', (e) => {
      if (e.target === quoteModal) closeQuoteModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeQuoteModal();
  });

  document.querySelectorAll('.trigger-quote-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productTitle = btn.getAttribute('data-product-title');
      openQuoteModal(productTitle, btn);
    });
  });

  // 4. Toast Notifications
  function showToast(message, type = 'success') {
    if (!toastBox || !toastMsg) return;
    clearTimeout(toastTimer);
    toastMsg.textContent = message;
    toastBox.classList.toggle('error', type === 'error');
    if (toastIcon) {
      toastIcon.className = type === 'error' ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check';
    }
    toastBox.classList.add('show');
    toastTimer = setTimeout(() => {
      toastBox.classList.remove('show');
    }, 4500);
  }

  function quoteApiUrl() {
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return 'http://127.0.0.1:8787/api/quote';
    }
    return document.querySelector('meta[name="quote-api-url"]')?.content || '';
  }

  function quotePayload(form) {
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.language = currentLang;
    payload.sourceUrl = window.location.href;
    if (payload.width !== undefined) payload.width = Number(payload.width);
    if (payload.height !== undefined) payload.height = Number(payload.height);
    return payload;
  }

  rfqForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dict = translations[currentLang] || translations.ar;
      if (form === wizardForm && !validateWizardThrough(5)) return;
      if (!form.reportValidity()) return;

      const submitButton = form.querySelector('button[type="submit"]');
      const submitLabel = submitButton?.querySelector('span');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      form.dataset.submissionId ||= crypto.randomUUID();

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute('aria-busy', 'true');
      }
      if (submitLabel) submitLabel.textContent = dict.form_sending;

      try {
        const response = await fetch(quoteApiUrl(), {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': form.dataset.submissionId
          },
          body: JSON.stringify(quotePayload(form))
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.code || `http_${response.status}`);

        const reference = result.reference ? ` ${dict.form_reference}: ${result.reference}` : '';
        showToast(`${dict.wiz_success_msg}${reference}`);
        form.reset();
        delete form.dataset.submissionId;
        if (form === wizardForm) {
          currentWizardStep = 1;
          updateWizardUI();
        } else {
          closeQuoteModal();
        }
      } catch (error) {
        console.error('quote_submission_failed', error.name || 'Error');
        showToast(dict.form_error, 'error');
      } finally {
        clearTimeout(timeout);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute('aria-busy');
        }
        if (submitLabel) {
          const latestDict = translations[currentLang] || translations.ar;
          submitLabel.textContent = latestDict.btn_submit_quote;
        }
      }
    });
  });

  // 4b. Project Photo Gallery (lightbox)
  const galleryModal = document.getElementById('galleryModal');
  const galleryTitle = document.getElementById('galleryTitle');
  const galleryImage = document.getElementById('galleryImage');
  const galleryCounter = document.getElementById('galleryCounter');
  const galleryThumbs = document.getElementById('galleryThumbs');
  const galleryCloseBtn = document.getElementById('galleryCloseBtn');
  const galleryPrevBtn = document.getElementById('galleryPrev');
  const galleryNextBtn = document.getElementById('galleryNext');
  const visitorCountNumber = document.getElementById('visitorCountNumber');
  let currentVisitorTotal = 100;
  const gallery = { slug: null, index: 0, trigger: null, titleSource: null };
  let galleryManifest = null;

  function fillTemplate(template, values) {
    return String(template || '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  }

  async function loadGalleryManifest() {
    if (!galleryManifest) {
      const response = await fetch('data/gallery-manifest.json');
      if (!response.ok) throw new Error(`http_${response.status}`);
      galleryManifest = await response.json();
    }
    return galleryManifest;
  }

  function galleryItems() {
    return galleryManifest?.[gallery.slug]?.images || [];
  }

  function galleryPhotoUrl(name, width) {
    return `assets/projects/${gallery.slug}/${name}-${width}.webp`;
  }

  function galleryPhotoAlt(number) {
    const dict = translations[currentLang] || translations.ar;
    return fillTemplate(dict.gallery_photo_alt, { title: gallery.titleSource?.textContent.trim() || '', n: number });
  }

  function showGalleryPhoto(index) {
    const items = galleryItems();
    if (!items.length) return;
    const dict = translations[currentLang] || translations.ar;
    gallery.index = (index + items.length) % items.length;
    const item = items[gallery.index];

    galleryImage.src = galleryPhotoUrl(item.name, 900);
    galleryImage.srcset = `${galleryPhotoUrl(item.name, 900)} 900w, ${galleryPhotoUrl(item.name, 1800)} 1800w`;
    galleryImage.sizes = '(max-width: 900px) 100vw, 900px';
    galleryImage.width = item.width;
    galleryImage.height = item.height;
    galleryImage.alt = galleryPhotoAlt(gallery.index + 1);
    galleryCounter.textContent = fillTemplate(dict.gallery_counter, { n: gallery.index + 1, total: items.length });

    [...galleryThumbs.children].forEach((thumb, thumbIndex) => {
      const active = thumbIndex === gallery.index;
      thumb.classList.toggle('active', active);
      if (active) {
        thumb.setAttribute('aria-current', 'true');
        thumb.scrollIntoView({ block: 'nearest', inline: 'center' });
      } else {
        thumb.removeAttribute('aria-current');
      }
    });
  }

  function buildGalleryThumbs() {
    galleryThumbs.replaceChildren();
    galleryItems().forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-thumb';
      const thumb = document.createElement('img');
      thumb.src = galleryPhotoUrl(item.name, 400);
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      button.append(thumb);
      button.addEventListener('click', () => showGalleryPhoto(index));
      galleryThumbs.append(button);
    });
  }

  function refreshGalleryText() {
    if (!galleryModal || !gallery.slug) return;
    galleryTitle.textContent = gallery.titleSource?.textContent.trim() || '';
    [...galleryThumbs.children].forEach((thumb, index) => {
      thumb.setAttribute('aria-label', galleryPhotoAlt(index + 1));
    });
    showGalleryPhoto(gallery.index);
  }

  async function openGallery(slug, trigger) {
    if (!galleryModal || !/^[a-z0-9-]+$/.test(slug || '')) return;
    const dict = translations[currentLang] || translations.ar;
    try {
      await loadGalleryManifest();
    } catch (error) {
      console.error('gallery_load_failed', error.name || 'Error');
      showToast(dict.gallery_load_error, 'error');
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(galleryManifest, slug)) return;

    gallery.slug = slug;
    gallery.trigger = trigger;
    gallery.titleSource = trigger?.closest('article')?.querySelector('h3') || null;
    buildGalleryThumbs();
    refreshGalleryText();

    galleryModal.inert = false;
    galleryModal.setAttribute('aria-hidden', 'false');
    galleryModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    galleryCloseBtn.focus();
  }

  function closeGallery() {
    if (!galleryModal || !galleryModal.classList.contains('open')) return;
    galleryModal.classList.remove('open');
    galleryModal.setAttribute('aria-hidden', 'true');
    galleryModal.inert = true;
    document.body.style.overflow = '';
    gallery.trigger?.focus();
    gallery.slug = null;
    gallery.trigger = null;
  }

  if (galleryModal) {
    document.querySelectorAll('[data-gallery-open]').forEach(btn => {
      btn.addEventListener('click', () => openGallery(btn.getAttribute('data-gallery-open'), btn));
    });
    galleryCloseBtn.addEventListener('click', closeGallery);
    galleryModal.addEventListener('click', (e) => {
      if (e.target === galleryModal) closeGallery();
    });
    // In RTL the "next" button sits on the left, so the arrow keys are mirrored.
    galleryNextBtn.addEventListener('click', () => showGalleryPhoto(gallery.index + 1));
    galleryPrevBtn.addEventListener('click', () => showGalleryPhoto(gallery.index - 1));

    document.addEventListener('keydown', (e) => {
      if (!galleryModal.classList.contains('open')) return;
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'Escape') closeGallery();
      else if (e.key === 'ArrowRight') showGalleryPhoto(gallery.index + (rtl ? -1 : 1));
      else if (e.key === 'ArrowLeft') showGalleryPhoto(gallery.index + (rtl ? 1 : -1));
    });

    let touchStartX = null;
    galleryImage.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    galleryImage.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const delta = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(delta) < 50) return;
      const rtl = document.documentElement.dir === 'rtl';
      showGalleryPhoto(gallery.index + ((delta < 0) === rtl ? -1 : 1));
    }, { passive: true });
  }

  // 5. Sticky Header & Scroll Navigation
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    if (header) {
      if (scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    if (backToTopBtn) {
      if (scrollY > 350) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }

    // ScrollSpy active link highlight
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(sec => {
      const top = sec.offsetTop - 120;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');
      if (scrollY >= top && scrollY < top + height) {
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 6. Mobile Menu Toggle
  if (mobileNavToggle && navMenu) {
    mobileNavToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }

  // 7. Language Switch Listener
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const nextLang = (currentLang === 'ar') ? 'en' : 'ar';
      applyLanguage(nextLang);
    });
  }

  // 8. Floating WhatsApp Group Toggle
  const whatsappToggle = document.getElementById('whatsappToggle');
  const whatsappGroup = document.getElementById('whatsappGroup');
  if (whatsappToggle && whatsappGroup) {
    whatsappToggle.addEventListener('click', () => {
      whatsappGroup.classList.toggle('open');
    });
  }

  // 9. Footer Social Media Links Toast
  document.querySelectorAll('.social-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const network = link.getAttribute('data-network') || '';
      showToast(currentLang === 'ar' ? `قريباً — سيتم تفعيل حساب ${network} الرسمي` : `Coming Soon — Official ${network} Channel`);
    });
  });

  // 10. Page Views Counter (Starts at 100, 1 hit per visitor per 30 minutes)
  const VISITOR_BASE_COUNT = 100;
  const VISITOR_WINDOW_MS = 30 * 60 * 1000;
  const VISITOR_HIT_KEY = 'diamond_screen_last_visit_ts';
  const VISITOR_CACHE_KEY = 'diamond_screen_cached_views';
  const VISITOR_API_BASE = 'https://abacus.jasoncameron.dev';
  const VISITOR_NAMESPACE = 'diamondscreen.com.sa';
  const VISITOR_KEY = 'pageviews';

  function renderVisitorCount(total) {
    if (!visitorCountNumber) return;
    const safeTotal = Math.max(VISITOR_BASE_COUNT, Number(total) || VISITOR_BASE_COUNT);
    currentVisitorTotal = safeTotal;
    const formatted = safeTotal.toLocaleString('en-US');
    visitorCountNumber.textContent = (currentLang === 'ar') ? `+${formatted}` : `${formatted}+`;
  }

  async function initVisitorCounter() {
    if (!visitorCountNumber) return;
    let cachedTotal = VISITOR_BASE_COUNT;
    let shouldIncrement = true;

    try {
      const savedTotal = Number(localStorage.getItem(VISITOR_CACHE_KEY) || 0);
      if (savedTotal >= VISITOR_BASE_COUNT) cachedTotal = savedTotal;
      const lastHit = Number(localStorage.getItem(VISITOR_HIT_KEY) || 0);
      if (lastHit && (Date.now() - lastHit) < VISITOR_WINDOW_MS) {
        shouldIncrement = false;
      }
    } catch {
      // Storage blocked (private mode); fall back to read-only or single hit
    }

    renderVisitorCount(cachedTotal);

    const endpoint = shouldIncrement ? 'hit' : 'get';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${VISITOR_API_BASE}/${endpoint}/${VISITOR_NAMESPACE}/${VISITOR_KEY}`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`http_${response.status}`);
      const data = await response.json();
      const rawValue = Math.max(0, Number(data?.value) || 0);
      const total = VISITOR_BASE_COUNT + rawValue;
      renderVisitorCount(total);
      try {
        localStorage.setItem(VISITOR_CACHE_KEY, String(total));
        if (shouldIncrement) {
          localStorage.setItem(VISITOR_HIT_KEY, String(Date.now()));
        }
      } catch {
        // Ignore storage write errors
      }
    } catch {
      // Fallback: if API is unreachable, increment local cached count once per 30-min window
      if (shouldIncrement) {
        const fallbackTotal = cachedTotal + 1;
        renderVisitorCount(fallbackTotal);
        try {
          localStorage.setItem(VISITOR_CACHE_KEY, String(fallbackTotal));
          localStorage.setItem(VISITOR_HIT_KEY, String(Date.now()));
        } catch {
          // Ignore storage write errors
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // Initialize
  applyLanguage(currentLang);
  updateWizardUI();
  initVisitorCounter();
});
