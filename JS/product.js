// ============================================
// PRODUCT DETAIL PAGE
// ============================================

const sizeButtons = document.querySelectorAll('.size-btn');
const colorButtons = document.querySelectorAll('.color-btn');
const increaseQtyBtn = document.getElementById('increaseQty');
const decreaseQtyBtn = document.getElementById('decreaseQty');
const quantityInput = document.getElementById('quantity');
const addToCartBtn = document.getElementById('addToCartBtn');

if (sizeButtons.length > 0) {
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            clearError(document.getElementById('sizeError'));
        });
    });
}

if (colorButtons.length > 0) {
    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            colorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

if (increaseQtyBtn) {
    increaseQtyBtn.addEventListener('click', () => {
        quantityInput.value = parseInt(quantityInput.value) + 1;
    });
}

if (decreaseQtyBtn) {
    decreaseQtyBtn.addEventListener('click', () => {
        if (parseInt(quantityInput.value) > 1) {
            quantityInput.value = parseInt(quantityInput.value) - 1;
        }
    });
}

if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        const selectedSize = document.querySelector('.size-btn.active');

        if (!selectedSize) {
            showError(document.getElementById('sizeError'), 'Please select a size');
            return;
        }

       alert(`Added to cart: ${selectedSize.dataset.size} - Qty: ${quantityInput.value}`);
    });
}
