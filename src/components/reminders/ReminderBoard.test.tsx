import ReminderBoard, { ReminderPanelDateTime } from "./ReminderBoard";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import MockedSocket from "socket.io-mock";
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns/format";
import mockdate from "mockdate";

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
    mockdate.set("2024-01-16T17:00:00.000Z");
  });

  afterEach(() => {
    // Clear all mocks between tests
    jest.resetAllMocks();
    mockdate.reset();
  });

  test("Render participant ReminderBoard component", async () => {
    render(<ReminderBoard />);

    // Since this isn't a built-in action, we need to wrap it in act()
    act(() => {
      socket.emit("ReminderSend", [
        {
          id: 1,
          title: "Reminder 1",
          description: "",
          start_time: new Date(),
          end_time: null,
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Reminder 1")).toBeInTheDocument();
    });

    // Start/End time labels are not visible to participant
    expect(screen.queryAllByTestId("start-time-label")).toHaveLength(0);
    expect(screen.queryAllByTestId("end-time-label")).toHaveLength(0);
  });

  test("Render admin ReminderBoard component", async () => {
    render(<ReminderBoard admin />);

    const startTimeValue = new Date(Date.now() + 1 * 60 * 60 * 1000);
    const expectedStartTime = ReminderPanelDateTime.format(startTimeValue);

    // Since this isn't a built-in action, we need to wrap it in act()
    act(() => {
      // Inactive reminder that is scheduled for later
      socket.emit("ReminderSend", [
        {
          id: 1,
          title: "Reminder 2",
          description: "",
          start_time: startTimeValue,
          end_time: null,
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Reminder 2")).toBeInTheDocument();
    });

    // Admin should see start time
    expect(
      screen.getByText(`Start Time: ${expectedStartTime}`),
    ).toBeInTheDocument();

    // Admin should not see end time since it was not set
    expect(screen.queryAllByTestId("end-time-label")).toHaveLength(0);
  });

  test("Sending a reminder from admin without times triggers a socket message", async () => {
    render(<ReminderBoard admin />);

    const reminderTitle = "Reminder 3";

    const events = new Promise((resolve) => {
      socket.on("ReminderSend", (reminder: Reminder, callback: Function) => {
        expect(reminder).toMatchObject({
          title: reminderTitle,
          description: "",
        });
        // Modify the reminder before resolving the promise
        reminder.start_time = new Date(Date.now());
        reminder.end_time = null;

        callback(true);
        resolve(reminder);
      });
    });

    // Check that the Post button is disabled when title input is empty
    const postButton = screen.getByText("Post");
    expect(postButton).toBeDisabled();

    // Insert a title
    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: reminderTitle } });

    // Check that the Post button is enabled after inputting title and click
    expect(postButton).toBeEnabled();
    fireEvent.click(postButton);

    // Make sure the message was received by the server
    const reminder = await events;
    expect(reminder).toMatchObject({
      title: reminderTitle,
      description: "",
      start_time: expect.any(Date),
      end_time: null,
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveValue("");
    });
  });

  test("Send a scheduled reminder with date validation from admin", async () => {
    render(<ReminderBoard admin />);

    const reminderTitle = "Reminder 4";
    const startDateTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const endDateTime = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const events = new Promise((resolve) => {
      socket.on("ReminderSend", (reminder: Reminder, callback: Function) => {
        expect(reminder).toMatchObject({
          title: reminderTitle,
          description: "",
          start_time: startDateTime.toISOString(), // Should receive a Date
          end_time: endDateTime.toISOString(), // Should receive a Date
        });

        callback(true);
        resolve(reminder);
      });
    });

    // Check that the Post button is disabled when title input is empty
    const postButton = screen.getByText("Post");
    expect(postButton).toBeDisabled();

    // Insert a title
    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: reminderTitle } });
    expect(postButton).toBeEnabled();

    // Set the start time
    const startTimeInput = screen.getByLabelText(
      "Start Time",
    ) as HTMLInputElement;

    // Earlier start time disables post button
    let startTimeInputValue = format(
      new Date(Date.now() - 1 * 60 * 60 * 1000),
      "MM/dd/yyyy hh:mm a",
    );
    await userEvent.type(startTimeInput, startTimeInputValue);
    expect(postButton).toBeDisabled();
    expect(
      screen.getByText("Please select a date time in the future"),
    ).toBeInTheDocument();

    // Later start time enables post button
    startTimeInputValue = format(startDateTime, "MM/dd/yyyy hh:mm a");
    await userEvent.type(startTimeInput, startTimeInputValue);
    expect(startTimeInput.value).toBe(startTimeInputValue);
    expect(
      screen.queryByText("Please select a date time in the future"),
    ).toBeNull();
    expect(postButton).toBeEnabled();

    // Set the end time
    const endTimeInput = screen.getByLabelText("End Time") as HTMLInputElement;

    // End time earlier than start time disables post button
    let endTimeInputValue = format(
      new Date(Date.now() + 1 * 60 * 60 * 1000),
      "MM/dd/yyyy hh:mm a",
    );
    await userEvent.type(endTimeInput, endTimeInputValue);
    expect(endTimeInput.value).toBe(endTimeInputValue);
    expect(postButton).toBeDisabled();

    // End time later than start time enables post button
    endTimeInputValue = format(endDateTime, "MM/dd/yyyy hh:mm a");
    await userEvent.type(endTimeInput, endTimeInputValue);
    expect(endTimeInput.value).toBe(endTimeInputValue);
    expect(postButton).toBeEnabled();

    // Check that the Post button is enabled after inputting title and click
    expect(postButton).toBeEnabled();
    fireEvent.click(postButton);

    // Make sure the message was received by the server
    const reminder = await events;
    expect(reminder).toMatchObject({
      title: reminderTitle,
      description: "",
      start_time: expect.any(String),
      end_time: expect.any(String),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveValue("");
    });
  });
});
