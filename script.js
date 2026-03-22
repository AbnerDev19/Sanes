document.addEventListener('DOMContentLoaded', () => {
    // 1. MENU MOBILE E HEADER
    const body = document.body;
    const header = document.querySelector('.main-header');
    const navToggle = document.querySelector('.mobile-nav-toggle');
    const nav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');

    const updateHeader = () => {
        if (!header) return;
        header.classList.toggle('scrolled', window.scrollY > 24);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    const closeMenu = () => {
        body.classList.remove('menu-open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
        body.classList.add('menu-open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
    };

    if (navToggle && nav) {
        navToggle.addEventListener('click', () => {
            body.classList.contains('menu-open') ? closeMenu() : openMenu();
        });
        navLinks.forEach(link => link.addEventListener('click', closeMenu));
        document.addEventListener('click', (event) => {
            if (!body.classList.contains('menu-open')) return;
            if (!nav.contains(event.target) && !navToggle.contains(event.target)) closeMenu();
        });
    }

    // 2. REVEAL NO SCROLL
    const revealItems = document.querySelectorAll('.reveal');
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

    // 3. EFEITO DIGITAÇÃO (HERO)
    const h1Type = document.querySelector('.typewriter');
    const pType = document.querySelector('.typewriter-delay');

    if (h1Type && pType) {
        const h1Text = h1Type.textContent;
        const pText = pType.textContent;
        h1Type.textContent = '';
        pType.textContent = '';

        const typeWriterEffect = (element, text, speed, callback) => {
            let i = 0;
            const type = () => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                } else if (callback) {
                    element.classList.add('typing-done');
                    setTimeout(callback, 200);
                }
            };
            type();
        };
        typeWriterEffect(h1Type, h1Text, 35, () => {
            typeWriterEffect(pType, pText, 15, () => {
                pType.classList.add('typing-done');
            });
        });
    }

    // 4. CARROSSEL (Intacto)
    const carouselTrack = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

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

        prevBtn.addEventListener('click', () => carouselTrack.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' }));
        nextBtn.addEventListener('click', () => carouselTrack.scrollBy({ left: getScrollAmount(), behavior: 'smooth' }));

        carouselTrack.addEventListener('scroll', updateCarouselButtons, { passive: true });
        window.addEventListener('resize', updateCarouselButtons);
        updateCarouselButtons();
    }

    // 5. STEPPER (VALIDADO E CORRIGIDO)
    const totalSteps = 4;
    let currentStep = 1;
    
    const stepperHeader = document.querySelector('.stepper-header');
    const stepperTrack = document.getElementById('stepperTrack');
    const btnStepBack = document.getElementById('stepBack');
    const btnStepNext = document.getElementById('stepNext');

    if (stepperHeader && stepperTrack && btnStepBack && btnStepNext) {
        for (let i = 1; i <= totalSteps; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'step-indicator-wrapper';
            
            const circle = document.createElement('div');
            circle.className = `step-circle ${i === 1 ? 'active' : ''}`;
            circle.id = `circle-${i}`;
            circle.innerHTML = i === 1 ? '<div class="active-dot"></div>' : i;
            wrapper.appendChild(circle);

            if (i < totalSteps) {
                const connector = document.createElement('div');
                connector.className = 'step-connector';
                connector.innerHTML = `<div class="step-connector-fill" id="line-${i}"></div>`;
                wrapper.appendChild(connector);
            }
            stepperHeader.appendChild(wrapper);
        }

        const updateStepperUI = () => {
            stepperTrack.style.transform = `translateX(-${(currentStep - 1) * 25}%)`;

            if (currentStep === 1) {
                btnStepBack.classList.add('inactive');
                btnStepNext.style.display = 'block';
                btnStepNext.textContent = 'Próximo';
            } else if (currentStep === totalSteps) {
                btnStepBack.classList.remove('inactive');
                btnStepNext.style.display = 'none'; 
                
                const btnWhatsapp = document.getElementById('btn-whatsapp');
                const tipo = document.getElementById('brinde-tipo')?.value || 'Não informado';
                const detalhes = document.getElementById('brinde-detalhes')?.value || 'Nenhum';
                const nome = document.getElementById('cliente-nome')?.value || 'Cliente';

                const telefoneWhatsApp = "550000000000"; // MUDAR PARA O NÚMERO DA SANES
                const mensagem = `Olá, Sanes Brindes!\nMe chamo *${nome}*.\nGostaria de um orçamento rápido:\n\n*Produto:* ${tipo}\n*Detalhes:* ${detalhes}`;
                
                if(btnWhatsapp) {
                    btnWhatsapp.href = `https://api.whatsapp.com/send?phone=${telefoneWhatsApp}&text=${encodeURIComponent(mensagem)}`;
                    btnWhatsapp.target = "_blank";
                }

            } else {
                btnStepBack.classList.remove('inactive');
                btnStepNext.style.display = 'block';
                btnStepNext.textContent = 'Próximo';
            }

            for (let i = 1; i <= totalSteps; i++) {
                const circle = document.getElementById(`circle-${i}`);
                const line = document.getElementById(`line-${i}`);

                if (i < currentStep) {
                    circle.className = 'step-circle completed';
                    circle.innerHTML = `<svg class="step-check" fill="none" stroke="#111" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`;
                    if (line) line.classList.add('filled');
                } else if (i === currentStep) {
                    circle.className = 'step-circle active';
                    circle.innerHTML = '<div class="active-dot"></div>';
                    if (line) line.classList.remove('filled');
                } else {
                    circle.className = 'step-circle';
                    circle.innerHTML = i;
                    if (line) line.classList.remove('filled');
                }
            }
        };

        const validateStep = () => {
            if (currentStep === 1) {
                const inputTipo = document.getElementById('brinde-tipo');
                const errorMsg = document.querySelector('.error-msg');
                if (inputTipo.value.trim() === '') {
                    inputTipo.style.borderColor = '#ff6b6b';
                    errorMsg.style.display = 'block';
                    return false;
                } else {
                    inputTipo.style.borderColor = 'rgba(255,255,255,0.2)';
                    errorMsg.style.display = 'none';
                }
            }
            if (currentStep === 3) {
                const inputNome = document.getElementById('cliente-nome');
                const errorMsgNome = document.querySelector('.error-msg-nome');
                if (inputNome.value.trim() === '') {
                    inputNome.style.borderColor = '#ff6b6b';
                    errorMsgNome.style.display = 'block';
                    return false;
                } else {
                    inputNome.style.borderColor = 'rgba(255,255,255,0.2)';
                    errorMsgNome.style.display = 'none';
                }
            }
            return true;
        };

        updateStepperUI();

        btnStepNext.addEventListener('click', () => {
            if (validateStep() && currentStep < totalSteps) {
                currentStep++;
                updateStepperUI();
            }
        });

        btnStepBack.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepperUI();
            }
        });
    }
});