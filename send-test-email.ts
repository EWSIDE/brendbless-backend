import { sendVerificationEmail } from './src/services/email.service';

async function main() {
  console.log('Sending test email...');
  await sendVerificationEmail(
    'stepanovsevastan0@gmail.com',
    'http://localhost:3000/verify-email?token=TEST123456789&email=stepanovsevastan0@gmail.com'
  );
  console.log('Test email sent!');
}

main().catch(console.error);
