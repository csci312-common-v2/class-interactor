import { useSocketContext } from "../../contexts/socket/useSocketContext";
import React, { useEffect, useState } from "react";
import Poll from "../../interactions/Poll";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Unstable_Grid2";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";

interface Props {
  room: {
    id?: string;
    name?: string;
  };
}

const Console = ({ room }: Props) => {
  const socket = useSocketContext();
  const [pollId, setPollId] = useState<string | null>(null);
  const [pollResponses, setPollResponses] = useState(0);

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
      socket.emit(
        "PollLaunch",
        { roomId: room.id },
        ({ id }: { id: string }) => {
          setPollId(id);
        }
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

  return (
    <Container maxWidth="lg">
      <h1>Control Console: {room.name}</h1>
      <Grid container spacing={2}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            "& > *": {
              m: 1,
            },
          }}
        >
          <ButtonGroup variant="outlined" size="small">
            <Button onClick={launchPoll} disabled={!socket}>
              Launch poll
            </Button>
            <Button onClick={revealPoll} disabled={!pollId}>
              Reveal poll
            </Button>
            <Button onClick={endPoll} disabled={!pollId}>
              End poll
            </Button>
          </ButtonGroup>
          <Poll id={pollId} totalCallback={setPollResponses} />
          <div>Responses: {pollId && pollResponses}</div>
        </Box>
      </Grid>
    </Container>
  );
};

export default Console;
