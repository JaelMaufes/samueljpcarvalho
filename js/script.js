const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/67ffa03c8960c979a58666af';
const ADMIN_PASSWORD = 'admin123';
let properties = [];

function getApiKey() {
    return '$2a$10$dKijF5oFCYh5pYskkUvbPO9WziVB5PTwj8H7KI2D3nbUhzp7Zivwu';
}

function handleImageError(img) {
    img.src = '/images/placeholder.png';
    img.alt = 'Imagem não disponível';
    console.error(`Falha ao carregar imagem: ${img.src}`);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        } catch (error) {
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

async function loadData() {
    try {
        const response = await fetchWithRetry(JSONBIN_URL, {
            headers: { 'X-Master-Key': getApiKey() }
        });
        const data = await response.json();
        properties = data.record?.properties || [];
        if (document.getElementById('properties-list')) {
            if (document.getElementById('admin-section')?.style.display === 'block') {
                displayAdminProperties();
            } else {
                displayProperties();
            }
        }
    } catch (error) {
        console.error('Erro ao carregar:', error);
        showFeedback('Erro ao carregar dados.', 'danger');
    }
}

async function saveData() {
    try {
        if (properties.length > 5) properties = properties.slice(-5);
        let existingData = {};
        const response = await fetchWithRetry(JSONBIN_URL, {
            headers: { 'X-Master-Key': getApiKey() }
        });
        if (response.ok) {
            existingData = await response.json();
            existingData = existingData.record || {};
        }
        existingData.properties = properties;
        await fetchWithRetry(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': getApiKey()
            },
            body: JSON.stringify(existingData)
        });
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showFeedback('Erro ao salvar dados.', 'danger');
    }
}

async function saveLocationToJSONBin(latitude, longitude, timestamp, page) {
    try {
        const response = await fetchWithRetry(JSONBIN_URL, {
            headers: { 'X-Master-Key': getApiKey() }
        });
        const data = await response.json();
        let locations = data.record?.locations || [];
        locations.push({ latitude, longitude, timestamp, page });

        let existingData = data.record || {};
        existingData.locations = locations;
        existingData.properties = properties;

        await fetchWithRetry(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': getApiKey()
            },
            body: JSON.stringify(existingData)
        });
    } catch (error) {
        console.error('Erro ao salvar localização:', error);
    }
}

function showFeedback(message, type) {
    const feedback = document.getElementById('form-feedback') || document.getElementById('auth-feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.className = `alert alert-${type}`;
        feedback.style.display = 'block';
        setTimeout(() => feedback.style.display = 'none', 5000);
    }
}

