import nodemailer from 'nodemailer';

const config = {
  host: process.env.SMTP_HOST || 'smtp.mail.ru',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'support@brandbless.ru',
    pass: process.env.SMTP_PASS || 'DBMyjhL5zj7wLZlGKhvV',
  },
};

const transporter = nodemailer.createTransport(config);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const mailOptions = {
    from: `"bless" <${config.auth.user}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
}

// Стили, вдохновленные скриншотом: светло-розовый фон, lowercase, Inter
const commonStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  
  body { 
    margin: 0; 
    padding: 0; 
    width: 100% !important; 
    background-color: #fff5f8; 
    -webkit-text-size-adjust: 100%; 
    -ms-text-size-adjust: 100%; 
  }
  
  * { 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    text-transform: lowercase; 
  }

  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  
  .main-card {
    background-color: #ffffff;
    border: 1px solid #fce7f3;
    border-radius: 48px !important;
  }

  .btn-primary {
    background-color: #f1a7c4;
    color: #ffffff !important;
    text-decoration: none;
    border-radius: 40px;
    padding: 20px 40px;
    display: inline-block;
    font-weight: 500;
    font-size: 16px;
  }

  @media screen and (max-width: 600px) {
    .email-container { width: 95% !important; }
    .content-padding { padding: 40px 24px !important; }
  }
`;

/**
 * Письмо для подтверждения e-mail
 */
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string
): Promise<void> {
  const verificationCode = verificationUrl.split('token=')[1]?.substring(0, 6).toLowerCase() || 'bless';
  
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${commonStyles}</style>
</head>
<body style="background-color: #fff5f8; padding: 40px 0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table class="email-container main-card" border="0" cellpadding="0" cellspacing="0" width="440" style="width: 440px; max-width: 90%;">
          <tr>
            <td class="content-padding" style="padding: 60px 40px;">
              
              <!-- Header -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 24px; color: #333333; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">вход</h1>
                  </td>
                  <td align="right" valign="top">
                    <span style="border: 1px solid #fce7f3; color: #f1a7c4; padding: 4px 12px; border-radius: 20px; font-size: 13px;">email</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 48px; color: #8e8e8e; font-size: 16px; line-height: 1.5; text-transform: lowercase;">
                войди, чтобы подтвердить регистрацию и начать пользоваться сервисом.
              </p>

              <!-- Code Box -->
              <div style="background-color: #fff9fb; border: 1px solid #fdf2f8; border-radius: 24px; padding: 32px; margin-bottom: 32px; text-align: center;">
                <span style="color: #f1a7c4; font-size: 32px; font-weight: 600; letter-spacing: 4px;">${verificationCode}</span>
              </div>

              <!-- Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" class="btn-primary" style="width: 100%; text-align: center; box-sizing: border-box;">войти</a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <div style="margin-top: 48px; text-align: center;">
                <p style="color: #d1d1d1; font-size: 12px;">если это были не вы, просто проигнорируйте это письмо</p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({ to: email, subject: 'вход — bless', html });
}

/**
 * Письмо для сброса пароля
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${commonStyles}</style>
</head>
<body style="background-color: #fff5f8; padding: 40px 0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table class="email-container main-card" border="0" cellpadding="0" cellspacing="0" width="440" style="width: 440px; max-width: 90%;">
          <tr>
            <td class="content-padding" style="padding: 60px 40px;">
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 24px; color: #333333; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">пароль</h1>
                  </td>
                  <td align="right" valign="top">
                    <span style="border: 1px solid #fce7f3; color: #f1a7c4; padding: 4px 12px; border-radius: 20px; font-size: 13px;">reset</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 48px; color: #8e8e8e; font-size: 16px; line-height: 1.5;">
                нажмите на кнопку ниже, чтобы установить новый пароль для вашего аккаунта.
              </p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" class="btn-primary" style="width: 100%; text-align: center; box-sizing: border-box;">изменить пароль</a>
                  </td>
                </tr>
              </table>

              <div style="margin-top: 40px; border-top: 1px solid #fdf2f8; padding-top: 24px;">
                <p style="color: #f1a7c4; font-size: 11px; word-break: break-all; opacity: 0.6;">${resetUrl}</p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({ to: email, subject: 'сброс пароля — bless', html });
}
