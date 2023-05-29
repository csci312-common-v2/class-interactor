import { useEffect, useState } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import { styled, alpha } from "@mui/material/styles";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

const PollOptions = ["A", "B", "C", "D", "E"];

// Override disabled and selected style so disabled doesn't look different
const StyledToggleButton = styled(ToggleButton)({
  paddingTop: 5,
  paddingBottom: 5,
  overflowX: "hidden",
  "&.Mui-disabled": {
    color: "rgba(0, 0, 0, 0.54)",
  },
  "&.Mui-disabled.Mui-selected": {
    color: "rgba(0, 0, 0, 0.87)",
  },
});

interface AnswerFractionProps {
  fraction: number;
}

const AnswerFraction = styled("span")<AnswerFractionProps>(
  ({ theme, fraction }) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    transform: `translateX(${-100 + fraction}%)`,
    backgroundColor: `${alpha(theme.palette.primary.main, 0.3)}`,
  })
);

type AnswerEntryProps = {
  label: string;
  value?: number;
  total: number;
};

const AnswerEntry = ({ label, value, total }: AnswerEntryProps) => {
  if (value !== undefined) {
    const fraction = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <span>
        {label} {`(${fraction}%)`} <AnswerFraction fraction={fraction} />
      </span>
    );
  } else {
    return <span>{label}</span>;
  }
};

type PollAnswerResponse = {
  choice: string;
};

type PollProps = {
  id: string | null;
  totalCallback?: Function;
};

const Poll = ({ id, totalCallback }: PollProps) => {
  const socket = useSocketContext();
  const [choice, setChoice] = useState<string | null>(null);
  const [pollData, setPollData] = useState<{ [key: string]: number } | null>(
    null
  );
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Clear any previous choice and or data
    setChoice(null);
    setPollData(null);
    setTotal(0);
  }, [id]);

  useEffect(() => {
    if (socket) {
      // Update with realtime poll data
      socket.on("PollResults", (data: { [key: string]: number }) => {
        setPollData(data);
        const newTotal = Object.values(data).reduce((a, b) => a + b, 0);
        setTotal(newTotal);
      });
    }
  }, [socket]);

  useEffect(() => {
    if (totalCallback) {
      totalCallback(total);
    }
  }, [total, totalCallback]);

  const handleChoice = async (
    event: React.MouseEvent<HTMLElement>,
    newChoice: string | null
  ) => {
    if (socket && newChoice !== null) {
      socket.emit(
        "PollResponse",
        { id, prevChoice: choice, newChoice },
        (response: PollAnswerResponse) => {
          setChoice(response.choice);
        }
      );
    }
  };

  // Disable selection when results are revealed (which is all the time in console mode)
  return (
    <div>
      <ToggleButtonGroup
        orientation="vertical"
        value={choice}
        exclusive
        onChange={handleChoice}
        disabled={id === null || pollData !== null}
        sx={{ width: 1, maxWidth: 300 }}
      >
        {PollOptions.map((opt) => (
          <StyledToggleButton
            key={opt}
            value={opt}
            aria-label={opt}
            selected={opt === choice}
          >
            <AnswerEntry label={opt} value={pollData?.[opt]} total={total} />
          </StyledToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
};

export default Poll;
