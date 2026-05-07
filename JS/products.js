// products.js (FIXED IDS ONLY)

(function seedProducts() {
    if (Store.get('niledrip_products', []).length === 0) {
        Store.set('niledrip_products', [
            {
                id: 'p1',
                name: 'Premium Hoodie',
                category: 'hoodies',
                price: 550,
                image: '../assets/images/bmw.webp',
                description: 'Premium quality oversized hoodie.',
                stock: 12
            },
            {
                id: 'p2',
                name: 'Classic Tee',
                category: 'tees',
                price: 250,
                image: '../assets/images/bmw.webp',
                description: 'Classic lightweight tee.',
                stock: 24
            }
        ]);
    }
})();