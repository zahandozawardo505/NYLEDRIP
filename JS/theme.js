// theme.js
(function () {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');

    // ── THEME LOGIC ────────────────────────────────────────────────────────
    const savedTheme = localStorage.getItem('nyledrip_theme') || 'light';
    body.setAttribute('data-theme', savedTheme);

    function updateLogo() {
        const logo = document.querySelector('.logo');
        if (!logo) return;
        logo.innerHTML = `N<span class="nyle-y">Y</span>LE<span class="drip">DRIP</span>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateLogo();
        if (typeof initPremiumFeatures === 'function') initPremiumFeatures();
    });

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = body.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            body.setAttribute('data-theme', next);
            localStorage.setItem('nyledrip_theme', next);
        });
    }

    // ── CART BADGE ─────────────────────────────────────────────────────────
    function updateCartBadge() {
        const badge = document.getElementById('cartNavBadge');
        if (!badge) return;
        try {
            const cart = JSON.parse(localStorage.getItem('nyledrip_cart') || '[]');
            const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            badge.textContent = total;
            badge.style.display = total > 0 ? 'flex' : 'none';
        } catch { badge.style.display = 'none'; }
    }
    updateCartBadge();
    window.addEventListener('cartUpdated', updateCartBadge);

    // ── MOBILE MENU ────────────────────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const navbarMenu = document.getElementById('navbarMenu');
    if (hamburger && navbarMenu) {
        hamburger.onclick = () => {
            navbarMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        };
    }
})();
