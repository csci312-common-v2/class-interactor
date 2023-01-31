import { useEffect, useState } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import { styled, alpha } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

const PollOptions = ["A", "B", "C", "D", "E"];

const DefaultPollData = new Proxy({} as { [index: string | symbol]: number }, {
  get: (target, name) => target[name] ?? 0
})

// Override disabled and selected style so disabled doesn't look different
const StyledToggleButton = styled(ToggleButton)({
  width: 100,
  paddingTop: 0,
  paddingBottom: 0,
  overflowX: "hidden",
  '&.Mui-disabled': {
    color: "rgba(0, 0, 0, 0.54)",
  },
  '&.Mui-disabled.Mui-selected': {
    color: "rgba(0, 0, 0, 0.87)",
  },
});

interface AnswerFractionProps {
  fraction: number;
}

const AnswerFraction = styled('span')<AnswerFractionProps>(({ theme, fraction }) => ({
  width: "100%",
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  transform: `translateX(${-100 + fraction}%)`,
  backgroundColor: `${alpha(theme.palette.primary.main, 0.3)}`,
}));

type AnswerEntryProps = {
  label: string;
  value: number | null;
  total: number;
};

const AnswerEntry = ({ label, value, total }: AnswerEntryProps) => {
  const fraction = (value !== null && total > 0) ? Math.round(value / total * 100) : 0;
  if (value !== null) {
    return (<span>{label} {`(${fraction}%)`} <AnswerFraction fraction={fraction} /></span>);
  } else {
    return (<span>{label}</span>);
  }
}

type PollAnswerResponse = {
  choice: string;
}

type PollProps = {
  id: string;
  console?: boolean;
};

const Poll = ({ id, console = false }: PollProps) => {
  const socket = useSocketContext();
  const [choice, setChoice] = useState<string | null>(null);

  // If being used in the console, only display responses and having default date (with 0 counts)
  const [pollData, setPollData] = useState<{ [key: string]: number } | null>(console ? DefaultPollData : null);

  useEffect(() => {
    // Clear any previous choice and or data
    setChoice(null);
    setPollData(console ? DefaultPollData : null);
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    // Update with realtime poll data
    socket.on("PollResults", (data) => {
      setPollData(data);
    });

  }, [socket]);

  const handleChoice = async (event: React.MouseEvent<HTMLElement>, newChoice: string | null) => {
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

  const total = Object.values(pollData ?? {}).reduce(
    (a: number, b: number) => a + b,
    0
  );


  // Disable selection when results are revealed (which is all the time in console mode)
  return (
    <div>
      <ToggleButtonGroup
        orientation="vertical"
        value={choice}
        exclusive
        onChange={handleChoice}
        disabled={pollData !== null}
      >
        {PollOptions.map((opt) => (<StyledToggleButton key={opt} value={opt} aria-label={opt} selected={opt === choice}><AnswerEntry label={opt} value={pollData?.[opt] ?? null} total={total} /></StyledToggleButton>))}
      </ToggleButtonGroup>
      {console && (<div>Responses: {total}</div>)}
    </div>
  );
};

export default Poll;
