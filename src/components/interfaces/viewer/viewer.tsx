import React, { useEffect, useState } from "react";
import { useSocketContext } from "@/components/contexts/socket/useSocketContext";
import Box from "@mui/material/Box";
import Poll from "@/components/interactions/Poll";
import GraspGaugeGraph from "@/components/interactions/GraspGaugeGraph";
import ReactionDisplay from "@/components/interactions/ReactionDisplay";

const PositionedPoll = ({ pollId }: { pollId: number }) => {
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

const PostionedGraspGuageGraph = () => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        right: 0,
        background: "rgb(255, 255, 255)",
        border: 2,
        borderRadius: 1,
        m: 1,
        p: 1,
        minWidth: 200,
      }}
    >
      <GraspGaugeGraph interval={5 * 1000} />
    </Box>
  );
};

const Viewer = () => {
  const socket = useSocketContext();

  const [pollId, setPollId] = useState<number | null>(null);
  const [pollVisible, setPollVisible] = useState(false);

  const [graspGaugeVisible, setGraspGaugeVisible] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onPollStart = ({ id }: { id: number }) => {
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

    const onGraspGaugeToggle = () => {
      setGraspGaugeVisible((prevVisible) => !prevVisible);
    };

    socket.on("PollStart", onPollStart);
    socket.on("PollEnd", onPollEnd);
    socket.on("PollToggle", onPollToggle);
    socket.on("GraspReactionToggle", onGraspGaugeToggle);

    return () => {
      socket.off("PollStart", onPollStart);
      socket.off("PollEnd", onPollEnd);
      socket.off("PollToggle", onPollToggle);
      socket.off("GraspReactionToggle", onGraspGaugeToggle);
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
      {graspGaugeVisible && <PostionedGraspGuageGraph />}
      {pollId && pollVisible && <PositionedPoll key={pollId} pollId={pollId} />}
      <ReactionDisplay />
    </Box>
  );
};

export default Viewer;
