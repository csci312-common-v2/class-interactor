import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import fetchMock from "@fetch-mock/jest";
import mockRouter from "next-router-mock";
import { createDynamicRouteParser } from "next-router-mock/dynamic-routes";
import NewRoom from "@/pages/rooms/new";
import { after } from "node:test";

// Mock the NextAuth package
jest.mock("next-auth/react");
const mockedUseSession = jest.mocked(useSession);

jest.mock("next/router", () => require("next-router-mock"));
// Tell the mock router about the pages we will use (so we can use dynamic routes)
mockRouter.useParser(
  createDynamicRouteParser([
    // These paths should match those found in the `/pages` folder:
    "/rooms/[...rid]",
    "/rooms/new",
  ]),
);

describe("Creating a new room", () => {
  // Setup the fetch mock
  beforeAll(() => {
    fetchMock.mockGlobal();
  });
  afterAll(() => {
    fetchMock.unmockGlobal();
  });

  afterEach(() => {
    // Clear all mocks between tests
    jest.resetAllMocks();
    fetchMock.mockReset();
  });

  test("Can create new room when logged in", async () => {
    const name = "DEMO150";

    // When rendering an individual page we can just mock useSession (in this case to
    // simulate an authenticated user)
    mockedUseSession.mockReturnValue({
      data: {
        user: { id: 1 },
        expires: new Date(Date.now() + 2 * 86400).toISOString(),
      },
      status: "authenticated",
      update: jest.fn(),
    });

    fetchMock.post("/api/rooms", () => ({
      id: "dc9eef62-be60-484b-90cb-3ef9b3ce6476",
      name,
    }));

    mockRouter.setCurrentUrl("/rooms/new");
    render(<NewRoom />);

    expect(mockedUseSession).toHaveBeenCalledWith({ required: true });
    const nameInput = screen.getByRole("textbox", {
      name: /room name/i,
    });
    fireEvent.change(nameInput, {
      target: { value: name },
    });

    const create = screen.getByRole("button", { name: /create/i });
    fireEvent.click(create);

    expect(fetchMock).toHaveFetchedTimes(1, "/api/rooms", {
      body: { name },
      method: "post",
    });

    await waitFor(() => {
      expect(mockRouter.asPath).toBe(
        `/rooms/dc9eef62-be60-484b-90cb-3ef9b3ce6476/console`,
      );
    });
  });
});
