document.addEventListener('DOMContentLoaded', () => {
    // Adiciona uma classe ao body para indicar que o JS está pronto.
    // Isso evita o "flash" de conteúdo invisível.
    document.body.classList.add('js-ready');

    // --- 1. EFEITO DO HEADER AO ROLAR A PÁGINA ---
    const header = document.querySelector('.main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // --- 2. FUNCIONALIDADE DO MENU MOBILE ---
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const body = document.body;
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', () => {
            body.classList.toggle('nav-open');
        });
    }

    // --- 3. CONTROLES DO CARROSSEL INTERATIVO ---
    const carousel = document.querySelector('.carousel');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (carousel && prevBtn && nextBtn) {
        const updateButtons = () => {
            // Pequena margem de erro para garantir a detecção do final
            const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
            prevBtn.disabled = carousel.scrollLeft <= 0;
            nextBtn.disabled = carousel.scrollLeft >= maxScrollLeft - 5;
        };

        const scrollCarousel = (direction) => {
            const itemWidth = carousel.querySelector('.carousel-item').offsetWidth;
            const scrollAmount = (itemWidth + 30) * direction; // 30 é o 'gap'
            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        };

        nextBtn.addEventListener('click', () => scrollCarousel(1));
        prevBtn.addEventListener('click', () => scrollCarousel(-1));
        
        // Usa um observer para atualizar os botões quando o carrossel é redimensionado
        new ResizeObserver(updateButtons).observe(carousel);
        carousel.addEventListener('scroll', updateButtons);

        updateButtons();
    }

    // --- 4. ANIMAÇÕES DE SCROLL (FADE-IN) ---
    const fadeElements = document.querySelectorAll('.fade-in');
    if (fadeElements.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // A animação acontece apenas uma vez
                }
            });
        }, observerOptions);

        fadeElements.forEach(el => {
            observer.observe(el);
        });
    }
});