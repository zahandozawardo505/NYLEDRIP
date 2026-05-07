// db.js (FINAL FIXED VERSION WITH LOCAL FALLBACKS)

const DB = {
    get products() { 
        const items = Store.get('niledrip_products', []);
        if (items.length > 0) return items;
        
        // Return local fallbacks if DB is empty for testing premium features
        return [
            {
                id: 'p1',
                name: 'Midnight Labyrinth Hoodie',
                category: 'hoodies',
                brand: 'Raak Brand',
                price: 750,
                image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=500',
                description: 'The signature piece of the collection. Features deep neon embroidery and heavy-duty fleece.',
                stock: 12,
                sales: 99
            },
            {
                id: 'p2',
                name: 'Sahara Dune Tee',
                category: 'tees',
                brand: 'Desert Threads',
                price: 450,
                image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=500',
                description: 'Crafted from pure Giza cotton. Minimalist design with maximum comfort.',
                stock: 25,
                sales: 150
            }
        ];
    },
    get cart()     { return Store.get('niledrip_cart', []); },
    get wishlist() { return Store.get('niledrip_wishlist', []); },
    get users()    { return Store.get('niledrip_users', []); },
    get sellers()  { return Store.get('niledrip_sellers', []); },
    get applications() { return Store.get('niledrip_applications', []); },

    saveApplications(apps) {
        Store.set('niledrip_applications', apps);
    },

    save(key, value) {
        Store.set(key, value);
    },

    saveProducts(data) {
        Store.set('niledrip_products', data);
    },

    addToCart(item) {
        const cart = this.cart;
        const index = cart.findIndex(i => i.id === item.id && i.size === item.size && i.color === item.color);
        if (index > -1) {
            cart[index].quantity += item.quantity;
        } else {
            cart.push(item);
        }
        Store.set('niledrip_cart', cart);
        window.dispatchEvent(new Event('cartUpdated'));
    },

    removeCartItem(id, size, color) {
        const cart = this.cart.filter(i => !(i.id === id && i.size === size && i.color === color));
        Store.set('niledrip_cart', cart);
        window.dispatchEvent(new Event('cartUpdated'));
    },

    clearCart() {
        Store.set('niledrip_cart', []);
        window.dispatchEvent(new Event('cartUpdated'));
    }
};
