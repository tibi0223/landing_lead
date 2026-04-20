const header = document.getElementById('header');
const hero   = document.getElementById('hero');

// Header scroll effect
function updateHeader() {
  if (window.scrollY > (hero ? hero.offsetHeight - 10 : 50)) {
    header.classList.remove('header--transparent');
    header.classList.add('header--scrolled');
  } else {
    header.classList.remove('header--scrolled');
    header.classList.add('header--transparent');
  }
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

// Services carousel dot indicators
const servicesCarousel = document.getElementById('servicesCarousel');
const servicesDots = document.querySelectorAll('.services__dot');
if (servicesCarousel && servicesDots.length) {
  servicesCarousel.addEventListener('scroll', () => {
    const cardWidth = servicesCarousel.querySelector('.services__card').offsetWidth + 16;
    const index = Math.min(Math.round(servicesCarousel.scrollLeft / cardWidth), servicesDots.length - 1);
    servicesDots.forEach((dot, i) => dot.classList.toggle('services__dot--active', i === index));
  }, { passive: true });
}

// Reviews carousel dot indicators
const reviewsCarousel = document.getElementById('reviewsCarousel');
const reviewsDots = document.querySelectorAll('.reviews__dot');
if (reviewsCarousel && reviewsDots.length) {
  reviewsCarousel.addEventListener('scroll', () => {
    const cardWidth = reviewsCarousel.querySelector('.reviews__card').offsetWidth + 16;
    const index = Math.min(Math.round(reviewsCarousel.scrollLeft / cardWidth), reviewsDots.length - 1);
    reviewsDots.forEach((dot, i) => dot.classList.toggle('reviews__dot--active', i === index));
  }, { passive: true });
}

// Enhanced Contact Form Handling
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const btn = contactForm.querySelector('button[type="submit"]');
  const originalBtnText = btn.textContent;
  const formFields = {
    name: contactForm.querySelector('#fName'),
    email: contactForm.querySelector('#fEmail'),
    phone: contactForm.querySelector('#fPhone'),
    service: contactForm.querySelector('#fService'),
    gdpr: contactForm.querySelector('#fGdpr')
  };

  // Real-time validation
  const validators = {
    name: (value) => value.length >= 2 && value.length <= 100,
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254,
    phone: (value) => !value || /^[\d\s\-+()]{9,15}$/.test(value.replace(/\s/g, ''))
  };

  // Add validation feedback
  function setFieldStatus(field, isValid) {
    if (!field) return;
    field.classList.remove('valid', 'invalid');
    field.classList.add(isValid ? 'valid' : 'invalid');
    
    // Find or create error message
    let errorMsg = field.parentElement.querySelector('.field-error');
    if (!isValid && !errorMsg) {
      errorMsg = document.createElement('span');
      errorMsg.className = 'field-error';
      errorMsg.style.cssText = 'color: #e31c25; font-size: 0.85rem; margin-top: 0.25rem; display: block;';
      field.parentElement.appendChild(errorMsg);
    }
    if (errorMsg) {
      errorMsg.textContent = isValid ? '' : getErrorMessage(field.id);
    }
  }

  function getErrorMessage(fieldId) {
    const messages = {
      fName: 'Kérjük, adjon meg egy érvényes nevet (2-100 karakter)',
      fEmail: 'Kérjük, adjon meg egy érvényes email címet',
      fPhone: 'Kérjük, adjon meg egy érvényes telefonszámot'
    };
    return messages[fieldId] || '';
  }

  // Add validation listeners
  Object.keys(formFields).forEach(key => {
    const field = formFields[key];
    if (field && validators[key]) {
      field.addEventListener('blur', () => {
        const isValid = validators[key](field.value.trim());
        setFieldStatus(field, isValid);
      });
      field.addEventListener('input', () => {
        if (field.classList.contains('invalid')) {
          const isValid = validators[key](field.value.trim());
          setFieldStatus(field, isValid);
        }
      });
    }
  });

  // Phone number formatting
  if (formFields.phone) {
    formFields.phone.addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^\d\s\-+]/g, '');
      // Auto-format Hungarian numbers
      if (value.startsWith('36') && value.length > 2) {
        value = '+' + value;
      }
      if (value.startsWith('+36') && value.length > 3) {
        const rest = value.substring(3).replace(/\s/g, '');
        if (rest.length >= 2) {
          const parts = [rest.substring(0, 2)];
          if (rest.length > 2) parts.push(rest.substring(2, 5));
          if (rest.length > 5) parts.push(rest.substring(5, 9));
          value = '+36 ' + parts.join(' ');
        }
      }
      e.target.value = value;
    });
  }

  // Form submission handling
  contactForm.addEventListener('submit', (e) => {
    // Validate all fields
    let isValid = true;
    Object.keys(validators).forEach(key => {
      const field = formFields[key];
      if (field) {
        const valid = validators[key](field.value.trim());
        setFieldStatus(field, valid);
        if (!valid) isValid = false;
      }
    });

    // Check GDPR
    if (!formFields.gdpr.checked) {
      isValid = false;
      formFields.gdpr.parentElement.style.color = '#e31c25';
    } else {
      formFields.gdpr.parentElement.style.color = '';
    }

    if (!isValid) {
      e.preventDefault();
      // Shake animation for feedback
      contactForm.classList.add('shake');
      setTimeout(() => contactForm.classList.remove('shake'), 500);
      return;
    }

    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Küldés...';
    btn.style.opacity = '0.8';
  });

  // Check URL for status
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get('status');
  const errorFields = urlParams.get('fields');

  if (status === 'success') {
    showNotification('Siker! Hamarosan felvesszük Önnel a kapcsolatot.', 'success');
    btn.innerHTML = '✓ Elküldve!';
    btn.style.background = '#1b5e20';
    contactForm.reset();
    setTimeout(() => {
      window.history.replaceState({}, document.title, window.location.pathname + '#contact');
      resetButton();
    }, 5000);
  } else if (status === 'error') {
    let errorMsg = 'Hiba történt! Kérjük, ellenőrizze az adatokat.';
    if (errorFields) {
      const fields = errorFields.split(',');
      const fieldNames = {
        name: 'név',
        email: 'email',
        phone: 'telefonszám'
      };
      errorMsg = `Hiba a következő mezőkben: ${fields.map(f => fieldNames[f] || f).join(', ')}`;
      fields.forEach(field => {
        if (formFields[field]) setFieldStatus(formFields[field], false);
      });
    }
    showNotification(errorMsg, 'error');
    btn.innerHTML = '✕ Hiba történt';
    btn.style.background = '#b71c1c';
    setTimeout(() => {
      window.history.replaceState({}, document.title, window.location.pathname + '#contact');
      resetButton();
    }, 5000);
  } else if (status === 'ratelimit') {
    showNotification('Túl sok kísérlet! Kérjük, várjon egy órát.', 'error');
    btn.disabled = true;
    btn.textContent = 'Túl sok kísérlet';
    setTimeout(() => {
      window.history.replaceState({}, document.title, window.location.pathname + '#contact');
      resetButton();
    }, 5000);
  }

  function resetButton() {
    btn.disabled = false;
    btn.textContent = originalBtnText;
    btn.style.background = '';
    btn.style.opacity = '';
    btn.innerHTML = originalBtnText;
  }

  function showNotification(message, type) {
    // Remove existing notifications
    const existing = document.querySelector('.form-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `form-notification form-notification--${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${type === 'success' ? '✓' : '✕'}</span>
      <span class="notification-text">${message}</span>
    `;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#1b5e20' : '#b71c1c'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      animation: slideIn 0.3s ease;
    `;

    // Add animation styles
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .shake { animation: shake 0.5s ease; }
        .contact__input.valid { border-color: #1b5e20; }
        .contact__input.invalid { border-color: #e31c25; }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Force scroll to top on load to prevent jumping to form
window.addEventListener('load', () => {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  // Only scroll to top if no hash in URL
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }
});

// Handle broken images — show placeholder block
document.querySelectorAll('img').forEach(img => {
  img.addEventListener('error', function () {
    this.style.display = 'none';
    const parent = this.parentElement;
    if (parent) {
      parent.style.background = '#222';
      parent.style.minHeight = '120px';
    }
  });
});

// Intersection Observer for fade-in animations
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const fadeInObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in-visible');
      fadeInObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe elements for fade-in
document.querySelectorAll('.pain__card, .services__card, .reviews__card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  el.classList.add('fade-in');
  fadeInObserver.observe(el);
});

// Add fade-in styles
const fadeInStyles = document.createElement('style');
fadeInStyles.textContent = `
  .fade-in-visible {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(fadeInStyles);
