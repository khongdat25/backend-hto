import { registerAs } from '@nestjs/config';

const DEFAULT_PORT = 8080;
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://hubportal-eight.vercel.app',
];

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? process.env.CONTAINER_PORT ?? DEFAULT_PORT),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
}));

function parseCorsOrigins(value?: string): string[] {
  const origins = value ? value.split(',') : DEFAULT_CORS_ORIGINS;

  return Array.from(
    new Set(
      origins
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    ),
  );
}
