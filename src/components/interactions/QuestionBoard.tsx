import { MouseEventHandler, useEffect, useState } from "react";
import { useSocketContext, Socket } from "../contexts/socket/useSocketContext";
import Grid from "@mui/material/Unstable_Grid2";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import AddTaskIcon from "@mui/icons-material/AddTask";

function mergeQuestions(
  existing: Question[],
  incoming: Question[]
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

const QuestionPanel = ({
  question,
  handleUpvote,
  handleApprove,
}: {
  question: Question;
  handleUpvote: MouseEventHandler;
  handleApprove?: MouseEventHandler;
}) => {
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
        <Button sx={{ p: 0, minWidth: 0 }} onClick={handleUpvote}>
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
        }
      );
    }
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={1}>
        <Grid xs>
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

      const clearQuestions = () => {
        setQuestions([]);
      };

      socket.on("QuestionNew", onQuestion);
      socket.on("QuestionClear", clearQuestions);

      // Make sure to remove listener when component is unmounted
      return () => {
        socket.off("QuestionNew", onQuestion);
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
                  mergeQuestions(existing, [question])
                );
              }
            }
          );
        }
      }
    : undefined;

  // Sort in descending order of date
  const sortedQuestions = [...questions].sort(
    (a, b) =>
      new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf()
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
            handleApprove={handleApprove && (() => handleApprove(question.id))}
            handleUpvote={() => handleUpvote(question.id)}
          />
        ))}
      </Box>
      <QuestionForm socket={socket} />
    </>
  );
};

export default QuestionBoard;
