import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/life_tracker',
  jwtSecret: process.env.JWT_SECRET ?? 'super_secret_jwt_access_key_change_me_in_production_32char',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  appUrl: process.env.APP_URL ?? 'http://localhost:5001',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  cookieSecure: process.env.NODE_ENV === 'production',
};
