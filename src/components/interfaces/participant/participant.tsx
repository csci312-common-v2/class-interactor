import React, { useEffect, useState } from "react";
import { useSocketContext } from "@/components/contexts/socket/useSocketContext";
import Poll from "@/components/interactions/Poll";
import Reaction from "@/components/interactions/Reaction";
import ReactionDisplay from "@/components/interactions/ReactionDisplay";
import QuestionBoard from "@/components/interactions/QuestionBoard";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import ReminderBoard from "@/components/reminders/ReminderBoard";
import GraspGauge from "@/components/interactions/GraspGauge";

interface Props {
  room: {
    id?: string;
    name?: string;
  };
}

const Participant = ({ room }: Props) => {
  const socket = useSocketContext();
  const [pollId, setPollId] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onPollStart = ({ id }: { id: number }) => {
      setPollId(id);
    };
    const onPollEnd = () => {
      setPollId(null);
    };

    socket.on("PollStart", onPollStart);
    socket.on("PollEnd", onPollEnd);

    return () => {
      socket.off("PollStart", onPollStart);
      socket.off("PollEnd", onPollEnd);
    };
  }, [socket]);

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ mt: 1 }}>
        Room: {room.name}
      </Typography>
      <ReminderBoard />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 2 }}>
          <Stack
            direction="row"
            alignItems="baseline"
            justifyContent="space-between"
            spacing={2}
          >
            <Typography variant="h6">Peer Instruction</Typography>
            {pollId && <CircularProgress size="1rem" />}
          </Stack>
          <Poll key={pollId} id={pollId} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} order={{ xs: 4, sm: 2 }}>
          <Typography variant="h6">Q & A</Typography>
          <QuestionBoard />
          <Typography variant="caption" color="text.secondary" component="div">
            Questions will appear once approved by your instructor.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} order={{ xs: 2, sm: 3 }}>
          <GraspGauge />
        </Grid>
        <Grid size={12} order={{ xs: 3, sm: 4 }}>
          <Reaction />
          {/* Center reactions in "background" container " */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: -1,
            }}
          >
            <Container maxWidth="lg" sx={{ position: "relative" }}>
              <ReactionDisplay />
            </Container>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Participant;
