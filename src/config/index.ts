/**
 * Nexus Compliance Engine - Configuration
 */

import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('9300'),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().optional(),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().default('5432'),
  POSTGRES_DB: z.string().default('nexus'),
  POSTGRES_USER: z.string().default('nexus'),
  POSTGRES_PASSWORD: z.string().default('nexus'),
  POSTGRES_SSL: z.string().default('false'),

  // Nexus Services
  NEXUS_GRAPHRAG_URL: z.string().default('http://nexus-graphrag:9000'),
  NEXUS_MAGEAGENT_URL: z.string().default('http://nexus-mageagent:9001'),

  // AI Configuration
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-4-20250514'),
  AI_MAX_TOKENS: z.string().default('4096'),

  // Plugin Metadata
  NEXUS_PLUGIN_ID: z.string().optional(),
  NEXUS_PLUGIN_VERSION: z.string().default('1.0.0'),
  NEXUS_BUILD_ID: z.string().optional(),
  NEXUS_BUILD_TIMESTAMP: z.string().optional(),
  NEXUS_GIT_COMMIT: z.string().optional(),

  // Feature Flags
  ENABLE_AI_ASSESSMENT: z.string().default('true'),
  ENABLE_CONTINUOUS_MONITORING: z.string().default('true'),
  ENABLE_REPORT_GENERATION: z.string().default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('60'),

  // Report Storage
  REPORT_STORAGE_PATH: z.string().default('/data/reports'),
  REPORT_RETENTION_DAYS: z.string().default('90'),

  // Logging
  LOG_LEVEL: z.string().default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment validation failed:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

const env = parseEnv();

export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  database: {
    connectionString: env.DATABASE_URL ??
      `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
    host: env.POSTGRES_HOST,
    port: parseInt(env.POSTGRES_PORT, 10),
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    ssl: env.POSTGRES_SSL === 'true',
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
    },
  },

  nexusServices: {
    graphragUrl: env.NEXUS_GRAPHRAG_URL,
    mageagentUrl: env.NEXUS_MAGEAGENT_URL,
  },

  ai: {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.AI_MODEL,
    maxTokens: parseInt(env.AI_MAX_TOKENS, 10),
    enabled: env.ENABLE_AI_ASSESSMENT === 'true' && !!env.ANTHROPIC_API_KEY,
  },

  plugin: {
    id: env.NEXUS_PLUGIN_ID,
    version: env.NEXUS_PLUGIN_VERSION,
    buildId: env.NEXUS_BUILD_ID,
    buildTimestamp: env.NEXUS_BUILD_TIMESTAMP,
    gitCommit: env.NEXUS_GIT_COMMIT,
  },

  features: {
    aiAssessment: env.ENABLE_AI_ASSESSMENT === 'true',
    continuousMonitoring: env.ENABLE_CONTINUOUS_MONITORING === 'true',
    reportGeneration: env.ENABLE_REPORT_GENERATION === 'true',
  },

  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },

  reports: {
    storagePath: env.REPORT_STORAGE_PATH,
    retentionDays: parseInt(env.REPORT_RETENTION_DAYS, 10),
  },

  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
} as const;

export type Config = typeof config;
