(function () {
    const grid = document.getElementById('productsGrid');
    const noProducts = document.getElementById('noProducts');
    const countEl = document.getElementById('productCount');
    const sortEl = document.getElementById('sortBy');
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    const resetBtn = document.getElementById('resetFilters');
    const openCompareBtn = document.getElementById('openCompareBtn');
    const compareModal = document.getElementById('compareModal');
    const closeCompareModal = document.getElementById('closeCompareModal');
    const compareTableWrap = document.getElementById('compareTableWrap');

    const compareIds = new Set();

    function getProducts() {
        return Store.get('niledrip_products', []);
    }

    function addToCartFromShop(product) {
        const cart = Store.get('niledrip_cart', []);
        const size = 'M';

        const existing = cart.find(i => i.id === product.id && i.size === size);

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                size,
                quantity: 1
            });
        }

        Store.set('niledrip_cart', cart);
        window.dispatchEvent(new Event('cartUpdated'));
        alert('Added to cart');
    }

    function getFilters() {
        const categories = [...document.querySelectorAll('.category-filter:checked')].map(el => el.value);
        const brands = [...document.querySelectorAll('.brand-filter:checked')].map(el => el.value);
        const maxPrice = priceRange ? +priceRange.value : 99999;
        return { categories, brands, maxPrice };
    }

    function normalizeCategory(value) {
        const raw = (value || '').toLowerCase().trim();
        const aliases = {
            'hoodie': 'hoodies',
            'hoodies': 'hoodies',
            'tee': 'tees',
            'tees': 'tees',
            't-shirt': 'tees',
            'tshirts': 'tees',
            't-shirts': 'tees',
            'sweatpant': 'sweatpants',
            'sweatpants': 'sweatpants',
            'accessory': 'accessories',
            'accessories': 'accessories'
        };
        return aliases[raw] || raw;
    }

    function applyCategoryFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const category = normalizeCategory(params.get('category'));
        if (!category) return;

        const target = document.querySelector(`.category-filter[value="${category}"]`);
        if (target) target.checked = true;
    }

    function applySort(list, sortVal) {
        const copy = [...list];
        if (sortVal === 'price-low') return copy.sort((a, b) => a.price - b.price);
        if (sortVal === 'price-high') return copy.sort((a, b) => b.price - a.price);
        if (sortVal === 'popular') return copy.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        return copy;
    }

    function updateCompareButton() {
        if (!openCompareBtn) return;
        openCompareBtn.textContent = `Compare (${compareIds.size})`;
        openCompareBtn.disabled = compareIds.size < 2;
    }

    function renderCompareTable() {
        if (!compareTableWrap) return;

        const products = getProducts().filter(p => compareIds.has(p.id));

        if (products.length < 2) {
            compareTableWrap.innerHTML = "<p>Select at least 2 products to compare.</p>";
            return;
        }

        compareTableWrap.innerHTML = `
            <table class="compare-table">
                <tr>
                    <th>Field</th>
                    ${products.map(p => `<th>${p.name}</th>`).join('')}
                </tr>
                <tr>
                    <td>Price</td>
                    ${products.map(p => `<td>${p.price} EGP</td>`).join('')}
                </tr>
                <tr>
                    <td>Category</td>
                    ${products.map(p => `<td>${p.category}</td>`).join('')}
                </tr>
                <tr>
                    <td>Stock</td>
                    ${products.map(p => `<td>${p.stock || 0}</td>`).join('')}
                </tr>
            </table>
        `;
    }

    function renderProducts() {
        if (!grid) return;

        let products = getProducts();
        const { categories, brands, maxPrice } = getFilters();
        const sortVal = sortEl ? sortEl.value : 'newest';

        if (categories.length) products = products.filter(p => categories.includes(p.category));
        if (brands.length) products = products.filter(p => brands.includes(p.brand));
        products = products.filter(p => p.price <= maxPrice);

        products = applySort(products, sortVal);

        grid.innerHTML = '';

        if (products.length === 0) {
            if (noProducts) noProducts.style.display = 'block';
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (noProducts) noProducts.style.display = 'none';
        if (countEl) countEl.textContent = products.length;

        products.forEach(p => {
            const selected = compareIds.has(p.id);

            const card = document.createElement('article');
            card.className = 'product-card';

            // ✅ FIXED GITHUB PAGES LINK
            const link = `./Product.html?id=${p.id}`;

            card.innerHTML = `
                <a href="${link}" class="product-image-link">
                    <img src="${p.image}" alt="${p.name}">
                </a>

                <div class="card-info">
                    <h3>${p.name}</h3>
                    <p>${p.price} EGP</p>

                    <button class="btn btn-primary shop-add-cart" data-id="${p.id}">
                        Add
                    </button>

                    <button class="btn ${selected ? 'btn-primary' : 'btn-secondary'} shop-compare"
                        data-id="${p.id}">
                        ${selected ? 'Selected' : 'Compare'}
                    </button>
                </div>
            `;

            grid.appendChild(card);
        });
    }

    // =====================
    // EVENTS
    // =====================
    document.addEventListener('click', e => {
        const addBtn = e.target.closest('.shop-add-cart');
        if (addBtn) {
            const product = getProducts().find(p => p.id === addBtn.dataset.id);
            if (product) addToCartFromShop(product);
        }

        const compareBtn = e.target.closest('.shop-compare');
        if (compareBtn) {
            const id = compareBtn.dataset.id;

            if (compareIds.has(id)) compareIds.delete(id);
            else {
                if (compareIds.size >= 4) return alert('Max 4 products');
                compareIds.add(id);
            }

            updateCompareButton();
            renderProducts();
        }

        if (e.target.id === 'openCompareBtn') {
            renderCompareTable();
            if (compareModal) compareModal.style.display = 'flex';
        }

        if (e.target.id === 'closeCompareModal' || e.target.id === 'compareModal') {
            if (compareModal) compareModal.style.display = 'none';
        }
    });

    document.querySelectorAll('.category-filter, .brand-filter').forEach(el => {
        el.addEventListener('change', renderProducts);
    });

    if (priceRange) {
        priceRange.addEventListener('input', () => {
            if (priceValue) priceValue.textContent = priceRange.value;
            renderProducts();
        });
    }

    if (sortEl) sortEl.addEventListener('change', renderProducts);

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.querySelectorAll('.category-filter, .brand-filter')
                .forEach(el => el.checked = false);

            if (priceRange) priceRange.value = 1000;
            if (priceValue) priceValue.textContent = '1000';
            if (sortEl) sortEl.value = 'newest';

            renderProducts();
        });
    }

    applyCategoryFromQuery();
    updateCompareButton();
    renderProducts();
})();
