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

  // Initialize
  applyLanguage(currentLang);
  updateWizardUI();
});
