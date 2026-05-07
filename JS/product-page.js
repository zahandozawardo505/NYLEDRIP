// product-page.js

function getProductIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function getWishlist() {
    return Store.get('niledrip_wishlist', []);
}

function saveWishlist(items) {
    Store.set('niledrip_wishlist', items);
}

function toggleWishlist(product) {
    let wishlist = getWishlist();
    const index = wishlist.findIndex(p => p.id === product.id);
    const btn = document.getElementById('wishlistBtn');

    if (index === -1) {
        wishlist.push(product);
        if (btn) btn.innerHTML = 'In Wishlist ❤️';
    } else {
        wishlist.splice(index, 1);
        if (btn) btn.innerHTML = 'Wishlist ❤️';
    }
    saveWishlist(wishlist);
}

async function renderRelatedProducts(currentProduct, allProducts) {
    const grid = document.getElementById('relatedGrid');
    if (!grid) return;

    const related = allProducts
        .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
        .slice(0, 4);

    if (related.length === 0) {
        const section = document.querySelector('.related-products');
        if (section) section.style.display = 'none';
        return;
    }

    grid.innerHTML = related.map(p => `
        <article class="product-card">
            <a href="${getPagePath('product.html?id=' + p.id)}" class="product-image-link">
                <img src="${getAssetPath(p.image)}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x400?text=${p.name}'">
            </a>
            <div class="card-info">
                <h3>${p.name}</h3>
                <p>${formatCurrency(p.price)}</p>
            </div>
        </article>
    `).join('');
}

function setupArTryOn(product) {
    const tryOnBtn = document.getElementById('tryOnBtn');
    const arModal = document.getElementById('arModal');
    const arVideo = document.getElementById('arVideo');
    const arOverlay = document.getElementById('arOverlay');
    const closeAr = document.getElementById('closeAr');

    if (!tryOnBtn || !arModal) return;

    tryOnBtn.onclick = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (arVideo) arVideo.srcObject = stream;
            // Use local asset path for overlay
            if (arOverlay) arOverlay.src = getAssetPath(product.image);
            arModal.classList.add('active');
        } catch (err) {
            alert("Camera access is needed for Virtual Try-On!");
        }
    };

    const stopAr = () => {
        if (arVideo && arVideo.srcObject) {
            arVideo.srcObject.getTracks().forEach(track => track.stop());
            arVideo.srcObject = null;
        }
        arModal.classList.remove('active');
    };

    if (closeAr) closeAr.onclick = stopAr;
    arModal.onclick = (e) => { if (e.target === arModal) stopAr(); };
}

function loadProduct() {
    const id = getProductIdFromURL();
    if (!id) return;

    const products = DB.products;
    const product = products.find(p => p.id === id);
    if (!product) return;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    
    set('productName', product.name);
    set('productPrice', product.price);
    set('productDescription', product.description);
    set('productCategory', product.category);
    
    const mainImg = document.getElementById('mainImage');
    if (mainImg) mainImg.src = getAssetPath(product.image);

    // Initial Wishlist Button State
    const wishlist = getWishlist();
    const btn = document.getElementById('wishlistBtn');
    if (btn && wishlist.some(p => p.id === product.id)) {
        btn.innerHTML = 'In Wishlist ❤️';
    }

    renderRelatedProducts(product, products);
    setupArTryOn(product);
}

document.addEventListener('DOMContentLoaded', loadProduct);

// --- Event Listeners ---
const addToCartBtn = document.getElementById('addToCartBtn');
if (addToCartBtn) {
    addToCartBtn.onclick = () => {
        const id = getProductIdFromURL();
        const product = DB.products.find(p => p.id === id);
        if (!product) return;

        DB.addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size: document.querySelector('.size-btn.active')?.dataset.size || 'M',
            color: document.querySelector('.color-btn.active')?.dataset.color || 'Default',
            quantity: parseInt(document.getElementById('quantity')?.value || 1)
        });
        alert("Added to cart!");
    };
}

const wishlistBtn = document.getElementById('wishlistBtn');
if (wishlistBtn) {
    wishlistBtn.onclick = () => {
        const id = getProductIdFromURL();
        const product = DB.products.find(p => p.id === id);
        if (product) toggleWishlist(product);
    };
}

document.querySelectorAll('.size-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});
