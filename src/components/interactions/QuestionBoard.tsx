import { useCallback, useEffect, useState } from "react";
import { useSocketContext, Socket } from "../contexts/socket/useSocketContext";
import Grid from "@mui/material/Grid2";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import AddTaskIcon from "@mui/icons-material/AddTask";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

function mergeQuestions(
  existing: Question[],
  incoming: Question[],
): Question[] {
  // incoming questions override existing questions (but original order is preserved)
  const seen = new Set(incoming.map((q) => q.id));
  return [
    ...existing.filter((q) => {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        return true;
      } else return false;
    }),
    ...incoming,
  ];
}

type QuestionPanelProps = {
  question: Question;
  handleUpvote: () => void;
  handleApprove?: () => void;
  handleRemove?: () => void;
};

const QuestionPanel = ({
  question,
  handleUpvote,
  handleApprove,
  handleRemove,
}: QuestionPanelProps) => {
  const [upvoted, setUpvoted] = useState(false);

  const upvote = useCallback(() => {
    setUpvoted(true);
    handleUpvote();
  }, [handleUpvote]);

  return (
    <Box sx={{ display: "flex", pb: 1 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mr: 1,
        }}
      >
        <Button sx={{ p: 0, minWidth: 0 }} onClick={upvote} disabled={upvoted}>
          <Typography variant="h6" component="div" sx={{ lineHeight: 1 }}>
            ▲
          </Typography>
        </Button>
        <Typography variant="h6" component="div" sx={{ lineHeight: 1 }}>
          {question.votes}
        </Typography>
      </Box>
      <Box sx={{ flex: "1 1 auto" }}>
        <Typography component="div" variant="body1">
          {question.question}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Asked by anonymous
        </Typography>
      </Box>
      {handleRemove && (
        <IconButton aria-label="remove" color="error" onClick={handleRemove}>
          <RemoveCircleOutlineIcon />
        </IconButton>
      )}

      {handleApprove && !question.approved && (
        <IconButton
          aria-label="approve"
          color="success"
          onClick={handleApprove}
        >
          <AddTaskIcon />
        </IconButton>
      )}
    </Box>
  );
};

const QuestionForm = ({ socket }: { socket?: Socket }) => {
  const [question, setQuestion] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket) {
      socket.emit(
        "QuestionAsk",
        { question, anonymous },
        (success: boolean) => {
          if (success) {
            setQuestion("");
            //setAnonymous(false);
          }
        },
      );
    }
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={1}>
        <Grid size="grow">
          <TextField
            margin="none"
            fullWidth
            size="small"
            label="Ask a question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </Grid>
        <Grid>
          <Button type="submit" variant="contained" disabled={!question}>
            Ask
          </Button>
        </Grid>
      </Grid>
      <FormControlLabel
        control={
          <Checkbox
            color="primary"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            disabled
          />
        }
        label="Ask anonymously"
      />
    </Box>
  );
};

const QuestionBoard = ({ admin }: { admin?: boolean }) => {
  const socket = useSocketContext();
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (socket) {
      // Update with realtime poll data
      const onQuestion = (incoming: Question[]) => {
        setQuestions((existing) => mergeQuestions(existing, incoming));
      };

      const onQuestionRemoved = (removedQuestionId: number) => {
        setQuestions((existing) =>
          existing.filter((q) => q.id !== removedQuestionId),
        );
      };

      const clearQuestions = () => {
        setQuestions([]);
      };

      socket.on("QuestionNew", onQuestion);
      socket.on("QuestionRemoved", onQuestionRemoved);
      socket.on("QuestionClear", clearQuestions);

      // Make sure to remove listener when component is unmounted
      return () => {
        socket.off("QuestionNew", onQuestion);
        socket.off("QuestionRemoved", onQuestionRemoved);
        socket.off("QuestionClear", clearQuestions);
      };
    }
  }, [socket]);

  const handleUpvote = (questionId: number) => {
    if (socket) {
      socket.emit("QuestionUpvote", { questionId });
    }
  };

  const handleApprove = admin
    ? (questionId: number) => {
        if (socket) {
          socket.emit(
            "QuestionApprove",
            { questionId },
            (question?: Question) => {
              if (question) {
                setQuestions((existing) =>
                  mergeQuestions(existing, [question]),
                );
              }
            },
          );
        }
      }
    : undefined;

  const handleRemove = admin
    ? (questionId: number) => {
        if (socket) {
          socket.emit("QuestionRemove", { questionId });
        }
      }
    : undefined;

  // Sort in descending order of date
  const sortedQuestions = [...questions].sort(
    (a, b) =>
      new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf(),
  );

  return (
    <>
      <Box
        sx={{
          minHeight: { xs: "0px", md: "200px" },
          maxHeight: "400px",
          overflowY: "scroll",
        }}
      >
        {sortedQuestions.map((question) => (
          <QuestionPanel
            key={question.id}
            question={question}
            handleUpvote={() => handleUpvote(question.id)}
            handleApprove={handleApprove && (() => handleApprove(question.id))}
            handleRemove={handleRemove && (() => handleRemove(question.id))}
          />
        ))}
      </Box>
      <QuestionForm socket={socket} />
    </>
  );
};

export default QuestionBoard;
