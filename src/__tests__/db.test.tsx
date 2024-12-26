/**
 * @vitest-environment node
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

  describe("Test specific models", () => {
    beforeAll(() => {
      // Ensure test database is initialized before an tests
      return knex.migrate.rollback().then(() => knex.migrate.latest());
    }, 20000);

    beforeEach(() => {
      // Reset contents of the test database
      return knex.seed.run();
    });

    test("Can create a reminder with a long description", async () => {
      const [{ id: roomId }] = await knex("Room")
        .select("id")
        .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");

      const reminder = {
        roomId,
        title: "Test Reminder",
        description: "This is a long description".repeat(100),
        start_time: new Date(Date.now() - 1 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 1 * 60 * 60 * 1000),
      };

      const [id] = await knex("Reminder").insert(reminder).returning("id");
      expect(id).toBeDefined();
    });

    test("Can create a long question", async () => {
      const [{ id: roomId }] = await knex("Room")
        .select("id")
        .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1");

      const question = {
        roomId,
        question: "This is a long question".repeat(100),
        anonymous: true,
      };

      const [id] = await knex("Question").insert(question).returning("id");
      expect(id).toBeDefined();
    });
  });
});
