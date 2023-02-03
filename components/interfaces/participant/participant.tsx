import React, { useEffect, useState } from "react";
import { useSocketContext } from "../../../components/contexts/socket/useSocketContext";
import Poll from "../../interactions/Poll";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Unstable_Grid2";

interface Props {
  room: {
    id?: string;
    name?: string;
  };
}

const Participant = ({ room }: Props) => {
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

  return (
    <Container maxWidth="lg">
      <h1>Room: {room.name}</h1>
      <Grid container spacing={2}>
        <Grid xs={12} md={2}>
          <h3>Peer Instruction</h3>
          <Poll id={pollId} />
        </Grid>
        <Grid xs={12} md={5} order={{ xs: 3, sm: 2 }}></Grid>
        <Grid xs={12} md={5} order={{ xs: 4, sm: 3 }}></Grid>
        <Grid xs={12} md={5} order={{ xs: 2, sm: 4 }}></Grid>
      </Grid>
    </Container>
  );
};

export default Participant;
