// JS/seed.js
// USE: Include this once in your index.html or run it in console to seed your Supabase DB with initial data.

const SEED_DATA = [
    {
        name: 'Onyx Black Hoodie',
        category: 'hoodies',
        brand: 'Raak Brand',
        price: 650,
        image: 'assets/images/bmw.webp',
        description: 'Heavyweight cotton blend hoodie with minimalist branding.',
        stock: 15,
        sales: 45
    },
    {
        name: 'Desert Sand Tee',
        category: 'tees',
        brand: 'Desert Threads',
        price: 350,
        image: 'assets/images/bmw.webp',
        description: 'Premium Egyptian cotton tee in a relaxed fit.',
        stock: 30,
        sales: 82
    },
    {
        name: 'Urban Cargo Pants',
        category: 'sweatpants',
        brand: 'Urban Cairo',
        price: 850,
        image: 'assets/images/bmw.webp',
        description: 'Functional cargo sweatpants with reinforced stitching.',
        stock: 10,
        sales: 12
    },
    {
        name: 'Neon Drip Socks',
        category: 'accessories',
        brand: 'Kreative Co',
        price: 150,
        image: 'assets/images/bmw.webp',
        description: 'High-quality crew socks with vibrant patterns.',
        stock: 50,
        sales: 120
    }
];

async function seedDatabase() {
    console.log('Starting seed...');
    const { data, error } = await supabaseClient
        .from('products')
        .insert(SEED_DATA);

    if (error) {
        console.error('Seed failed. Make sure you created the "products" table in Supabase!', error);
    } else {
        console.log('Seed successful! Products added to cloud.');
    }
}

// Uncomment to run:
// seedDatabase();
