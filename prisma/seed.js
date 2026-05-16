"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Create admin user
    const adminPassword = await bcryptjs_1.default.hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@brendbless.com' },
        update: {},
        create: {
            email: 'admin@brendbless.com',
            password: adminPassword,
            firstName: 'Admin',
            lastName: 'BRENDBLESS',
            role: 'ADMIN',
            phone: '+380991234567',
        },
    });
    console.log('✅ Admin user created:', admin.email);
    // Create test user
    const userPassword = await bcryptjs_1.default.hash('user123', 12);
    const user = await prisma.user.upsert({
        where: { email: 'test@brendbless.com' },
        update: {},
        create: {
            email: 'test@brendbless.com',
            password: userPassword,
            firstName: 'Test',
            lastName: 'User',
            role: 'USER',
            phone: '+380991234568',
        },
    });
    console.log('✅ Test user created:', user.email);
    // Create categories
    const categories = [
        { name: 'Одяг', slug: 'odyag', description: 'Верхній одяг, светри, штани', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400', sortOrder: 1 },
        { name: 'Взуття', slug: 'vzuttia', description: 'Кросівки, черевики, туфлі', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', sortOrder: 2 },
        { name: 'Аксесуари', slug: 'aksesuari', description: 'Сумки, годинники, прикраси', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', sortOrder: 3 },
        { name: 'Спортивний одяг', slug: 'sport', description: 'Для тренувань та активного відпочинку', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', sortOrder: 4 },
        { name: 'Бренди', slug: 'brendy', description: 'Преміум бренди', image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400', sortOrder: 5 },
    ];
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: cat,
        });
    }
    console.log('✅ Categories created');
    // Create brands
    const brands = [
        { name: 'Nike', slug: 'nike', description: 'Спортивний одяг та взуття', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', website: 'https://nike.com' },
        { name: 'Adidas', slug: 'adidas', description: 'Спортивний одяг та взуття', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Logo_adidas.svg', website: 'https://adidas.com' },
        { name: 'Zara', slug: 'zara', description: 'Модний одяг', website: 'https://zara.com' },
        { name: 'H&M', slug: 'hm', description: 'Модний одяг за доступними цінами', website: 'https://hm.com' },
        { name: 'Uniqlo', slug: 'uniqlo', description: 'Якісний базовий одяг', website: 'https://uniqlo.com' },
    ];
    for (const brand of brands) {
        await prisma.brand.upsert({
            where: { slug: brand.slug },
            update: {},
            create: brand,
        });
    }
    console.log('✅ Brands created');
    // Get category and brand IDs
    const clothingCat = await prisma.category.findUnique({ where: { slug: 'odyag' } });
    const shoesCat = await prisma.category.findUnique({ where: { slug: 'vzuttia' } });
    const accessoriesCat = await prisma.category.findUnique({ where: { slug: 'aksesuari' } });
    const sportCat = await prisma.category.findUnique({ where: { slug: 'sport' } });
    const nikeBrand = await prisma.brand.findUnique({ where: { slug: 'nike' } });
    const adidasBrand = await prisma.brand.findUnique({ where: { slug: 'adidas' } });
    const zaraBrand = await prisma.brand.findUnique({ where: { slug: 'zara' } });
    const uniqloBrand = await prisma.brand.findUnique({ where: { slug: 'uniqlo' } });
    // Create products
    const products = [
        {
            name: 'Куртка Nike Sportswear',
            slug: 'kurtka-nike-sportswear',
            description: 'Чоловіча куртка Nike Sportswear для щоденного носіння. Вітро- та водостійка тканина, зручний крій.',
            price: 3999,
            compareAtPrice: 4999,
            sku: 'NK-001',
            stockQuantity: 25,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600']),
            tags: JSON.stringify(['куртка', 'чоловіча', 'nike', 'спортивна']),
            categoryId: clothingCat?.id,
            brandId: nikeBrand?.id,
            isFeatured: true,
        },
        {
            name: 'Кросівки Adidas Ultraboost',
            slug: 'adidas-ultraboost',
            description: 'Бігові кросівки Adidas Ultraboost з технологією Boost для максимального комфорту.',
            price: 5999,
            compareAtPrice: 6999,
            sku: 'AD-001',
            stockQuantity: 15,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600']),
            tags: JSON.stringify(['кросівки', 'біг', 'adidas', 'чоловіча']),
            categoryId: shoesCat?.id,
            brandId: adidasBrand?.id,
            isFeatured: true,
        },
        {
            name: 'Светр Zara Premium',
            slug: 'sveter-zara-premium',
            description: 'Теплий светр з натуральної вовни. Ідеальний для осінньо-зимового сезону.',
            price: 1999,
            sku: 'ZR-001',
            stockQuantity: 40,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600']),
            tags: JSON.stringify(['светр', 'зима', 'вовна', 'zara']),
            categoryId: clothingCat?.id,
            brandId: zaraBrand?.id,
        },
        {
            name: 'Сумка Nike Brasilia',
            slug: 'sumka-nike-brasilia',
            description: 'Спортивна сумка Nike Brasilia на 46 літрів. Ідеальна для тренажерного залу.',
            price: 1299,
            sku: 'NK-002',
            stockQuantity: 30,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600']),
            tags: JSON.stringify(['сумка', 'спортивна', 'nike', 'тренування']),
            categoryId: accessoriesCat?.id,
            brandId: nikeBrand?.id,
            isFeatured: true,
        },
        {
            name: 'Спортивний костюм Adidas Essentials',
            slug: 'adidas-essentials-set',
            description: 'Чоловічий спортивний костюм Adidas Essentials. Комфортний для тренувань та відпочинку.',
            price: 2999,
            compareAtPrice: 3499,
            sku: 'AD-002',
            stockQuantity: 20,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600']),
            tags: JSON.stringify(['спортивний костюм', 'чоловічий', 'adidas', 'тренування']),
            categoryId: sportCat?.id,
            brandId: adidasBrand?.id,
            isFeatured: true,
        },
        {
            name: 'Футболка Uniqlo Dry',
            slug: 'futbolka-uniqlo-dry',
            description: 'Спортивна футболка Uniqlo Dry-EX з технологією швидкого висихання.',
            price: 599,
            sku: 'UQ-001',
            stockQuantity: 100,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600']),
            tags: JSON.stringify(['футболка', 'спортивна', 'uniqlo', 'чоловіча']),
            categoryId: sportCat?.id,
            brandId: uniqloBrand?.id,
        },
        {
            name: 'Джинси Zara Slim Fit',
            slug: 'dzynsy-zara-slim',
            description: 'Класичні джинси Zara Slim Fit. Відмінна посадка, якісний денім.',
            price: 1799,
            sku: 'ZR-002',
            stockQuantity: 35,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600']),
            tags: JSON.stringify(['джинси', 'чоловічі', 'zara', 'мода']),
            categoryId: clothingCat?.id,
            brandId: zaraBrand?.id,
        },
        {
            name: 'Кросівки Nike Air Max',
            slug: 'nike-air-max-90',
            description: 'Культові кросівки Nike Air Max 90. Легендарний дизайн, максимальний комфорт.',
            price: 4999,
            compareAtPrice: 5999,
            sku: 'NK-003',
            stockQuantity: 10,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600']),
            tags: JSON.stringify(['кросівки', 'nike', 'air max', 'чоловіча']),
            categoryId: shoesCat?.id,
            brandId: nikeBrand?.id,
            isFeatured: true,
        },
        {
            name: 'Рюкзак Adidas Classic',
            slug: 'ruknzak-adidas-classic',
            description: 'Міський рюкзак Adidas Classic. Просторий, з відділом для ноутбука.',
            price: 999,
            sku: 'AD-003',
            stockQuantity: 45,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600']),
            tags: JSON.stringify(['рюкзак', 'міський', 'adidas', 'повсякденний']),
            categoryId: accessoriesCat?.id,
            brandId: adidasBrand?.id,
        },
        {
            name: 'Пальто Zara Wool',
            slug: 'palto-zara-wool',
            description: 'Елегантне пальто Zara з натуральної вовни. Ідеальне для холодної пори.',
            price: 4499,
            sku: 'ZR-003',
            stockQuantity: 12,
            trackInventory: true,
            images: JSON.stringify(['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600']),
            tags: JSON.stringify(['пальто', 'зима', 'вовна', 'zara', 'елегантне']),
            categoryId: clothingCat?.id,
            brandId: zaraBrand?.id,
            isFeatured: true,
        },
    ];
    for (const product of products) {
        await prisma.product.upsert({
            where: { slug: product.slug },
            update: {},
            create: product,
        });
    }
    console.log('✅ Products created');
    // Create some reviews
    const product1 = await prisma.product.findUnique({ where: { slug: 'kurtka-nike-sportswear' } });
    const product2 = await prisma.product.findUnique({ where: { slug: 'adidas-ultraboost' } });
    const product3 = await prisma.product.findUnique({ where: { slug: 'nike-air-max-90' } });
    if (product1) {
        await prisma.review.upsert({
            where: { userId_productId: { userId: user.id, productId: product1.id } },
            update: {},
            create: { userId: user.id, productId: product1.id, rating: 5, title: 'Відмінна куртка!', comment: 'Носив всю зиму, дуже задоволений якістю. Тепла, легка, добре сидить.', isApproved: true },
        });
    }
    if (product2) {
        await prisma.review.upsert({
            where: { userId_productId: { userId: user.id, productId: product2.id } },
            update: {},
            create: { userId: user.id, productId: product2.id, rating: 5, title: 'Найкращі кросівки!', comment: 'Бігаю в них вже 3 місяці. Дуже зручні, добре амортизують.', isApproved: true },
        });
    }
    if (product3) {
        await prisma.review.upsert({
            where: { userId_productId: { userId: user.id, productId: product3.id } },
            update: {},
            create: { userId: user.id, productId: product3.id, rating: 4, title: 'Класика!', comment: 'Виглядають стильно, але для бігу краще інші моделі.', isApproved: true },
        });
    }
    console.log('✅ Reviews created');
    console.log('🎉 Seeding completed!');
    console.log('');
    console.log('📧 Admin:    admin@brendbless.com / admin123');
    console.log('📧 User:     test@brendbless.com / user123');
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map