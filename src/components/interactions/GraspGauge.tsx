import { useState } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import { Box, Typography } from "@mui/material";
import useThrottle from "@/hooks/useThrottle";

interface GraspReaction {
  level: string;
  emoji: string;
}

const graspReactions: GraspReaction[] = [
  { level: "Good", emoji: "😌" },
  { level: "Unsure", emoji: "🤨" },
  { level: "Lost", emoji: "😳" },
];

const GraspGauge = () => {
  const socket = useSocketContext();
  const [currentGrasp, setCurrentGrasp] = useState<GraspReaction | null>(null);
  const [throttledValue, isDisabled] = useThrottle(currentGrasp, 3000);

  const handleGraspChange = (
    _event: React.MouseEvent<HTMLElement>,
    updatedGrasp: GraspReaction | null,
  ) => {
    setCurrentGrasp(updatedGrasp);
    if (socket && updatedGrasp) {
      socket.emit(
        "GraspReactionSend",
        {
          level: updatedGrasp.level.toLowerCase(),
          sent_at: new Date(),
        },
        (success: boolean) => {
          if (success) {
            // Immediately reset selection to setup for new selection
            setCurrentGrasp(null);
          }
        },
      );
    }
  };

  const handleGraspClick = (
    event: React.MouseEvent<HTMLElement>,
    codePoint?: number,
  ) => {
    if (socket && codePoint) {
      socket.emit("ReactionSend", codePoint);
    }
  };

  return (
    <Box my={2}>
      <Typography variant="h6">Grasp Gauge</Typography>
      <ToggleButtonGroup
        exclusive
        disabled={isDisabled === true || false}
        value={currentGrasp}
        onChange={handleGraspChange}
      >
        {graspReactions.map((gr) => (
          <ToggleButton
            sx={{ p: 1, minWidth: 0 }}
            key={gr.emoji.codePointAt(0)}
            value={gr}
            onClick={(e) => handleGraspClick(e, gr.emoji.codePointAt(0))}
          >
            {gr.emoji} {gr.level}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default GraspGauge;
