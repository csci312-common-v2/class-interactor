import { render, screen, fireEvent } from "@testing-library/react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import MockedSocket from "socket.io-mock";
import GraspGauge from "./GraspGauge";

type MockedSocket = typeof MockedSocket;

// Mock the socket context used to obtain the client socket
vi.mock("../contexts/socket/useSocketContext");

// Create mocked type needed by TypeScript
const mockedUseSocketContext = vi.mocked(useSocketContext);

describe("GraspGauge", () => {
  let socket: MockedSocket;

  beforeEach(() => {
    socket = new MockedSocket();
    mockedUseSocketContext.mockReturnValue(socket.socketClient);
    vi.setSystemTime(new Date("2024-01-16T17:00:00.000Z"));
  });

  afterEach(() => {
    // Clear all mocks between tests
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  test("Render participant GraspGauge component", async () => {
    render(<GraspGauge />);

    // Renders the correct number of toggle buttons
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  test("Grasp click triggers socket message", async () => {
    render(<GraspGauge />);

    const events = new Promise((resolve) => {
      socket.on("GraspReactionSend", (graspReaction: GraspReaction) => {
        expect(graspReaction).toMatchObject({
          level: "good",
          sent_at: "2024-01-16T17:00:00.000Z",
        });
        resolve(graspReaction);
      });
    });

    // Simulate a button click on 'good' button
    fireEvent.click(screen.getAllByRole("button")[0]);

    // Make sure the message was received by the server
    await events;
  });
});
