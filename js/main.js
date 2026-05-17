document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            faqItems.forEach(i => i.classList.remove('active'));
            if (!isActive) item.classList.add('active');
        });
    });

    // Navbar shadow on scroll (passive for performance)
    const nav = document.querySelector('.top-nav');
    window.addEventListener('scroll', () => {
        nav.style.boxShadow = window.scrollY > 10 ? '0 4px 12px rgba(0,0,0,0.05)' : 'none';
    }, { passive: true });

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Free GPU memory after animation completes
                setTimeout(() => { entry.target.style.willChange = 'auto'; }, 800);
                obs.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px', threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Lazy load Google Maps iframes when they scroll into view
    const mapObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const iframe = entry.target;
                const src = iframe.dataset.src;
                if (src) iframe.src = src;
                obs.unobserve(iframe);
            }
        });
    }, { rootMargin: '200px' });

    document.querySelectorAll('iframe[data-src]').forEach(el => mapObserver.observe(el));
});
