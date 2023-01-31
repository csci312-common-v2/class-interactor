import React, { useEffect, useState } from "react";
import { useSocketContext } from "../../../components/contexts/socket/useSocketContext";
import Poll from "../../interactions/Poll";

interface Props {
  roomId: string;
}

const Participant = ({ roomId }: Props) => {
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
    <div>
      <h1>Participant View: {roomId}</h1>
      {pollId && <Poll id={pollId} />}
    </div>
  );
};

export default Participant;
