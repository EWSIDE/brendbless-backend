import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'support@brandbless.ru';
  const passwordHash = '$2b$10$K.0HVPXaHqLVqJ5Z5Z5Z5uK5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z';
  
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  
  if (existing) {
    // Update role to admin
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });
    console.log(`✓ ${email} теперь ADMIN`);
  } else {
    console.log(`❌ Пользователь ${email} не найден. Нужно сначала зарегистрироваться.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
