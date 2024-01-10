/**
 * @jest-environment node
 *
 * Use Node environment for server-side tests to avoid loading browser libraries.
 * This needs to be the top comment in the file
 */
import { getServerSession } from "next-auth/next";
import { testApiHandler } from "next-test-api-route-handler";
import { knex } from "../knex/knex";
import roomsEndpoint from "../pages/api/rooms/index";

jest.mock("next-auth/next");
const mockedGetServerSession = jest.mocked(getServerSession);

describe("Class Interactor API", () => {
  beforeAll(
    () =>
      // Ensure test database is initialized before an tests
      knex.migrate.rollback().then(() => knex.migrate.latest()),
    20000,
  );

  afterAll(() =>
    // Ensure database connection is cleaned up after all tests
    knex.destroy(),
  );

  beforeEach(() => {
    // Mock nex-auth getServerSession with id of test user
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: 1,
      },
    });
    // Reset contents of the test database
    return knex.seed.run();
  });

  afterEach(() => {
    mockedGetServerSession.mockReset();
  });

  describe("POST /api/rooms operations", () => {
    test("Should create a new room", async () => {
      const newRoom = {
        name: "DEMO150",
      };

      await testApiHandler({
        rejectOnHandlerError: true,
        handler: roomsEndpoint,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(newRoom),
          });
          expect(res.status).toBe(200);
          const resArticle = await res.json();
          expect(resArticle).toMatchObject({
            ...newRoom,
            id: expect.any(String), // More specifically, this should be a UUID
          });
        },
      });
    });
  });
});
