import { registerAs } from '@nestjs/config';

const DEFAULT_PORT = 8080;

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? process.env.CONTAINER_PORT ?? DEFAULT_PORT),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
}));

function parseCorsOrigins(value?: string): string[] {
  if (!value) {
    return ['http://localhost:3000', 'http://localhost:5173', 'https://frontend-hto.vercel.app/' ];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
