/**
 * @jest-environment node
 *
 * These are exclusively server-side tests and so we use the Node environment
 * for server-side tests to avoid loading browser libraries
 */
import { knex } from "@/knex/knex";

describe("Polling server-side integration tests", () => {
  beforeAll(() => {
    // Ensure test database is initialized before an tests
    return knex.migrate.rollback().then(() => knex.migrate.latest());
  }, 10000);

  afterAll(() => {
    // To prevent a warning message from jest about a process failing to exit
    // gracefully, we explicitly destroy the knex connection pool
    return knex.destroy();
  });

  beforeEach(() => {
    // Reset contents of the test database
    return knex.seed.run();
  });

  test("Placeholder", () => {
    expect(true).toBe(true);
  });
});
