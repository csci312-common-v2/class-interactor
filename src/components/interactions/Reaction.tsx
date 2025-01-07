import { useCallback } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import useThrottleCallback from "@/hooks/useThrottleCallback";
import { styled } from "@mui/material/styles";
import Stack from "@mui/material/Stack";

const reactionEmoji = ["👍", "👎", "😁", "🤯", "😎", "💯", "💡"];

const Emoji = styled("div")(({}) => ({
  fontSize: "20pt",
  cursor: "pointer",
}));

const Reaction = () => {
  const socket = useSocketContext();
  // Throttle the emoji feedback to prevent spamming
  const sendFeedback = useThrottleCallback(
    useCallback(
      (codePoint: number) => {
        if (socket && codePoint) {
          socket.emit("ReactionSend", codePoint);
        }
      },
      [socket],
    ),
    1000 /* ms */,
  );

  return (
    <Stack direction="row" spacing={2}>
      {reactionEmoji.map((emoji) => (
        <Emoji
          key={emoji.codePointAt(0)}
          role="button"
          onClick={() =>
            sendFeedback(emoji.codePointAt(0)! /* Won't be undefined */)
          }
        >
          {emoji}
        </Emoji>
      ))}
    </Stack>
  );
};

export default Reaction;
