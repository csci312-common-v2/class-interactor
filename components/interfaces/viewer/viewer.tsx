import React, { useEffect, useState } from "react";
import { useSocketContext } from "../../../components/contexts/socket/useSocketContext";
import Box from "@mui/material/Box";
import Poll from "../../interactions/Poll";

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

  useEffect(() => {
    if (!socket) return;

    socket.on("PollStart", ({ id }) => {
      setPollId(id);
    });

    socket.on("PollEnd", () => {
      setPollId(null);
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
      {pollId && <PositionedPoll pollId={pollId} />}
    </Box>
  );
};

export default Viewer;
