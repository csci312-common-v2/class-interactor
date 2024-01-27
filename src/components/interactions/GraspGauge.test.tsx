import { render, screen, fireEvent } from "@testing-library/react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import MockedSocket from "socket.io-mock";
import useThrottle from "@/hooks/useThrottle";
import GraspGauge from "./GraspGauge";

type MockedSocket = typeof MockedSocket;

// Mock the socket context used to obtain the client socket
jest.mock("../contexts/socket/useSocketContext");

// Create mocked type needed by TypeScript
const mockedUseSocketContext = jest.mocked(useSocketContext);

// Mock the useThrottle hook
jest.mock("@/hooks/useThrottle");
const mockedUseThrottle = useThrottle as jest.MockedFunction<
  typeof useThrottle
>;

describe("GraspGauge", () => {
  let socket: MockedSocket;

  beforeEach(() => {
    socket = new MockedSocket();
    mockedUseSocketContext.mockReturnValue(socket.socketClient);
    mockedUseThrottle.mockReturnValue([null, false]);
  });

  afterEach(() => {
    // Clear all mocks between tests
    jest.resetAllMocks();
  });

  test("Render participant GraspGauge component", async () => {
    render(<GraspGauge />);

    // Renders the Grasp Gauge title
    expect(screen.getByText("Grasp Gauge")).toBeInTheDocument();

    // Renders the correct number of toggle buttons
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  test("ToggleButtonGroup is disabled after a button click", async () => {
    // Mock the useThrottle hook before rendering the component
    mockedUseThrottle.mockReturnValue([null, true]);

    render(<GraspGauge />);

    // Simulate a button click
    fireEvent.click(screen.getAllByRole("button")[0]);

    // Re-render the component to apply the new return value of useThrottle
    render(<GraspGauge />);

    // Check if the buttons are disabled
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
