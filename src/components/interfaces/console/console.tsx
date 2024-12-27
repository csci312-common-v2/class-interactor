import { useSocketContext } from "../../contexts/socket/useSocketContext";
import React, { useEffect, useState } from "react";
import Poll from "@/components/interactions/Poll";
import QuestionBoard from "@/components/interactions/QuestionBoard";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";

// Resource: https://stackoverflow.com/questions/75555873/error-require-of-es-module-in-react-gauge-chart-nextjs
const DynamicGraspGaugeGraph = dynamic(
  () => import("@/components/interactions/GraspGaugeGraph"),
  { ssr: false },
);
interface Props {
  room: {
    id?: string;
    name?: string;
  };
}

const Console = ({ room }: Props) => {
  const socket = useSocketContext();
  const [pollId, setPollId] = useState<number | null>(null);
  const [pollResponses, setPollResponses] = useState(0);

  // Handle state updates on reconnecting to a room
  useEffect(() => {
    if (socket) {
      const onPollStart = ({ id }: { id: number }) => {
        setPollId(id);
      };
      socket.on("PollStart", onPollStart);
      return () => {
        socket.off("PollStart", onPollStart);
      };
    }
  }, [socket]);

  const launchPoll = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      // If a poll is currently running, end it
      if (pollId) {
        await new Promise((resolve) => {
          socket.emit("PollEnd", { roomId: room.id, pollId }, resolve);
        });
      }
      socket.emit(
        "PollLaunch",
        { roomId: room.id },
        ({ id }: { id: number }) => {
          setPollId(id);
          setPollResponses(0);
        },
      );
    }
  };

  const revealPoll = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("PollReveal", { roomId: room.id, pollId });
    }
  };

  const endPoll = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("PollEnd", { roomId: room.id, pollId }, () => {
        setPollId(null);
      });
    }
  };

  const togglePoll = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("PollToggle", { roomId: room.id, pollId });
    }
  };

  const clearQuestions = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("QuestionClear", { roomId: room.id });
    }
  };

  const resetData = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (socket) {
      socket.emit("GraspReactionReset", { roomId: room.id });
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ mt: 1 }}>
        Control Console: {room.name}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              "& > *": {
                my: 1,
              },
            }}
          >
            <ButtonGroup variant="outlined" size="small" fullWidth>
              <Button onClick={launchPoll} disabled={!socket}>
                Launch
              </Button>
              <Button onClick={revealPoll} disabled={!pollId}>
                Reveal
              </Button>
              <Button onClick={togglePoll} disabled={!pollId}>
                Toggle
              </Button>
              <Button onClick={endPoll} disabled={!pollId}>
                End
              </Button>
            </ButtonGroup>
            <Poll key={pollId} id={pollId} totalCallback={setPollResponses} />
            <div>Responses: {pollId && pollResponses}</div>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              "& > *": {
                my: 1,
              },
            }}
          >
            <ButtonGroup variant="outlined" size="small">
              <Button onClick={clearQuestions} disabled={!socket}>
                Clear
              </Button>
            </ButtonGroup>
            <QuestionBoard admin />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ButtonGroup variant="outlined" size="small" sx={{ my: 1 }}>
            <Button onClick={resetData} disabled={!socket}>
              Reset
            </Button>
          </ButtonGroup>
          <DynamicGraspGaugeGraph />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Console;
