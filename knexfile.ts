import type { Knex } from "knex";
import { loadEnvConfig } from "@next/env";

import fs from "node:fs/promises";
import path from "node:path";

// The knex APIs don't seem to be transforming TS migrations/seeds so we use custom sources to
// import them in this setting. Adapted from: https://github.com/knex/knex/issues/5323#issuecomment-2416136095
class CustomFSSource<T> {
  directory: string;

  constructor(directory: string) {
    this.directory = path.join(process.cwd(), directory);
  }

  async getFiles(_loadExtensions: readonly string[]): Promise<string[]> {
    const dirents = await fs.readdir(this.directory, {
      withFileTypes: true,
    });
    return dirents
      .filter(
        (dirent) =>
          dirent.isFile() &&
          _loadExtensions.includes(path.extname(dirent.name)),
      )
      .map((dirent) => dirent.name)
      .sort();
  }

  async getFile(filename: string): Promise<T> {
    // Since these imports are only used in the test setting we don't need Webpack to process them. This annotation
    // prevents Critical dependency: the request of a dependency is an expression warnings from NextJS
    // https://github.com/webpack/webpack/issues/6486#issuecomment-387054541
    return await import(
      /* webpackIgnore: true */ path.join(this.directory, filename)
    );
  }
}

class TestMigrationSource
  extends CustomFSSource<Knex.Migration>
  implements Knex.MigrationSource<string>
{
  async getMigrations(_loadExtensions: readonly string[]): Promise<string[]> {
    return this.getFiles(_loadExtensions);
  }

  getMigrationName(migration: string): string {
    return migration;
  }

  async getMigration(migration: string): Promise<Knex.Migration> {
    return this.getFile(migration);
  }
}

class TestSeedSource
  extends CustomFSSource<Knex.Seed>
  implements Knex.SeedSource<string>
{
  async getSeeds(config: Knex.SeederConfig): Promise<string[]> {
    return this.getFiles(config.loadExtensions || []);
  }

  async getSeed(seed: string): Promise<Knex.Seed> {
    return this.getFile(seed);
  }
}

// Adapted from NextJS knex example
const dev = process.env.NODE_ENV !== "production";
const { DATABASE_URL } = loadEnvConfig("./", dev).combinedEnv;

const defaultSettings = {
  migrations: {
    directory: "./src/knex/migrations",
  },
  seeds: {
    directory: "./src/knex/seeds",
  },
};

const config: { [key: string]: Knex.Config } = {
  test: {
    ...defaultSettings,
    client: "pg",
    connection: async () => {
      // Only import testcontainers when running in a test environment
      const { PostgreSqlContainer } = await import(
        "@testcontainers/postgresql"
      );

      // Create a new container for each connection, i.e., for each test file
      // being run in parallel. These containers are automatically cleaned up
      // by test containers via its ryuk resource reaper.
      const container = await new PostgreSqlContainer("postgres:15").start();
      return {
        host: container.getHost(),
        port: container.getPort(),
        database: container.getDatabase(),
        user: container.getUsername(),
        password: container.getPassword(),
      };
    },
    migrations: {
      // Note: If any of  "directory", "sortDirsSeparately" or "loadExtensions" is defined. knex will ignore the custom migration source
      migrationSource: new TestMigrationSource("./src/knex/migrations"),
    },
    seeds: {
      seedSource: new TestSeedSource("./src/knex/seeds/test"),
    },
  },

  development: {
    ...defaultSettings,
    client: "pg",
    connection: {
      connectionString: DATABASE_URL,
    },
  },

  production: {
    ...defaultSettings,
    client: "pg",
    connection: {
      connectionString: DATABASE_URL,
      ssl: true,
    },
  },
};

export default config;
