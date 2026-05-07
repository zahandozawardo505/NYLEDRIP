// wishlist.js

(function () {
    const WISHLIST_KEY = 'niledrip_wishlist';
    const CART_KEY = 'niledrip_cart';

    const grid = document.getElementById('wishlistGrid');
    const empty = document.getElementById('wishlistEmpty');

    function getWishlist() {
        return Store.get(WISHLIST_KEY, []);
    }

    function saveWishlist(items) {
        Store.set(WISHLIST_KEY, items);
    }

    function getCart() {
        return Store.get(CART_KEY, []);
    }

    function saveCart(items) {
        Store.set(CART_KEY, items);
    }

    function render() {
        if (!grid) return;
        const wishlist = getWishlist();
        grid.innerHTML = '';

        if (!wishlist.length) {
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        wishlist.forEach(p => {
            const card = document.createElement('article');
            card.className = 'product-card';
            card.innerHTML = `
                <a href="product.html?id=${p.id}" class="product-image-link">
                    <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x360?text=No+Image'">
                </a>
                <div class="card-info">
                    <h3>${p.name}</h3>
                    <p>${p.price} EGP</p>
                    <div class="shop-card-actions">
                        <button class="btn btn-primary move-to-cart" data-id="${p.id}">Move to Cart</button>
                        <button class="btn btn-danger remove-wishlist" data-id="${p.id}">Remove</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    document.addEventListener('click', e => {
        const removeBtn = e.target.closest('.remove-wishlist');
        if (removeBtn) {
            const id = removeBtn.dataset.id;
            const next = getWishlist().filter(item => item.id !== id);
            saveWishlist(next);
            render();
            return;
        }

        const moveBtn = e.target.closest('.move-to-cart');
        if (moveBtn) {
            const id = moveBtn.dataset.id;
            const wishlist = getWishlist();
            const item = wishlist.find(i => i.id === id);
            if (!item) return;

            const cart = getCart();
            const existing = cart.find(c => c.id === item.id && c.size === 'M');
            if (existing) existing.quantity += 1;
            else {
                cart.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    image: item.image,
                    size: 'M',
                    quantity: 1
                });
            }
            saveCart(cart);
            saveWishlist(wishlist.filter(i => i.id !== id));
            render();
            alert('Moved to cart');
        }
    });

    render();
})();