function displayProperties() {
    const propertiesList = document.getElementById('properties-list');
    if (!propertiesList) return;

    propertiesList.innerHTML = '';
    if (properties.length === 0) {
        propertiesList.innerHTML = '<p class="no-properties">Nenhum imóvel cadastrado.</p>';
        return;
    }

    properties.forEach((property, index) => {
        if (property.approvalStatus !== 'approved') return;

        const photosHtml = property.photos?.length
            ? `<div id="carousel-property-${index}" class="carousel slide">
                <div class="carousel-inner">
                    ${property.photos.map((photo, i) => `
                        <div class="carousel-item ${i === 0 ? 'active' : ''}">
                            <img src="${photo}" class="d-block w-100" alt="Foto do imóvel" data-lazy>
                        </div>
                    `).join('')}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carousel-property-${index}" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Anterior</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carousel-property-${index}" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Próximo</span>
                </button>
            </div>`
            : '<p>Sem fotos.</p>';

        const valueDisplay = property.hideValue ? 'Sob consulta' : `R$ ${parseFloat(property.value || 0).toFixed(2)}`;

        propertiesList.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="property-card card">
                    ${photosHtml}
                    <div class="card-body">
                        <h3>${property.owner || 'Anônimo'}</h3>
                        <p><strong>Tipo:</strong> ${property.type === 'locacao' ? 'Locação' : 'Venda'}</p>
                        <p><strong>Valor:</strong> ${valueDisplay}</p>
                        <p><strong>Descrição:</strong> ${property.description || 'N/A'}</p>
                        <a href="https://wa.me/${property.whatsapp}?text=Olá,%20tenho%20interesse%20no%20imóvel%20${encodeURIComponent(property.owner)}" class="btn btn-primary w-100" target="_blank" rel="noopener noreferrer">Contatar via WhatsApp</a>
                    </div>
                </div>
            </div>
        `;
    });

    initLazyLoading();
}

function displayAdminProperties() {
    const propertiesList = document.getElementById('properties-list');
    if (!propertiesList) return;

    propertiesList.innerHTML = '';
    if (properties.length === 0) {
        propertiesList.innerHTML = '<p class="no-properties">Nenhum imóvel cadastrado.</p>';
        return;
    }

    properties.forEach((property, index) => {
        const photosHtml = property.photos?.length
            ? `<div id="carousel-admin-${index}" class="carousel slide">
                <div class="carousel-inner">
                    ${property.photos.map((photo, i) => `
                        <div class="carousel-item ${i === 0 ? 'active' : ''}">
                            <img src="${photo}" class="d-block w-100" alt="Foto do imóvel" data-lazy>
                        </div>
                    `).join('')}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carousel-admin-${index}" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Anterior</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carousel-admin-${index}" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Próximo</span>
                </button>
            </div>`
            : '<p>Sem fotos.</p>';

        const approveButton = property.approvalStatus !== 'approved'
            ? `<button class="btn btn-success w-100 mt-2 approve-btn" data-index="${index}">Aprovar</button>`
            : '';

        propertiesList.innerHTML += `
            <div class="col-12 mb-4">
                <div class="property-card card">
                    <div class="card-body">
                        ${photosHtml}
                        <h3>${property.owner || 'Anônimo'}</h3>
                        <p><strong>Status:</strong> ${property.status || 'Indefinido'}</p>
                        <p><strong>Tipo:</strong> ${property.type === 'locacao' ? 'Locação' : 'Venda'}</p>
                        <p><strong>Valor:</strong> ${property.hideValue ? 'Sob consulta' : `R$ ${parseFloat(property.value || 0).toFixed(2)}`}</p>
                        <p><strong>WhatsApp:</strong> ${property.whatsapp || 'N/A'}</p>
                        <p><strong>Descrição:</strong> ${property.description || 'N/A'}</p>
                        <select class="form-select mb-2 status-select" data-index="${index}">
                            <option value="disponivel" ${property.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
                            <option value="vendido" ${property.status === 'vendido' ? 'selected' : ''}>Vendido</option>
                            <option value="alugado" ${property.status === 'alugado' ? 'selected' : ''}>Alugado</option>
                        </select>
                        ${approveButton}
                        <button class="btn btn-danger w-100 mt-2 delete-btn" data-index="${index}">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    });

    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(e.target.dataset.index);
            if (index >= 0 && index < properties.length) {
                properties[index].approvalStatus = 'approved';
                await saveData();
                displayAdminProperties();
                showFeedback('Imóvel aprovado!', 'success');
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(e.target.dataset.index);
            if (index >= 0 && index < properties.length && confirm('Excluir este imóvel?')) {
                properties.splice(index, 1);
                await saveData();
                displayAdminProperties();
                showFeedback('Imóvel excluído!', 'success');
            }
        });
    });

    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const index = parseInt(e.target.dataset.index);
            if (index >= 0 && index < properties.length) {
                properties[index].status = e.target.value;
                await saveData();
                showFeedback('Status atualizado!', 'success');
            }
        });
    });

    initLazyLoading();
}

async function loadLocationLogs() {
    try {
        const response = await fetchWithRetry(JSONBIN_URL, {
            headers: { 'X-Master-Key': getApiKey() }
        });
        const data = await response.json();
        const locations = data.record?.locations || [];

        const tbody = document.querySelector('#location-logs tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (locations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">Nenhum log de localização encontrado.</td></tr>';
            return;
        }

        locations.forEach(location => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${location.latitude}</td>
                <td>${location.longitude}</td>
                <td>${location.timestamp}</td>
                <td>${location.page || 'Não informado'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar logs de localização:', error);
        const tbody = document.querySelector('#location-logs tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar logs.</td></tr>';
        }
    }
}

function initHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;

    const handleScroll = debounce(() => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    }, 50);

    window.addEventListener('scroll', handleScroll);
}

