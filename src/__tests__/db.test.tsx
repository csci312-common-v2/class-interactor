/**
 * @jest-environment node
 *
 * Use Node environment for server-side tests to avoid loading browser libraries.
 * This needs to be the top comment in the file
 */
import { knex } from "../knex/knex";

describe("Database operations", () => {
  afterAll(() =>
    // Ensure database connection is cleaned up after all tests
    knex.destroy(),
  );

  test(
    "Can migrate and rollback",
    () =>
      knex.migrate
        .rollback(undefined, true)
        .then(() => knex.migrate.latest())
        .then(() => knex.migrate.rollback(undefined, true)),
    20000,
  );
});
