// cart.js

const DEFAULT_COUPONS = [
    { code: 'NILE10', discount: 10 },
    { code: 'DRIP20', discount: 20 },
    { code: 'WELCOME15', discount: 15 }
];

let activeDiscount = 0;
let lastRemovedItem = null;
let undoTimer = null;

function getCart() {
    return Store.get('niledrip_cart', []);
}

function saveCart(cart) {
    Store.set('niledrip_cart', cart);
}

function getCoupons() {
    const saved = Store.get('niledrip_coupons', []);
    if (saved.length) return saved;
    return DEFAULT_COUPONS;
}

function showUndoBar(message, removedItem) {
    const bar = document.getElementById('undoRemoveBar');
    const text = document.getElementById('undoRemoveText');
    if (!bar || !text) return;
    lastRemovedItem = removedItem;
    text.textContent = message;
    bar.style.display = 'flex';
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
        bar.style.display = 'none';
        lastRemovedItem = null;
    }, 5000);
}

function hideUndoBar() {
    const bar = document.getElementById('undoRemoveBar');
    if (bar) bar.style.display = 'none';
    if (undoTimer) clearTimeout(undoTimer);
    lastRemovedItem = null;
}

function removeFromCart(id, size) {
    const cart = getCart();
    const removed = cart.find(i => i.id === id && i.size === size);
    const next = cart.filter(i => !(i.id === id && i.size === size));
    saveCart(next);
    if (removed) showUndoBar(`${removed.name} removed`, removed);
}

function updateCartQuantity(id, size, delta) {
    const cart = getCart();
    const index = cart.findIndex(i => i.id === id && i.size === size);
    if (index === -1) return;

    const item = cart[index];
    const nextQty = item.quantity + delta;

    if (nextQty <= 0) {
        cart.splice(index, 1);
        saveCart(cart);
        showUndoBar(`${item.name} removed`, item);
        return;
    }

    item.quantity = nextQty;
    saveCart(cart);
}

function openCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    modal.classList.add('is-open');
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}

function updateDeliveryInfo(subtotal) {
    const dateEl = document.getElementById('estimatedDelivery');
    const progressBar = document.getElementById('shippingProgressBar');
    const progressText = document.getElementById('shippingProgressText');
    if (!dateEl || !progressBar || !progressText) return;

    if (subtotal <= 0) {
        dateEl.textContent = '-';
        progressBar.style.width = '0%';
        progressText.textContent = 'Add items to unlock free shipping';
        return;
    }

    const etaDays = subtotal >= 1200 ? 2 : subtotal >= 700 ? 3 : 5;
    const eta = new Date();
    eta.setDate(eta.getDate() + etaDays);
    dateEl.textContent = eta.toLocaleDateString();

    const progress = Math.min(100, Math.round((subtotal / 1200) * 100));
    progressBar.style.width = `${progress}%`;
    progressText.textContent = progress >= 100
        ? 'Free shipping unlocked'
        : `Add ${1200 - subtotal} EGP more for free shipping`;
}

function renderCart() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartLayout = document.getElementById('cartLayout');

    if (!cartItemsEl) return;

    const cart = getCart();
    if (cart.length === 0) {
        if (cartEmpty) cartEmpty.style.display = 'block';
        if (cartLayout) cartLayout.style.display = 'none';
        updateDeliveryInfo(0);
        return;
    }

    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartLayout) cartLayout.style.display = '';

    cartItemsEl.innerHTML = '';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image || 'https://via.placeholder.com/120x120?text=No+Image'}"
                     alt="${item.name}"
                     onerror="this.src='https://via.placeholder.com/120x120?text=No+Image'">
            </div>
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p>Size: ${item.size || '-'}</p>
                <p><strong>${item.price} EGP</strong></p>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" data-id="${item.id}" data-size="${item.size}" data-delta="-1">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-id="${item.id}" data-size="${item.size}" data-delta="1">+</button>
            </div>
            <button class="btn btn-danger btn-small remove-btn" data-id="${item.id}" data-size="${item.size}">
                Remove
            </button>
        `;
        cartItemsEl.appendChild(div);
    });

    updateSummary();
}

function updateSummary() {
    const cart = getCart();
    const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = cart.length ? (subtotal >= 1200 ? 0 : 50) : 0;
    const discount = Math.round((subtotal * activeDiscount) / 100);
    const total = subtotal + shipping - discount;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('summaryItemCount', itemCount);
    set('summarySubtotal', subtotal + ' EGP');
    set('summaryTotal', total + ' EGP');

    const promoDiv = document.getElementById('promoApplied');
    const promoSpan = document.getElementById('promoDiscount');
    if (promoDiv && promoSpan) {
        promoDiv.style.display = activeDiscount ? 'block' : 'none';
        promoSpan.textContent = discount + ' EGP';
    }

    updateDeliveryInfo(subtotal);
}

document.addEventListener('DOMContentLoaded', () => {
    closeCheckoutModal();
    renderCart();
    const noteEl = document.getElementById('cartNote');
    if (noteEl) {
        noteEl.value = localStorage.getItem('niledrip_cart_note') || '';
        noteEl.addEventListener('input', () => {
            localStorage.setItem('niledrip_cart_note', noteEl.value.trim());
        });
    }
});

document.addEventListener('click', e => {
    if (e.target.closest('#checkoutBtn')) {
        const cart = getCart();
        if (!cart.length) return alert('Your cart is empty!');
        const orderIdEl = document.getElementById('modalOrderId');
        if (orderIdEl) orderIdEl.textContent = 'ND-' + Date.now();
        openCheckoutModal();
        return;
    }

    if (e.target.closest('#cancelCheckoutBtn') || e.target.id === 'checkoutModal') {
        closeCheckoutModal();
        return;
    }

    if (e.target.closest('#confirmOrderBtn')) {
        saveCart([]);
        localStorage.removeItem('niledrip_cart_note');
        renderCart();
        closeCheckoutModal();
        hideUndoBar();
        alert('Order successfully placed!');
        return;
    }

    if (e.target.closest('#clearCartBtn')) {
        saveCart([]);
        renderCart();
        hideUndoBar();
        return;
    }

    if (e.target.closest('#undoRemoveBtn') && lastRemovedItem) {
        const cart = getCart();
        const exists = cart.find(i => i.id === lastRemovedItem.id && i.size === lastRemovedItem.size);
        if (!exists) {
            cart.push(lastRemovedItem);
            saveCart(cart);
            renderCart();
        }
        hideUndoBar();
        return;
    }

    if (e.target.classList.contains('qty-btn')) {
        const { id, size, delta } = e.target.dataset;
        updateCartQuantity(id, size, Number(delta));
        renderCart();
        return;
    }

    if (e.target.classList.contains('remove-btn')) {
        const { id, size } = e.target.dataset;
        removeFromCart(id, size);
        renderCart();
    }
});

const applyPromoBtn = document.getElementById('applyPromo');
if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', () => {
        const code = (document.getElementById('promoInput')?.value || '').toUpperCase().trim();
        const coupon = getCoupons().find(c => c.code === code);
        if (!coupon) {
            activeDiscount = 0;
            alert('Invalid promo code');
        } else {
            activeDiscount = Number(coupon.discount) || 0;
            alert(`Promo applied! ${activeDiscount}% discount`);
        }
        updateSummary();
    });
}