function initBackToTopButton() {
    const btnTopo = document.createElement('button');
    btnTopo.textContent = '⬆';
    btnTopo.id = 'btn-topo';
    btnTopo.setAttribute('aria-label', 'Voltar ao topo');
    btnTopo.style.cssText = `
        position: fixed;
        bottom: 90px;
        right: 20px;
        background-color: #022452;
        color: #ffbf00;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: none;
        display: none;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        z-index: 1000;
        font-size: 1.2rem;
        transition: background-color 0.3s ease, color 0.3s ease;
    `;
    btnTopo.addEventListener('mouseover', () => {
        btnTopo.style.backgroundColor = '#ffbf00';
        btnTopo.style.color = '#022452';
    });
    btnTopo.addEventListener('mouseout', () => {
        btnTopo.style.backgroundColor = '#022452';
        btnTopo.style.color = '#ffbf00';
    });
    document.body.appendChild(btnTopo);

    btnTopo.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', debounce(() => {
        btnTopo.style.display = window.scrollY > 300 ? 'flex' : 'none';
    }, 50));
}

function initSectionAnimations() {
    const sections = document.querySelectorAll('section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle('visible', entry.isIntersecting);
        });
    }, { threshold: 0.1 });

    sections.forEach(section => observer.observe(section));
}

function initParallax() {
    const elements = {
        star1: document.getElementById('star1'),
        star2: document.getElementById('star2'),
        star3: document.getElementById('star3'),
        bluecircle1: document.getElementById('bluecircle1'),
        bluecircle2: document.getElementById('bluecircle2'),
        bluecircle3: document.getElementById('bluecircle3'),
        rocket1: document.getElementById('rocket1'),
        rocket2: document.getElementById('rocket2'),
        rocket3: document.getElementById('rocket3'),
        sphere1: document.getElementById('sphere1'),
        sphere2: document.getElementById('sphere2'),
        sphere3: document.getElementById('sphere3')
    };

    window.addEventListener('scroll', debounce(() => {
        const scrollY = window.scrollY;
        if (elements.star1) elements.star1.style.transform = `translateY(${scrollY * 0.3}px)`;
        if (elements.star2) elements.star2.style.transform = ` transform: translateY(${scrollY * 0.4}px)`;
        if (elements.star3) elements.star3.style.transform = `translateY(${scrollY * 0.2}px)`;
        if (elements.bluecircle1) elements.bluecircle1.style.transform = `translateY(${scrollY * 0.5}px)`;
        if (elements.bluecircle2) elements.bluecircle2.style.transform = `translateY(${scrollY * 0.3}px)`;
        if (elements.bluecircle3) elements.bluecircle3.style.transform = `translateY(${scrollY * 0.6}px)`;
        if (elements.rocket1) elements.rocket1.style.transform = `translateY(${scrollY * 0.2}px)`;
        if (elements.rocket2) elements.rocket2.style.transform = `translateY(${scrollY * 0.1}px)`;
        if (elements.rocket3) elements.rocket3.style.transform = `translateY(${scrollY * 0.4}px)`;
        if (elements.sphere1) elements.sphere1.style.transform = `translateY(${scrollY * 0.4}px)`;
        if (elements.sphere2) elements.sphere2.style.transform = `translateY(${scrollY * 0.5}px)`;
        if (elements.sphere3) elements.sphere3.style.transform = `translateY(${scrollY * 0.3}px)`;
    }, 50));
}

function initGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const timestamp = new Date().toLocaleString('pt-BR');
            const path = window.location.pathname;
            const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
            const accessData = { latitude, longitude, timestamp, page };

            let accesses = JSON.parse(localStorage.getItem('userAccesses')) || [];
            accesses.push(accessData);
            localStorage.setItem('userAccesses', JSON.stringify(accesses));

            saveLocationToJSONBin(latitude, longitude, timestamp, page);
        }, (error) => {
            console.error('Erro ao obter localização:', error);
        });
    }
}

function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeBtn = document.querySelector('.mobile-menu .close-btn');
    const overlay = document.querySelector('.overlay');

    menuToggle?.addEventListener('click', () => {
        mobileMenu.classList.add('active');
        overlay.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
    });

    closeBtn?.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    });

    overlay?.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    });
}

