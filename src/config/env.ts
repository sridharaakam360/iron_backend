import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRE_TIME: string;
  JWT_REFRESH_EXPIRE_TIME: string;
  CORS_ORIGIN: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  EMAIL_FROM: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  APP_NAME: string;
  APP_URL: string;
  ADMIN_EMAIL: string;
  MAX_FILE_SIZE: number;
  LOG_LEVEL: string;
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    console.warn(`Warning: Environment variable ${key} is not set`);
    return '';
  }
  return value;
};

export const env: EnvConfig = {
  NODE_ENV: getEnvVariable('NODE_ENV', 'development'),
  PORT: parseInt(getEnvVariable('PORT', '5000'), 10),
  API_VERSION: getEnvVariable('API_VERSION', 'v1'),
  DATABASE_URL: getEnvVariable('DATABASE_URL'),
  JWT_SECRET: getEnvVariable('JWT_SECRET'),
  JWT_REFRESH_SECRET: getEnvVariable('JWT_REFRESH_SECRET'),
  JWT_EXPIRE_TIME: getEnvVariable('JWT_EXPIRE_TIME', '24h'),
  JWT_REFRESH_EXPIRE_TIME: getEnvVariable('JWT_REFRESH_EXPIRE_TIME', '7d'),
  CORS_ORIGIN: getEnvVariable('CORS_ORIGIN', 'http://localhost:5173'),
  TWILIO_ACCOUNT_SID: getEnvVariable('TWILIO_ACCOUNT_SID', ''),
  TWILIO_AUTH_TOKEN: getEnvVariable('TWILIO_AUTH_TOKEN', ''),
  TWILIO_PHONE_NUMBER: getEnvVariable('TWILIO_PHONE_NUMBER', ''),
  SMTP_HOST: getEnvVariable('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: parseInt(getEnvVariable('SMTP_PORT', '587'), 10),
  SMTP_SECURE: getEnvVariable('SMTP_SECURE', 'false') === 'true',
  SMTP_USER: getEnvVariable('SMTP_USER', ''),
  SMTP_PASS: getEnvVariable('SMTP_PASS', ''),
  EMAIL_FROM: getEnvVariable('EMAIL_FROM', 'IronPress <noreply@ironpress.com>'),
  RATE_LIMIT_WINDOW_MS: parseInt(getEnvVariable('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(getEnvVariable('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  APP_NAME: getEnvVariable('APP_NAME', 'IronPress'),
  APP_URL: getEnvVariable('APP_URL', 'http://localhost:5173'),
  ADMIN_EMAIL: getEnvVariable('ADMIN_EMAIL', 'admin@ironpress.com'),
  MAX_FILE_SIZE: parseInt(getEnvVariable('MAX_FILE_SIZE', '5242880'), 10),
  LOG_LEVEL: getEnvVariable('LOG_LEVEL', 'info'),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
