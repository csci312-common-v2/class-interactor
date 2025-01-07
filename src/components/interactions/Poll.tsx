import { useEffect, useState, useCallback } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import { styled, alpha } from "@mui/material/styles";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

const PollOptions = ["A", "B", "C", "D", "E"];

// Store poll response in local storage to allow for persistence across sessions (i.e., if a student
// closes the window, etc.)
const usePollStorage = (key: string, id: number | null) => {
  const [choice, setChoice] = useState<string | null>(null);

  // Update local state with stored poll data, removing outdated stored data if present
  const handleStoredPoll = useCallback(
    (storedPoll: string | null) => {
      if (storedPoll) {
        const { id: storedId, choice: storedChoice } = JSON.parse(storedPoll);
        if (storedId == id) {
          setChoice(storedChoice);
        } else {
          // Remove outdated poll data
          window.localStorage.removeItem(key);
        }
      }
    },
    [key, id],
  );

  // Alternate 'setter' that also updates stored poll response
  const setAndSaveChoice = useCallback(
    (newChoice: string) => {
      setChoice(newChoice);
      window.localStorage.setItem(
        key,
        JSON.stringify({ id, choice: newChoice }),
      );
    },
    [key, id],
  );

  // Listen for changes made by other tabs, etc.
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === key) {
        handleStoredPoll(event.newValue);
      }
    };
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("storage", listener);
    };
  }, [key, handleStoredPoll]);

  // When creating new poll look for stored poll data
  useEffect(() => {
    if (id) {
      const storedPoll = window.localStorage.getItem(key);
      handleStoredPoll(storedPoll);
    }
  }, [key, handleStoredPoll, id]);

  return [choice, setAndSaveChoice] as const;
};

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
  }),
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
  id: number | null;
  totalCallback?: (total: number) => void;
};

const Poll = ({ id, totalCallback }: PollProps) => {
  const socket = useSocketContext();
  const [choice, setChoice] = usePollStorage("interactor.poll", id);
  const [pollData, setPollData] = useState<{ [key: string]: number } | null>(
    null,
  );
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (socket) {
      // Update with realtime poll data
      const onPollResults = (data: { [key: string]: number }) => {
        setPollData(data);
        const newTotal = Object.values(data).reduce((a, b) => a + b, 0);
        setTotal(newTotal);
      };

      socket.on("PollResults", onPollResults);

      // Make sure to remove listener when component is unmounted
      return () => {
        socket.off("PollResults", onPollResults);
      };
    }
  }, [socket]);

  useEffect(() => {
    if (totalCallback) {
      totalCallback(total);
    }
  }, [total, totalCallback]);

  const handleChoice = async (
    event: React.MouseEvent<HTMLElement>,
    newChoice: string | null,
  ) => {
    if (socket && newChoice !== null) {
      socket.emit(
        "PollResponse",
        { id, prevChoice: choice, newChoice },
        (response: PollAnswerResponse) => {
          setChoice(response.choice);
        },
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
