import { useEffect, useState } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import { styled, alpha } from "@mui/material/styles";
import Slide from "@mui/material/Slide";

interface EmojiTrackProps {
  position: number;
}

const EmojiTrack = styled("div")<EmojiTrackProps>(({ theme, position }) => ({
  position: "absolute",
  top: "30vh",
  left: `${position}%`,
}));

const Emoji = styled("div")(({ theme }) => ({
  fontSize: "20pt",
}));

type ReactionItemProps = {
  position: number;
  codePoint: number;
  onEnd: () => void;
};

const ReactionItem = ({ position, codePoint, onEnd }: ReactionItemProps) => {
  return (
    <EmojiTrack position={position}>
      <Slide
        direction="up"
        in
        mountOnEnter
        timeout={{ enter: 1500 }}
        onEntered={onEnd}
      >
        <Emoji>{String.fromCodePoint(codePoint)}</Emoji>
      </Slide>
    </EmojiTrack>
  );
};

type ReactionData = {
  id: string;
  position: number;
  codePoint: number;
};

const ReactionDisplay = () => {
  const socket = useSocketContext();
  const [reactions, setReactions] = useState<ReactionData[]>([]);

  useEffect(() => {
    if (socket) {
      socket.on("ReactionShow", (reaction) => {
        setReactions((currReactions) => [...currReactions, reaction]);
      });
    }
  }, [socket]);

  return (
    <>
      {reactions.map(({ id, position, codePoint }) => (
        <ReactionItem
          key={id}
          position={position}
          codePoint={codePoint}
          onEnd={() =>
            setReactions((currReactions) =>
              currReactions.filter((reaction) => reaction.id !== id)
            )
          }
        />
      ))}
    </>
  );
};

export default ReactionDisplay;
