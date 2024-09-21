import { useEffect, useState } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import { styled, alpha } from "@mui/material/styles";
import Stack from "@mui/material/Stack";

const reactionEmoji = ["👍", "👎", "😁", "🤯", "😎", "💯", "💡"];

const Emoji = styled("div")(({ theme }) => ({
  fontSize: "20pt",
  cursor: "pointer",
}));

const Reaction = () => {
  const socket = useSocketContext();

  const handleFeedback = (
    event: React.MouseEvent<HTMLElement>,
    codePoint?: number,
  ) => {
    if (socket && codePoint) {
      socket.emit("ReactionSend", codePoint);
    }
  };

  return (
    <Stack direction="row" spacing={2}>
      {reactionEmoji.map((emoji) => (
        <Emoji
          key={emoji.codePointAt(0)}
          role="button"
          onClick={(e) => handleFeedback(e, emoji.codePointAt(0))}
        >
          {emoji}
        </Emoji>
      ))}
    </Stack>
  );
};

export default Reaction;
