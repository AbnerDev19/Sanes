document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const header = document.querySelector('.main-header');
    const navToggle = document.querySelector('.mobile-nav-toggle');
    const nav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');
    const revealItems = document.querySelectorAll('.reveal');
    const carouselTrack = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    const updateHeader = () => {
        if (!header) return;
        header.classList.toggle('scrolled', window.scrollY > 24);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    const closeMenu = () => {
        body.classList.remove('menu-open');
        if (navToggle) {
            navToggle.setAttribute('aria-expanded', 'false');
        }
    };

    const openMenu = () => {
        body.classList.add('menu-open');
        if (navToggle) {
            navToggle.setAttribute('aria-expanded', 'true');
        }
    };

    if (navToggle && nav) {
        navToggle.addEventListener('click', () => {
            const isOpen = body.classList.contains('menu-open');
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (event) => {
            if (!body.classList.contains('menu-open')) return;
            const clickedInsideNav = nav.contains(event.target);
            const clickedToggle = navToggle.contains(event.target);
            if (!clickedInsideNav && !clickedToggle) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    }

    if (revealItems.length) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealItems.forEach(item => observer.observe(item));
    }

    if (carouselTrack && prevBtn && nextBtn) {
        const getScrollAmount = () => {
            const firstCard = carouselTrack.querySelector('.carousel-item');
            if (!firstCard) return 320;

            const cardWidth = firstCard.getBoundingClientRect().width;
            const styles = window.getComputedStyle(carouselTrack);
            const gap = parseFloat(styles.columnGap || styles.gap || 22);
            return cardWidth + gap;
        };

        const updateCarouselButtons = () => {
            const maxScroll = carouselTrack.scrollWidth - carouselTrack.clientWidth;
            prevBtn.disabled = carouselTrack.scrollLeft <= 5;
            nextBtn.disabled = carouselTrack.scrollLeft >= maxScroll - 5;
        };

        prevBtn.addEventListener('click', () => {
            carouselTrack.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            carouselTrack.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
        });

        carouselTrack.addEventListener('scroll', updateCarouselButtons, { passive: true });
        window.addEventListener('resize', updateCarouselButtons);
        updateCarouselButtons();
    }
});