function initDropdowns() {
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const dropdownMenu = toggle.nextElementSibling;
            const isActive = dropdownMenu.classList.contains('active');
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('active');
            });
            if (!isActive) {
                dropdownMenu.classList.add('active');
                toggle.setAttribute('aria-expanded', 'true');
            } else {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        toggle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const dropdownMenu = toggle.nextElementSibling;
            const isActive = dropdownMenu.classList.contains('active');
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('active');
            });
            if (!isActive) {
                dropdownMenu.classList.add('active');
                toggle.setAttribute('aria-expanded', 'true');
            } else {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('active');
            });
            document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
                toggle.setAttribute('aria-expanded', 'false');
            });
        }
    });
}

function initAuthForm() {
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const passwordInput = document.getElementById('password');
            const password = passwordInput.value.replace(/[<>&"']/g, '');
            if (password === ADMIN_PASSWORD) {
                document.getElementById('auth-section').style.display = 'none';
                document.getElementById('admin-section').style.display = 'block';
                displayAdminProperties();
            } else {
                showFeedback('Senha incorreta.', 'danger');
            }
            passwordInput.value = '';
        });
    }
}

function initPropertyForm() {
    const propertyForm = document.getElementById('property-form');
    if (!propertyForm) return;

    propertyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const owner = document.getElementById('owner').value.replace(/[<>&"']/g, '');
        const type = document.getElementById('type').value;
        const value = document.getElementById('value').value;
        const hideValue = document.getElementById('hide-value')?.checked || false;
        const whatsapp = document.getElementById('whatsapp')?.value.replace(/[<>&"']/g, '') || '';
        const description = document.getElementById('description').value.replace(/[<>&"']/g, '');
        const photosInput = document.getElementById('photos');
        const consent = document.getElementById('consent')?.checked || true;

        if (!consent) {
            showFeedback('Você deve concordar com a Política de Privacidade.', 'danger');
            return;
        }

        if (whatsapp && !/^\d+$/.test(whatsapp)) {
            showFeedback('O número de WhatsApp deve conter apenas números.', 'danger');
            return;
        }

        const photos = [];
        if (photosInput?.files?.length > 15) {
            showFeedback('Você pode enviar no máximo 15 fotos.', 'danger');
            return;
        }

        if (photosInput?.files?.length) {
            for (let file of photosInput.files) {
                try {
                    const photoUrl = await uploadPhoto(file);
                    photos.push(photoUrl);
                } catch (error) {
                    console.error('Erro ao fazer upload da foto:', error);
                    showFeedback('Erro ao fazer upload das fotos.', 'danger');
                    return;
                }
            }
        }

        const property = {
            owner,
            type,
            value: hideValue ? null : parseFloat(value) || 0,
            hideValue,
            whatsapp,
            description,
            photos,
            status: 'disponivel',
            approvalStatus: 'pending',
            createdAt: new Date().toISOString()
        };

        properties.push(property);
        await saveData();
        showFeedback('Imóvel cadastrado com sucesso! Aguardando aprovação.', 'success');
        propertyForm.reset();
        if (document.getElementById('admin-section')?.style.display === 'block') {
            displayAdminProperties();
        }
    });
}

async function uploadPhoto(file) {
    // Placeholder para upload de fotos (deve ser implementado com um serviço de armazenamento real)
    // Exemplo: Usar Firebase, AWS S3 ou outro serviço de hospedagem de arquivos
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // Temporário: usa Data URL
        reader.readAsDataURL(file);
    });
}

function initLazyLoading() {
    const images = document.querySelectorAll('img[data-lazy]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.add('loaded');
                img.removeAttribute('data-lazy');
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '100px' });

    images.forEach(img => {
        img.dataset.src = img.src;
        observer.observe(img);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', () => handleImageError(img));
    });

    initHeaderScroll();
    initBackToTopButton();
    initSectionAnimations();
    initParallax();
    initGeolocation();
    initMobileMenu();
    initDropdowns();
    initLazyLoading();

    if (document.getElementById('auth-section')) {
        loadData();
        initAuthForm();
    }
    if (document.getElementById('property-form')) {
        loadData();
        initPropertyForm();
    }
    if (document.getElementById('location-logs-section')) {
        loadLocationLogs();
    }
});