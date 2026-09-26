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

  // Modal Elements
  const quoteModal = document.getElementById('quoteModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalSelectedProduct = document.getElementById('modalSelectedProduct');
  const rfqForms = document.querySelectorAll('.rfq-form-element');

  // Wizard State & Elements
  let currentWizardStep = 1;
  const wizardData = {
    screenType: 'indoor',
    width: 4,
    height: 2.5,
    location: 'facade',
    name: '',
    company: '',
    phone: '',
    email: '',
    notes: ''
  };

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

  // Wizard Option Cards Selection (Step 1 & Step 3)
  document.querySelectorAll('.wizard-option-card').forEach(card => {
    card.addEventListener('click', () => {
      const parentGrid = card.closest('.wizard-options-grid');
      parentGrid.querySelectorAll('.wizard-option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const field = card.getAttribute('data-field');
      const value = card.getAttribute('data-value');
      if (field && value) {
        wizardData[field] = value;
      }
    });
  });

  if (wizardNextBtn) {
    wizardNextBtn.addEventListener('click', () => {
      if (currentWizardStep < 4) {
        currentWizardStep++;
        updateWizardUI();
      }
    });
  }

  if (wizardPrevBtn) {
    wizardPrevBtn.addEventListener('click', () => {
      if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
      }
    });
  }

  const wizardForm = document.getElementById('quoteWizardForm');
  if (wizardForm) {
    wizardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const dict = translations[currentLang] || translations.ar;
      showToast(dict.wiz_success_msg);
      wizardForm.reset();
      currentWizardStep = 1;
      updateWizardUI();
    });
  }

  // 3. Modal Quote Trigger & Handling
  function openQuoteModal(productName = '') {
    if (!quoteModal) return;
    if (modalSelectedProduct) {
      modalSelectedProduct.value = productName || (currentLang === 'ar' ? 'حل شاشة LED متكامل' : 'Custom LED Solution');
    }
    quoteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeQuoteModal() {
    if (!quoteModal) return;
    quoteModal.classList.remove('open');
    document.body.style.overflow = '';
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
      openQuoteModal(productTitle);
    });
  });

  // 4. Toast Notifications
  function showToast(message) {
    if (!toastBox || !toastMsg) return;
    toastMsg.textContent = message;
    toastBox.classList.add('show');
    setTimeout(() => {
      toastBox.classList.remove('show');
    }, 4500);
  }

  rfqForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const dict = translations[currentLang] || translations.ar;
      showToast(dict.wiz_success_msg || dict.form_success_msg);
      form.reset();
      closeQuoteModal();
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

  // Initialize
  applyLanguage(currentLang);
  updateWizardUI();
});
