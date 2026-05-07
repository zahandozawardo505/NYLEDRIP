// main.js - Homepage Logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize premium global features (Search, AI Scout, Scroll Reveal)
    if (typeof initPremiumFeatures === 'function') {
        initPremiumFeatures();
    }
    renderFeaturedProducts();

    // ── NEWSLETTER HANDLER ──────────────────────────────────────────────────
    const newsBtn = document.getElementById('newsJoinBtn');
    const newsInput = document.getElementById('newsEmail');
    if (newsBtn && newsInput) {
        newsBtn.onclick = () => {
            const email = newsInput.value.trim();
            if (!email || !email.includes('@')) {
                showToast("Please enter a valid email", "error");
                return;
            }
            showToast("Welcome to the Drip Club! 🚀");
            newsInput.value = '';
        };
    }
});

async function renderFeaturedProducts() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;

    const products = DB.products;
    const featured = products.sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 3);

    if (featured.length === 0) {
        grid.innerHTML = '<p>Loading featured drip...</p>';
        return;
    }

    grid.innerHTML = featured.map(p => `
        <article class="product-card">
            <a href="${getPagePath('product.html?id=' + p.id)}" class="product-image-link">
                <img src="${getAssetPath(p.image)}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x400?text=${p.name}'">
            </a>
            <div class="card-info">
                <h3>${p.name}</h3>
                <p>${formatCurrency(p.price)}</p>
                <a href="${getPagePath('product.html?id=' + p.id)}" class="btn btn-secondary" style="width:100%; margin-top:10px;">View Details</a>
            </div>
        </article>
    `).join('');
}
