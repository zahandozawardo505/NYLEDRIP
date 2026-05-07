// dashboard-seller.js

const COUPON_KEY = 'niledrip_coupons';
const DEFAULT_COUPONS = [
    { code: 'NILE10', discount: 10 },
    { code: 'DRIP20', discount: 20 },
    { code: 'WELCOME15', discount: 15 }
];

const selectedProductIds = new Set();

function getProducts() {
    return Store.get('niledrip_products', []);
}

function saveProducts(products) {
    Store.set('niledrip_products', products);
}

function getCoupons() {
    const saved = Store.get(COUPON_KEY, []);
    if (saved.length) return saved;
    Store.set(COUPON_KEY, DEFAULT_COUPONS);
    return DEFAULT_COUPONS;
}

function saveCoupons(coupons) {
    Store.set(COUPON_KEY, coupons);
}

function isValidImageSource(value) {
    if (!value) return false;
    if (value.startsWith('data:image/')) return true;
    return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(value);
}

function validateImageFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('Please select an image.'));
        if (!file.type.startsWith('image/')) return reject(new Error('Only image files are allowed.'));
        if (file.size > 3 * 1024 * 1024) return reject(new Error('Image must be 3MB or less.'));

        const reader = new FileReader();
        reader.onload = () => {
            const src = reader.result;
            const img = new Image();
            img.onload = () => {
                if (img.width < 300 || img.height < 300) {
                    reject(new Error('Image must be at least 300x300 pixels.'));
                    return;
                }
                resolve(src);
            };
            img.onerror = () => reject(new Error('Invalid image file.'));
            img.src = src;
        };
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
    });
}

window.addProduct = function (product) {
    product.id = Date.now().toString();
    const products = getProducts();
    products.push(product);
    saveProducts(products);
    renderProducts();
    updateStats();
};

window.deleteProduct = function (id) {
    const products = getProducts().filter(p => p.id !== id);
    saveProducts(products);
    selectedProductIds.delete(id);
    renderProducts();
    updateStats();
};

window.duplicateProduct = function (id) {
    const products = getProducts();
    const original = products.find(p => p.id === id);
    if (!original) return;
    const duplicate = {
        ...original,
        id: Date.now().toString(),
        name: `${original.name} (Copy)`,
        createdAt: new Date().toISOString()
    };
    products.push(duplicate);
    saveProducts(products);
    renderProducts();
    updateStats();
};

window.editProduct = function (id) {
    const product = getProducts().find(p => p.id === id);
    if (!product) return;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductStock').value = product.stock || 0;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductImage').value = product.image || '';

    const modal = document.getElementById('editProductModal');
    if (modal) modal.style.display = 'flex';
};

