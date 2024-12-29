import { useCallback } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import { Box } from "@mui/material";
import useThrottleCallback from "@/hooks/useThrottleCallback";

const graspReactions: GraspReaction[] = [
  { level: "Good", emoji: "😌" },
  { level: "Unsure", emoji: "🤔" },
  { level: "Lost", emoji: "😳" },
];

const GraspGauge = () => {
  const socket = useSocketContext();

  const sendFeedback = useThrottleCallback(
    useCallback(
      (updatedGrasp: GraspReaction) => {
        if (socket && updatedGrasp) {
          socket.emit("ReactionSend", updatedGrasp.emoji.codePointAt(0));
          socket.emit("GraspReactionSend", {
            level: updatedGrasp.level.toLowerCase(),
            sent_at: new Date(),
          });
        }
      },
      [socket],
    ),
    5000 /* ms */,
  );

  return (
    <Box my={1}>
      <ButtonGroup variant="outlined">
        {graspReactions.map((gr) => (
          <Button
            sx={{ p: 1, minWidth: 0 }}
            key={gr.emoji.codePointAt(0)}
            onClick={() => sendFeedback(gr)}
          >
            {gr.emoji} {gr.level}
          </Button>
        ))}
      </ButtonGroup>
    </Box>
  );
};

export default GraspGauge;
