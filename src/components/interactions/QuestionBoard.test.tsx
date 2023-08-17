import QuestionBoard from "./QuestionBoard";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import MockedSocket from "socket.io-mock";
type MockedSocket = typeof MockedSocket;

// Mock the socket context used to obtain the client socket
jest.mock("../contexts/socket/useSocketContext");

// Create mocked type needed by TypeScript
const mockedUseSocketContext = jest.mocked(useSocketContext);

describe("Question board", () => {
  let socket: MockedSocket;

  beforeEach(() => {
    socket = new MockedSocket();
    mockedUseSocketContext.mockReturnValue(socket.socketClient);
  });

  afterEach(() => {
    // Clear all mocks between tests
    jest.resetAllMocks();
  });

  test("Render QuestionBoard component", async () => {
    render(<QuestionBoard />);

    // Since this isn't a built-in action, we need to wrap it in act()
    act(() => {
      socket.emit("QuestionNew", [
        {
          id: 1,
          question: "Question 1",
          anonymous: true,
          approved: true,
          votes: 5,
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Question 1")).toBeInTheDocument();
    });
  });

  test("Asking a question triggers a socket message", async () => {
    render(<QuestionBoard />);

    const events = new Promise((resolve) => {
      socket.on("QuestionAsk", (question: Question, callback: Function) => {
        expect(question).toMatchObject({
          question: "Question 2",
          anonymous: true, // All questions are anonymous till we have accounts
        });
        callback(true);
        resolve(question);
      });
    });

    // Fill the form and submit the new question
    const question_input = screen.getByLabelText("Ask a question");
    fireEvent.change(question_input, { target: { value: "Question 2" } });
    fireEvent.click(screen.getByText("Ask"));

    // Make sure the message was received by the server
    await events;

    await waitFor(() => {
      expect(screen.getByLabelText("Ask a question")).toHaveValue("");
    });
  });
});
