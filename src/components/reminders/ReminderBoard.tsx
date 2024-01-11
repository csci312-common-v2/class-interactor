import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import CloseIcon from "@mui/icons-material/Close";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useSocketContext, Socket } from "../contexts/socket/useSocketContext";
import { useEffect, useState } from "react";

type ReminderPanelProps = {
  reminder: Reminder;
  handleRemove?: () => void;
};

const ReminderPanel = ({ reminder, handleRemove }: ReminderPanelProps) => {
  const [open, setOpen] = useState(true);
  const actionButtons = () => {
    if (handleRemove) {
      return (
        <IconButton
          aria-label="remove"
          color="error"
          onClick={() => {
            handleRemove();
          }}
        >
          <RemoveCircleOutlineIcon fontSize="inherit" />
        </IconButton>
      );
    } else {
      return (
        <IconButton
          aria-label="close"
          color="inherit"
          size="small"
          onClick={() => {
            setOpen(false);
          }}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      );
    }
  };

  return (
    <Box sx={{ mb: 0.5 }}>
      <Collapse in={open}>
        <Alert severity="info" action={actionButtons()}>
          <AlertTitle>{reminder.title}</AlertTitle>
          {reminder?.description}
        </Alert>
      </Collapse>
    </Box>
  );
};

const ReminderForm = ({ socket }: { socket?: Socket }) => {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket) {
      socket.emit(
        "ReminderSend",
        { title, description, start_time: startTime, end_time: endTime },
        (success: boolean) => {
          if (success) {
            setTitle("");
            setStartTime(null);
            setEndTime(null);
            setDescription("");
          }
        },
      );
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2.5 }}>
      <Grid container>
        <Grid item xs={12} md={6}>
          <TextField
            label="Title"
            variant="outlined"
            size="small"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Grid container justifyContent="flex-end">
            <DateTimePicker
              label="Start Time"
              slotProps={{ textField: { size: "small" } }}
              value={startTime}
              onChange={(e) => setStartTime(e)}
              disabled // Disabled until date functionality implemented
            />
            <DateTimePicker
              label="End Time"
              slotProps={{ textField: { size: "small" } }}
              minDateTime={startTime}
              value={endTime}
              onChange={(e) => setEndTime(e)}
              disabled // Disabled until date functionality implemented
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid sx={{ mt: 1, mb: 1 }}>
        <TextField
          label="Description"
          size="small"
          fullWidth
          multiline
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Grid>
      <Grid>
        <Button type="submit" variant="contained" disabled={!title}>
          Post
        </Button>
      </Grid>
    </Box>
  );
};

const ReminderBoard = ({ admin }: { admin?: boolean }) => {
  const socket = useSocketContext();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    if (socket) {
      // Update with reminders posted at realtime
      const onReminderSend = (incoming: Reminder[]) => {
        setReminders((existing) => [...existing, ...incoming]);
      };

      const onReminderRemoved = (removedReminderId: Number) => {
        setReminders((existing) =>
          existing.filter((r) => r.id != removedReminderId),
        );
      };

      // Listen for events
      socket.on("ReminderSend", onReminderSend);
      socket.on("ReminderRemoved", onReminderRemoved);

      // Make sure to remove listener when component is unmounted
      return () => {
        socket.off("ReminderSend", onReminderSend);
        socket.off("ReminderRemoved", onReminderRemoved);
      };
    }
  }, [socket]);

  const handleRemove = admin
    ? (reminderId: number) => {
        if (socket) {
          socket.emit("ReminderRemove", { reminderId });
        }
      }
    : undefined;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {reminders.map((reminder) => (
          <ReminderPanel
            key={reminder.id}
            reminder={reminder}
            handleRemove={handleRemove && (() => handleRemove(reminder.id))}
          />
        ))}
        {admin && <ReminderForm socket={socket} />}
      </Box>
    </LocalizationProvider>
  );
};

export default ReminderBoard;
