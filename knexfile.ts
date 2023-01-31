import type { Knex } from "knex";
import { loadEnvConfig } from '@next/env';

// Adapted from NextJS knex example
const dev = process.env.NODE_ENV !== 'production'
const { DATABASE_URL } = loadEnvConfig('./', dev).combinedEnv

const defaultSettings = {
  migrations: {
    directory: './knex/migrations',
  },
  seeds: {
    directory: './knex/seeds',
  },
};

const config: { [key: string]: Knex.Config } = {
  test: {
    ...defaultSettings,
    client: 'sqlite3',
    connection: ":memory:",
    useNullAsDefault: true,
    seeds: {
      directory: './seeds/test'
    }
  },

  development: {
    ...defaultSettings,
    client: 'sqlite3',
    connection: {
      filename: './interactor.db'
    },
    useNullAsDefault: true
  },

  production: {
    ...defaultSettings,
    client: 'pg',
    connection: {
      connectionString: DATABASE_URL,
      ssl: true
    }
  }
};

export default config;
