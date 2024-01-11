import ReminderBoard from "./ReminderBoard";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import MockedSocket from "socket.io-mock";
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
type MockedSocket = typeof MockedSocket;

// Mock the socket context used to obtain the client socket
jest.mock("../contexts/socket/useSocketContext");

// Create mocked type needed by TypeScript
const mockedUseSocketContext = jest.mocked(useSocketContext);

describe("Reminder board", () => {
  let socket: MockedSocket;

  beforeEach(() => {
    socket = new MockedSocket();
    mockedUseSocketContext.mockReturnValue(socket.socketClient);
  });

  afterEach(() => {
    // Clear all mocks between tests
    jest.resetAllMocks();
  });

  test("Render ReminderBoard component", async () => {
    render(<ReminderBoard />);

    // Since this isn't a built-in action, we need to wrap it in act()
    act(() => {
      socket.emit("ReminderSend", [
        {
          id: 1,
          title: "Reminder 1",
          description: "",
          start_time: null,
          end_time: null,
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Reminder 1")).toBeInTheDocument();
    });
  });

  test("Sending a reminder from admin triggers a socket message", async () => {
    render(<ReminderBoard admin />);

    const events = new Promise((resolve) => {
      socket.on("ReminderSend", (reminder: Reminder, callback: Function) => {
        expect(reminder).toMatchObject({
          title: "Reminder 2",
          description: "",
          start_time: null,
          end_time: null,
        });
        callback(true);
        resolve(reminder);
      });
    });

    // Check that the Post button is disabled when title input is empty
    const postButton = screen.getByText("Post");
    expect(postButton).toBeDisabled();

    // Fill in the form and submit the new reminder
    const title_input = screen.getByLabelText("Title");
    fireEvent.change(title_input, { target: { value: "Reminder 2" } });

    // Check that the Post button is enabled after inputting title and click
    expect(postButton).toBeEnabled();
    fireEvent.click(postButton);

    // Make sure the message was received by the server
    await events;

    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveValue("");
    });
  });
});
