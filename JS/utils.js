/* JS/utils.js */
const validateEmail = email =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = pass =>
    pass.length >= 8;

const getPasswordStrength = pass => {
    let s = 0;
    if (pass.length >= 8) s++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) s++;
    if (/\d/.test(pass)) s++;
    if (/[^A-Za-z0-9]/.test(pass)) s++;
    return Math.max(1, s);
};

const showError = (el, msg) => {
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
};

const clearError = el => {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
};

const getAssetPath = (path) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('//')) return path;
    const isInHTML = window.location.pathname.toLowerCase().includes('/html/');
    const cleanPath = path.startsWith('../') ? path.substring(3) : path;
    return isInHTML ? '../' + cleanPath : cleanPath;
};

const getPagePath = (pageName) => {
    const isInHTML = window.location.pathname.toLowerCase().includes('/html/');
    if (pageName === 'index.html') {
        return isInHTML ? '../index.html' : 'index.html';
    }
    const [base, query] = pageName.split('?');
    const path = isInHTML ? base : 'HTML/' + base;
    return query ? `${path}?${query}` : path;
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0
    }).format(amount).replace('EGP', '').trim() + ' EGP';
};

// --- Premium Notifications ---
const showToast = (message, type = 'success') => {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `reveal active`;
    const bgColor = type === 'success' ? 'var(--primary-color)' : '#ef4444';
    toast.style.cssText = `background:${bgColor}; color:white; padding:16px 24px; border-radius:12px; font-weight:700; box-shadow:var(--shadow-lg); min-width:200px; display:flex; align-items:center; gap:12px; transition:all 0.4s var(--transition-base);`;
    
    const icon = type === 'success' ? '✨' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};

// --- Premium Features ---

const initPremiumFeatures = () => {
    // 0. Inject Global UI Elements
    if (!document.getElementById('aiScoutTrigger')) {
        const scoutHTML = `
            <div id="aiScoutTrigger" class="ai-scout-trigger" aria-label="Open AI Stylist">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </div>
            <div id="aiScoutPanel" class="ai-scout-panel">
                <div class="ai-scout-header">
                    <h3 style="font-size:16px;">Drip Scout AI</h3>
                    <button id="closeAiScout" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                <div class="ai-scout-messages" id="aiMessages">
                    <div class="ai-message bot">Yo! I'm your Drip Scout. Ready to find your next level drip?</div>
                </div>
                <div class="ai-scout-input">
                    <input type="text" id="aiInput" placeholder="Ask about the drip...">
                    <button class="btn btn-primary btn-small" id="sendAiMessage" style="padding: 8px 12px;">Send</button>
                </div>
            </div>
            <div id="quickViewPortal" class="ar-modal">
                <div id="portalBody" class="container" style="background: var(--bg-primary); padding: 50px; border-radius: 24px; max-width: 900px; position: relative; border: 1px solid var(--border-color);"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', scoutHTML);
    }

    // 1. Scroll Reveal
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('section, .product-card, .category-card').forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });

    // 2. AI Scout Toggle
    const scoutTrigger = document.getElementById('aiScoutTrigger');
    const scoutPanel = document.getElementById('aiScoutPanel');
    if (scoutTrigger) {
        scoutTrigger.onclick = () => scoutPanel.classList.toggle('active');
        document.getElementById('closeAiScout').onclick = () => scoutPanel.classList.remove('active');
        
        const aiInput = document.getElementById('aiInput');
        const sendBtn = document.getElementById('sendAiMessage');
        const aiMessages = document.getElementById('aiMessages');

        const sendMessage = () => {
            const text = aiInput.value.trim();
            if (!text) return;
            const msg = document.createElement('div');
            msg.className = 'ai-message user';
            msg.textContent = text;
            aiMessages.appendChild(msg);
            aiInput.value = '';

            const getAiResponse = (query) => {
                const q = query.toLowerCase();
                if (q.includes('hoodie')) return "Our Heavyweight Boxy Hoodies are currently the top choice for streetwear fans.";
                if (q.includes('shirt') || q.includes('tee')) return "Check our 'Drip Essentials' tees—lightweight and perfect for Cairo heat.";
                if (q.includes('price') || q.includes('cheap')) return "Quality doesn't always break the bank. Pieces start at just 350 EGP!";
                if (q.includes('sale') || q.includes('discount')) return "Use code NILE10 at checkout for a nice little surprise!";
                return "That's a vibe. We've got some new independent labels in the shop that match that energy perfectly.";
            };

            setTimeout(() => {
                const bot = document.createElement('div');
                bot.className = 'ai-message bot';
                bot.textContent = getAiResponse(text);
                aiMessages.appendChild(bot);
                aiMessages.scrollTop = aiMessages.scrollHeight;
            }, 600);
        };
        sendBtn.onclick = sendMessage;
        aiInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    }

    // 3. Unified Global Search
    const initGlobalSearch = async () => {
        const navContainer = document.querySelector('.navbar .container');
        if (!navContainer || document.getElementById('globalSearch')) return;

        const searchDiv = document.createElement('div');
        searchDiv.className = 'navbar-search';
        searchDiv.innerHTML = `
            <div class="search-wrapper">
                <input type="text" id="globalSearch" placeholder="Search the drip...">
                <button id="navImageSearch" class="search-img-btn" title="Visual Search">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                </button>
            </div>
            <div id="searchSuggestions" class="search-suggestions" style="position:absolute; top:105%; left:0; width:100%; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:16px; display:none; z-index:1500; box-shadow:var(--shadow); overflow:hidden;"></div>
        `;

        const actions = document.querySelector('.navbar-actions');
        if (actions) {
            actions.insertBefore(searchDiv, actions.firstChild);
        }

        const products = Store.get('niledrip_products', []);
        const searchInput = document.getElementById('globalSearch');
        const vsBtn = document.getElementById('navImageSearch');
        const suggestions = document.getElementById('searchSuggestions');

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        vsBtn.onclick = () => fileInput.click();
        fileInput.onchange = () => {
            if (fileInput.files.length) {
                alert("AI SCANNING DRIP...");
                setTimeout(() => window.location.href = getPagePath('shop.html?visualMatch=true'), 1500);
            }
        };

        searchInput.oninput = (e) => {
            const q = e.target.value.toLowerCase().trim();
            if (q.length < 2) { suggestions.style.display = 'none'; return; }
            const matches = products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 5);
            if (matches.length) {
                suggestions.innerHTML = matches.map(p => `
                    <a href="${getPagePath('product.html?id=' + p.id)}" style="display:flex; align-items:center; gap:12px; padding:12px; text-decoration:none; color:inherit; border-bottom:1px solid var(--border-color);">
                        <img src="${getAssetPath(p.image)}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                        <div><div style="font-weight:700; font-size:14px;">${p.name}</div><div style="font-size:12px; color:var(--primary-color); font-weight:800;">${formatCurrency(p.price)}</div></div>
                    </a>`).join('');
                suggestions.style.display = 'block';
            } else suggestions.style.display = 'none';
        };

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) suggestions.style.display = 'none';
        });
    };
    initGlobalSearch();
};
