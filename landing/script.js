// Enhanced JavaScript for Invoo.es Landing Page

// Utility functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Notification system
function showNotification() {
    const notification = $('#notification');
    if (notification) {
        notification.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Analytics tracking (when implemented)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'early_access_interest', {
                event_category: 'engagement',
                event_label: 'notification_modal'
            });
        }
    }
}

function hideNotification() {
    const notification = $('#notification');
    if (notification) {
        notification.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Smooth scrolling
function scrollToDemo() {
    const demoSection = $('#demo');
    if (demoSection) {
        demoSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'demo_view', {
                event_category: 'engagement',
                event_label: 'hero_button'
            });
        }
    }
}

// Enhanced scroll animations
function handleScrollAnimations() {
    const elements = $$('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });

    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Modern navigation scroll effects - SaaSwiftie inspired
function handleNavigation() {
    const nav = $('#navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (nav) {
            // Add/remove scrolled class based on scroll position
            if (currentScrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            
            // Smooth hide/show navigation on scroll (optional - can be disabled for simpler behavior)
            if (currentScrollY > lastScrollY && currentScrollY > 300) {
                nav.style.transform = 'translateY(-100%)';
            } else {
                nav.style.transform = 'translateY(0)';
            }
        }
        
        lastScrollY = currentScrollY;
    });
}

// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Contact form handling
function initializeContactForm() {
    const contactBtns = $$('[data-action="contact"]');
    
    contactBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const subject = encodeURIComponent('Lista de Espera Invoo.es');
            const body = encodeURIComponent(`Hola,

Me gustaría unirme a la lista de espera de Invoo.es para:
- Acceso anticipado a la plataforma
- Precios especiales de lanzamiento
- Updates sobre el desarrollo

Mi perfil:
- Autónomo: [ ]
- Pyme: [ ]
- Gestoría: [ ]
- Otro: [ ]

Volumen aproximado de facturas/mes: ____

¡Gracias!`);
            
            window.location.href = `mailto:hello@invoo.es?subject=${subject}&body=${body}`;
            
            // Analytics tracking
            if (typeof gtag !== 'undefined') {
                gtag('event', 'contact_attempt', {
                    event_category: 'conversion',
                    event_label: btn.textContent.trim()
                });
            }
        });
    });
}

// FAQ accordion functionality
function initializeFAQ() {
    const faqItems = $$('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (question && answer) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                
                // Close all other items
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('open');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    if (otherAnswer) otherAnswer.style.maxHeight = '0';
                });
                
                // Toggle current item
                if (!isOpen) {
                    item.classList.add('open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
                
                // Analytics tracking
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'faq_interaction', {
                        event_category: 'engagement',
                        event_label: question.textContent.trim()
                    });
                }
            });
        }
    });
}

// Pricing plan tracking
function initializePricingTracking() {
    const pricingBtns = $$('.pricing-btn');
    
    pricingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const planName = btn.closest('.pricing-card')?.querySelector('.plan-name')?.textContent || 'Unknown';
            
            // Analytics tracking
            if (typeof gtag !== 'undefined') {
                gtag('event', 'pricing_interest', {
                    event_category: 'conversion',
                    event_label: planName,
                    value: btn.dataset.price || 0
                });
            }
        });
    });
}

// Performance monitoring
function initializePerformanceMonitoring() {
    // Page load time tracking
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_load_time', {
                event_category: 'performance',
                value: Math.round(loadTime)
            });
        }
    });
    
    // Track time on page
    let startTime = Date.now();
    let maxScroll = 0;
    
    window.addEventListener('scroll', () => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        maxScroll = Math.max(maxScroll, scrollPercent);
    });
    
    window.addEventListener('beforeunload', () => {
        const timeOnPage = Date.now() - startTime;
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'engagement_time', {
                event_category: 'engagement',
                value: Math.round(timeOnPage / 1000),
                custom_parameters: {
                    max_scroll_percent: maxScroll
                }
            });
        }
    });
}

// Loading optimization
function optimizeLoading() {
    // Lazy load images
    const images = $$('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('img-loading');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => {
        img.classList.add('img-loading');
        imageObserver.observe(img);
    });
    
    // Preload critical resources
    const criticalResources = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
    ];
    
    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = 'style';
        document.head.appendChild(link);
    });
}

// Error handling
function initializeErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Page error:', event.error);
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: event.error?.message || 'Unknown error',
                fatal: false
            });
        }
    });
}

// Keyboard accessibility
function initializeAccessibility() {
    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideNotification();
        }
    });
    
    // Focus management for modals
    const notification = $('#notification');
    if (notification) {
        notification.addEventListener('click', (e) => {
            if (e.target === notification) {
                hideNotification();
            }
        });
    }
}

// Mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuBtn = $('#mobile-menu-btn');
    const mobileMenu = $('#mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            
            // Update aria attributes
            const isOpen = !mobileMenu.classList.contains('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen);
            
            // Update button icon
            const svg = mobileMenuBtn.querySelector('svg');
            if (isOpen) {
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
            } else {
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
            }
        });
        
        // Close mobile menu when clicking on links
        const mobileLinks = mobileMenu.querySelectorAll('a[href^="#"]');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                const svg = mobileMenuBtn.querySelector('svg');
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
            });
        });
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Invoo.es Landing Page Loaded');
    
    // Initialize all functionality
    handleScrollAnimations();
    handleNavigation();
    initializeContactForm();
    initializeFAQ();
    initializePricingTracking();
    initializePerformanceMonitoring();
    optimizeLoading();
    initializeErrorHandling();
    initializeAccessibility();
    initializeMobileMenu();
    
    // Add smooth scrolling to all anchor links
    $$('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = $(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add animation classes to elements
    $$('.card-enhanced, .feature-icon, .pricing-card').forEach(el => {
        el.classList.add('animate-on-scroll');
    });
});

// Export functions for global access
window.InvooLanding = {
    showNotification,
    hideNotification,
    scrollToDemo,
    validateEmail
};