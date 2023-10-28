/**
 * @jest-environment node
 *
 * These are exclusively server-side tests and so we use the Node environment
 * for server-side tests to avoid loading browser libraries
 */

import { knex } from "@/knex/knex";
import Room from "@/models/Room";

describe("Server-side room API testing", () => {
  beforeAll(() => {
    // Ensure test database is initialized before an tests
    return knex.migrate.rollback().then(() => knex.migrate.latest());

    // We need to extend the timeout since we are starting containers with the database server
  }, 20000);

  afterAll(async () => {
    // To prevent a warning message from jest about a process failing to exit
    // gracefully, we explicitly destroy the knex connection pool. Note we will
    // get an abort error if any subsequent queries are attempted after this point.
    await knex.destroy();
  });

  beforeEach(() => {
    // Reset contents of the test database
    return knex.seed.run();
  });

  test("Get all users associated with a room", async () => {
    const rooms = await Room.query()
      .where("visibleId", "a418c099-4114-4c55-8a5b-4a142c2b26d1")
      .withGraphFetched("users");
    expect(rooms).toHaveLength(1);

    const [room] = rooms;
    expect(room.users).toHaveLength(1);
    expect(room.users[0]).toMatchObject({
      role: "administrator",
    });
  });
});
