import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT ?? 587),
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
  fromName: process.env.MAIL_FROM_NAME ?? 'HITO CRM',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));
