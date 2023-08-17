import Poll from "./Poll";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import MockedSocket from "socket.io-mock";
import exp from "constants";
type MockedSocket = typeof MockedSocket;

// Mock the socket context used to obtain the client socket
jest.mock("../contexts/socket/useSocketContext");

// Create mocked type needed by TypeScript
const mockedUseSocketContext = jest.mocked(useSocketContext);

describe("Polling", () => {
  let socket: MockedSocket;

  beforeEach(() => {
    socket = new MockedSocket();
    mockedUseSocketContext.mockReturnValue(socket.socketClient);
  });

  afterEach(() => {
    // Clear all mocks between tests
    jest.resetAllMocks();
  });

  describe("Participant polling interface", () => {
    test.each([[1], [null]])("Poll with id (%d) is (in)active", async (id) => {
      render(<Poll id={id} />);
      const options = screen.getAllByRole("button");
      expect(options).toHaveLength(5);
      ["A", "B", "C", "D", "E"].forEach((label, index) => {
        expect(options[index]).toHaveTextContent(label);
        if (id === null) {
          expect(options[index]).toBeDisabled();
        } else {
          expect(options[index]).not.toBeDisabled();
        }
      });
    });

    test("Clicking an option triggers a socket message", async () => {
      render(<Poll id={2} />);

      const new_click_events = new Promise((resolve) => {
        socket.on(
          "PollResponse",
          (response: { id: number; newChoice: string }, callback: Function) => {
            expect(response).toMatchObject({
              id: 2,
              newChoice: "E",
            });
            callback({ choice: "E" });
            resolve(response);
          }
        );
      });

      // Submit a new poll response
      fireEvent.click(screen.getByRole("button", { name: "E" }));

      // Make sure the message was received by the server and button shows as pressed
      await new_click_events;
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "E" })).toHaveAttribute(
          "aria-pressed",
          "true"
        );
      });

      const change_click_events = new Promise((resolve) => {
        socket
          .off("PollResponse")
          .on(
            "PollResponse",
            (
              response: { id: number; newChoice: string },
              callback: Function
            ) => {
              expect(response).toMatchObject({
                id: 2,
                prevChoice: "E",
                newChoice: "C",
              });
              callback({ choice: "C" });
              resolve(response);
            }
          );
      });

      // Change poll response
      fireEvent.click(screen.getByRole("button", { name: "C" }));

      // Make sure the update message was received by the server and new button shows as pressed
      await change_click_events;
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "C" })).toHaveAttribute(
          "aria-pressed",
          "true"
        );
      });
      expect(screen.getByRole("button", { name: "E" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });
  });
});
