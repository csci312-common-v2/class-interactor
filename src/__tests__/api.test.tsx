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
import { getServerSideProps as consoleGetServerSideProps } from "@/pages/rooms/[rid]/console";
import type {
  GetServerSidePropsContext,
  ParsedUrlQuery,
  PreviewData,
} from "next";

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

  describe("/rooms/[rid]/console server side", () => {
    test("Should return a room for an administrator", async () => {
      const result = await consoleGetServerSideProps({
        query: {
          rid: "a418c099-4114-4c55-8a5b-4a142c2b26d1",
        },
        resolvedUrl: "/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin",
      } as unknown as GetServerSidePropsContext<ParsedUrlQuery, PreviewData>);
      expect(result).toMatchObject({
        props: {
          room: {
            id: "a418c099-4114-4c55-8a5b-4a142c2b26d1",
            name: "TestClass",
          },
          session: {
            user: {
              id: 1,
            },
          },
        },
      });
    });

    test("Should redirect to login if not authenticated", async () => {
      mockedGetServerSession.mockResolvedValue(null);
      const result = await consoleGetServerSideProps({
        query: {
          rid: "a418c099-4114-4c55-8a5b-4a142c2b26d1",
        },
        resolvedUrl: "/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin",
      } as unknown as GetServerSidePropsContext<ParsedUrlQuery, PreviewData>);
      expect(result).toMatchObject({
        redirect: {
          destination: `/api/auth/signin?${new URLSearchParams({
            error: "SessionRequired",
            callbackUrl: "/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin",
          })}`,
          permanent: false,
        },
      });
    });

    test("Should redirect to root with error if not an administrator", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: {
          id: 2,
        },
      });
      const result = await consoleGetServerSideProps({
        query: {
          rid: "a418c099-4114-4c55-8a5b-4a142c2b26d1",
        },
        resolvedUrl: "/rooms/a418c099-4114-4c55-8a5b-4a142c2b26d1/admin",
      } as unknown as GetServerSidePropsContext<ParsedUrlQuery, PreviewData>);
      expect(result).toMatchObject({
        redirect: {
          destination: `/?${new URLSearchParams({
            error: "InvalidRoom",
          })}`,
          permanent: false,
        },
      });
    });
  });
});
