import nodemailer from 'nodemailer';

async function sendTestEmail() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
      user: 'support@brandbless.ru',
      pass: 'DBMyjhL5zj7wLZlGKhvV',
    },
  });

  try {
    await transporter.sendMail({
      from: '"BRENDBLESS" <support@brandbless.ru>',
      to: 'stepanovsevastan0@gmail.com',
      subject: 'Тестовое письмо с BRENDBLESS',
      html: `
        <h1>Тест</h1>
        <p>Это тестовое письмо с сайта BRENDBLESS</p>
        <p>Если вы видите это письмо - значит email работает!</p>
      `,
    });
    console.log('✅ Письмо успешно отправлено!');
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
  }
}

sendTestEmail();
