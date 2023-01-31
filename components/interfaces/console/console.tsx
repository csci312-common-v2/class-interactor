import { useSocketContext } from "../../contexts/socket/useSocketContext";
import React, { useEffect, useState } from "react";
import Poll from "../../interactions/Poll";

interface Props {
  roomId: string;
}

const Console = ({ roomId }: Props) => {
  const socket = useSocketContext();
  const [pollId, setPollId] = useState<string | null>(null);

  // Handle state updates on reconnecting to a room
  useEffect(() => {
    if (!socket) return;

    socket.on("PollStart", ({ id }) => {
      setPollId(id);
    });

  }, [socket]);

  const launchPoll = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("PollLaunch", { roomId }, ({ id }: { id: string }) => {
        setPollId(id);
      })
    }
  };

  const revealPoll = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("PollReveal", { roomId, pollId });
    }
  };

  const endPoll = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("PollEnd", { roomId, pollId }, () => {
        setPollId(null);
      })
    }
  };

  return (
    <div>
      <h1>Control Console: {roomId}</h1>
      <button onClick={launchPoll} disabled={!socket}>Launch poll</button>
      <button onClick={revealPoll} disabled={!pollId}>Reveal poll</button>
      <button onClick={endPoll} disabled={!pollId}>End poll</button>
      {pollId && <Poll id={pollId} console />}
    </div>
  );
};

export default Console;
