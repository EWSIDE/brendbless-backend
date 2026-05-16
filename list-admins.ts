import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, role: true }
  });
  
  console.log('Администраторы:');
  if (admins.length === 0) {
    console.log('Нет администраторов');
  } else {
    admins.forEach(a => console.log(`- ${a.email} (${a.role})`));
  }
  
  // Также покажем всех пользователей
  const users = await prisma.user.findMany({
    select: { email: true, role: true }
  });
  
  console.log('\nВсе пользователи:');
  users.forEach(u => console.log(`- ${u.email} (${u.role})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
