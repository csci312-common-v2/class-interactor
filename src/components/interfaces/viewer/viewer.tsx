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

    socket.on("PollStart", ({ id }) => {
      setPollId(id);
      setPollVisible(true);
    });

    socket.on("PollEnd", () => {
      setPollId(null);
      setPollVisible(false);
    });

    socket.on("PollToggle", () => {
      // Ensure the toggle is based on the current value
      setPollVisible((prevVisible) => !prevVisible);
    });
  }, [socket]);

  // If we need to use ChromaKey...
  // background: "rgb(0, 177, 64)",

  return (
    <Box
      sx={{
        height: "100vh",
      }}
    >
      {pollId && pollVisible && <PositionedPoll pollId={pollId} />}
      <ReactionDisplay />
    </Box>
  );
};

export default Viewer;
