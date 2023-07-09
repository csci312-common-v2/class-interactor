import React, { useEffect, useState } from "react";
import { useSocketContext } from "@/components/contexts/socket/useSocketContext";
import Box from "@mui/material/Box";
import Poll from "@/components/interactions/Poll";
import ReactionDisplay from "@/components/interactions/ReactionDisplay";

const PositionedPoll = ({ pollId }: { pollId: string }) => {
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        right: 0,
        background: "rgb(255, 255, 255)",
        border: 2,
        borderRadius: 1,
        m: 1,
        p: 1,
        minWidth: 200,
      }}
    >
      <Poll id={pollId} />
    </Box>
  );
};

const Viewer = () => {
  const socket = useSocketContext();
  const [pollId, setPollId] = useState<string | null>(null);
  const [pollVisible, setPollVisible] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onPollStart = ({ id }: { id: string }) => {
      setPollId(id);
      setPollVisible(true);
    };
    const onPollEnd = () => {
      setPollId(null);
      setPollVisible(false);
    };
    const onPollToggle = () => {
      // Ensure the toggle is based on the current value
      setPollVisible((prevVisible) => !prevVisible);
    };

    socket.on("PollStart", onPollStart);
    socket.on("PollEnd", onPollEnd);
    socket.on("PollToggle", onPollToggle);

    return () => {
      socket.off("PollStart", onPollStart);
      socket.off("PollEnd", onPollEnd);
      socket.off("PollToggle", onPollToggle);
    };
  }, [socket]);

  // If we need to use ChromaKey...
  // background: "rgb(0, 177, 64)",

  return (
    <Box
      sx={{
        height: "100vh",
      }}
    >
      {pollId && pollVisible && <PositionedPoll key={pollId} pollId={pollId} />}
      <ReactionDisplay />
    </Box>
  );
};

export default Viewer;
