import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  console.log('Products in DB:', count);
  
  const products = await prisma.product.findMany({ 
    take: 5, 
    select: { id: true, name: true } 
  });
  console.log('Sample products:', products);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