function renderProducts() {
    const list = document.querySelector('.products-list');
    if (!list) return;

    const products = getProducts();
    list.innerHTML = '';

    if (products.length === 0) {
        list.innerHTML = '<p style="text-align:center;padding:2rem;">No products yet. Add your first product!</p>';
        updateSelectedCount();
        return;
    }

    products.forEach(p => {
        const item = document.createElement('div');
        item.className = 'product-item';
        const lowStock = Number(p.stock || 0) <= 5;
        const checked = selectedProductIds.has(p.id) ? 'checked' : '';
        item.innerHTML = `
            <div class="product-image">
                <img src="${p.image}" alt="${p.name}"
                     style="width:100%;height:100%;object-fit:cover;"
                     onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
            </div>
            <div class="product-details-list">
                <h4>${p.name}</h4>
                <p>${p.category} • Stock: ${p.stock || 0}</p>
                ${lowStock ? '<span class="low-stock-badge">Low Stock</span>' : ''}
                <p><strong>${p.price} EGP</strong></p>
            </div>
            <div class="product-actions">
                <label class="select-product-row">
                    <input type="checkbox" class="product-select-box" data-id="${p.id}" ${checked}>
                    Select
                </label>
                <button class="btn btn-small btn-secondary" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn btn-small btn-secondary" onclick="duplicateProduct('${p.id}')">Duplicate</button>
                <button class="btn btn-small btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });

    updateSelectedCount();
}

function updateStats() {
    const products = getProducts();
    const stats = document.querySelectorAll('.stat-number');
    if (stats[0]) stats[0].textContent = products.length;
}

function updateSelectedCount() {
    const el = document.getElementById('selectedProductsCount');
    if (!el) return;
    el.textContent = `${selectedProductIds.size} selected`;
}

function applyBulkUpdate() {
    if (!selectedProductIds.size) {
        alert('Select at least one product first.');
        return;
    }
    const priceDelta = Number(document.getElementById('bulkPriceDelta')?.value || 0);
    const stockDelta = Number(document.getElementById('bulkStockDelta')?.value || 0);
    if (priceDelta === 0 && stockDelta === 0) {
        alert('Enter a price and/or stock delta.');
        return;
    }

    const products = getProducts().map(p => {
        if (!selectedProductIds.has(p.id)) return p;
        return {
            ...p,
            price: Math.max(1, Number(p.price || 0) + priceDelta),
            stock: Math.max(0, Number(p.stock || 0) + stockDelta)
        };
    });

    saveProducts(products);
    renderProducts();
    updateStats();
    alert('Bulk update applied.');
}

function renderMiniChart(targetId, values) {
    const root = document.getElementById(targetId);
    if (!root) return;
    const max = Math.max(...values, 1);
    root.innerHTML = values.map(v => {
        const h = Math.round((v / max) * 100);
        return `<div class="mini-bar"><span style="height:${h}%"></span></div>`;
    }).join('');
}

function renderCoupons() {
    const list = document.getElementById('couponList');
    if (!list) return;
    const coupons = getCoupons();
    if (!coupons.length) {
        list.innerHTML = '<p>No coupons yet.</p>';
        return;
    }

    list.innerHTML = coupons.map(c => `
        <div class="coupon-item">
            <span><strong>${c.code}</strong> - ${c.discount}%</span>
            <div class="coupon-item-actions">
                <button class="btn btn-secondary coupon-edit" data-code="${c.code}">Edit</button>
                <button class="btn btn-danger coupon-delete" data-code="${c.code}">Delete</button>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateStats();
    renderMiniChart('salesChart', [14, 19, 12, 24, 28, 22, 31]);
    renderMiniChart('trafficChart', [120, 160, 140, 210, 260, 230, 290]);
    renderCoupons();

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tabId = link.dataset.tab;
            document.querySelectorAll('.dashboard-tab').forEach(tab => {
                tab.style.display = tab.id === tabId ? 'block' : 'none';
                tab.classList.toggle('active', tab.id === tabId);
            });
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    const hamburger = document.getElementById('hamburger');
    const navbarMenu = document.getElementById('navbarMenu');
    if (hamburger && navbarMenu) {
        hamburger.addEventListener('click', () => {
            navbarMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) window.location.href = '../index.html';
        });
    }

    document.addEventListener('change', e => {
        if (e.target.classList.contains('product-select-box')) {
            const { id } = e.target.dataset;
            if (e.target.checked) selectedProductIds.add(id);
            else selectedProductIds.delete(id);
            updateSelectedCount();
        }
    });

    const applyBulkUpdateBtn = document.getElementById('applyBulkUpdateBtn');
    if (applyBulkUpdateBtn) applyBulkUpdateBtn.addEventListener('click', applyBulkUpdate);

    const closeEditModal = document.getElementById('closeEditModal');
    const editProductModal = document.getElementById('editProductModal');
    if (closeEditModal) closeEditModal.addEventListener('click', () => {
        if (editProductModal) editProductModal.style.display = 'none';
    });
    if (editProductModal) {
        editProductModal.addEventListener('click', e => {
            if (e.target.id === 'editProductModal') editProductModal.style.display = 'none';
        });
    }

    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('editProductId').value;
            const products = getProducts();
            const product = products.find(p => p.id === id);
            if (!product) return;

            const nextImage = document.getElementById('editProductImage').value.trim();
            if (nextImage && !isValidImageSource(nextImage)) {
                alert('Please enter a valid image URL.');
                return;
            }

            product.name = document.getElementById('editProductName').value.trim();
            product.price = parseFloat(document.getElementById('editProductPrice').value);
            product.stock = parseInt(document.getElementById('editProductStock').value, 10);
            product.category = document.getElementById('editProductCategory').value;
            if (nextImage) product.image = nextImage;

            saveProducts(products);
            renderProducts();
            updateStats();
            if (editProductModal) editProductModal.style.display = 'none';
            alert('Product updated!');
        });
    }

    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async e => {
            e.preventDefault();

            const name = document.getElementById('productName')?.value.trim();
            const price = parseFloat(document.getElementById('productPrice')?.value);
            const stock = parseInt(document.getElementById('productStock')?.value, 10);
            const category = document.getElementById('productCategory')?.value;
            const description = document.getElementById('productDescription')?.value.trim();
            const file = document.getElementById('productImage')?.files?.[0];
            const sizes = Array.from(
                document.querySelectorAll('.size-checkbox-group input[type="checkbox"]:checked')
            ).map(cb => cb.value);

            if (!name || !price || !category || sizes.length === 0 || !description) {
                alert('Please fill all required fields and pick at least one size.');
                return;
            }

            let imageSrc = '';
            try {
                imageSrc = await validateImageFile(file);
            } catch (err) {
                alert(err.message);
                return;
            }

            window.addProduct({
                name,
                price,
                stock: Number.isNaN(stock) ? 0 : stock,
                category,
                description,
                image: imageSrc,
                sizes,
                brand: 'Raak Brand',
                sellerId: 'seller001',
                createdAt: new Date().toISOString()
            });

            addProductForm.reset();
            alert('Product added successfully!');
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            const productsTabLink = document.querySelector('[data-tab="products"]');
            if (productsTabLink) productsTabLink.classList.add('active');
            document.querySelectorAll('.dashboard-tab').forEach(tab => {
                tab.style.display = tab.id === 'products' ? 'block' : 'none';
            });
        });
    }

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', e => {
            e.preventDefault();
            alert('Settings saved!');
        });
    }

    const couponForm = document.getElementById('couponForm');
    if (couponForm) {
        couponForm.addEventListener('submit', e => {
            e.preventDefault();
            const code = document.getElementById('couponCode').value.trim().toUpperCase();
            const discount = Number(document.getElementById('couponDiscount').value);
            if (!code || discount < 1 || discount > 90) {
                alert('Coupon code and discount must be valid.');
                return;
            }
            const coupons = getCoupons();
            if (coupons.some(c => c.code === code)) {
                alert('Coupon already exists.');
                return;
            }
            coupons.push({ code, discount });
            saveCoupons(coupons);
            couponForm.reset();
            renderCoupons();
        });
    }

    document.addEventListener('click', e => {
        const del = e.target.closest('.coupon-delete');
        if (del) {
            const code = del.dataset.code;
            saveCoupons(getCoupons().filter(c => c.code !== code));
            renderCoupons();
            return;
        }
        const edit = e.target.closest('.coupon-edit');
        if (edit) {
            const code = edit.dataset.code;
            const coupons = getCoupons();
            const current = coupons.find(c => c.code === code);
            if (!current) return;
            const next = prompt(`New discount for ${code} (%)`, String(current.discount));
            if (next === null) return;
            const value = Number(next);
            if (value < 1 || value > 90) {
                alert('Discount must be between 1 and 90.');
                return;
            }
            current.discount = value;
            saveCoupons(coupons);
            renderCoupons();
        }
    });
});
