import { useEffect, useState } from "react";
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
  { level: "Unsure", emoji: "🤔" },
  { level: "Lost", emoji: "😳" },
];

const GraspGauge = () => {
  const socket = useSocketContext();
  const [currentGrasp, setCurrentGrasp] = useState<GraspReaction | null>(null);
  const [throttledValue, isDisabled] = useThrottle(currentGrasp, 3000);

  useEffect(() => {
    if (!isDisabled) {
      setCurrentGrasp(null);
    }
  }, [isDisabled]);

  const handleGraspChange = (
    _event: React.MouseEvent<HTMLElement>,
    updatedGrasp: GraspReaction | null,
  ) => {
    setCurrentGrasp(updatedGrasp);
    if (socket && updatedGrasp) {
      socket.emit("ReactionSend", updatedGrasp.emoji.codePointAt(0));
      socket.emit("GraspReactionSend", {
        level: updatedGrasp.level.toLowerCase(),
        sent_at: new Date(),
      });
    }
  };

  return (
    <Box my={1}>
      <Typography variant="h6">Grasp Gauge</Typography>
      <ToggleButtonGroup
        exclusive
        disabled={isDisabled}
        value={currentGrasp}
        onChange={handleGraspChange}
      >
        {graspReactions.map((gr) => (
          <ToggleButton
            sx={{ p: 1, minWidth: 0 }}
            key={gr.emoji.codePointAt(0)}
            value={gr}
          >
            {gr.emoji} {gr.level}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default GraspGauge;
