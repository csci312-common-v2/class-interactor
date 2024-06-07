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
import { DateTimeValidationError } from "@mui/x-date-pickers/models";
import { useSocketContext, Socket } from "../contexts/socket/useSocketContext";
import { useEffect, useMemo, useState } from "react";
import { Dayjs } from "dayjs";

function mergeReminders(
  existing: Reminder[],
  incoming: Reminder[],
): Reminder[] {
  const seen = new Set(incoming.map((r) => r.id));
  return [
    ...existing.filter((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        return true;
      } else return false;
    }),
    ...incoming,
  ];
}

type ReminderPanelProps = {
  reminder: Reminder;
  showTimes: boolean;
  handleRemove?: () => void;
};

export const ReminderPanelDateTime = new Intl.DateTimeFormat("en-us", {
  weekday: "short",
  month: "numeric",
  year: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

const ReminderPanel = ({
  reminder,
  showTimes,
  handleRemove,
}: ReminderPanelProps) => {
  const [open, setOpen] = useState(true);

  // startTime is always assigned, but endTime is not
  const startTime = new Date(reminder.start_time);
  const endTime = reminder.end_time ? new Date(reminder.end_time) : null;

  return (
    <Box sx={{ mb: 0.5 }}>
      <Collapse in={open}>
        <Alert
          severity="info"
          variant={
            new Date() < startTime || (endTime && new Date() > endTime)
              ? "outlined"
              : "standard"
          }
          action={
            handleRemove ? (
              <IconButton
                aria-label="remove"
                color="error"
                onClick={() => {
                  handleRemove();
                }}
              >
                <RemoveCircleOutlineIcon fontSize="inherit" />
              </IconButton>
            ) : (
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
            )
          }
        >
          <AlertTitle>{reminder.title}</AlertTitle>
          {reminder?.description}
          {showTimes && (
            <Box display="block">
              {startTime ? (
                <Box>
                  <Typography data-testid="start-time-label" variant="caption">
                    Start Time: {ReminderPanelDateTime.format(startTime)}
                  </Typography>
                </Box>
              ) : null}
              {endTime ? (
                <Box>
                  <Typography data-testid="end-time-label" variant="caption">
                    End Time: {ReminderPanelDateTime.format(endTime)}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          )}
        </Alert>
      </Collapse>
    </Box>
  );
};

const ReminderForm = ({ socket }: { socket?: Socket }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Use Dayjs type for Material UI DateTimePicker
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [startError, setStartError] = useState<DateTimeValidationError | null>(
    null,
  );
  const [endError, setEndError] = useState<DateTimeValidationError | null>(
    null,
  );

  const startErrorMessage = useMemo(() => {
    switch (startError) {
      case "disablePast": {
        return "Please select a date time in the future";
      }

      default: {
        return "";
      }
    }
  }, [startError]);

  const endErrorMessage = useMemo(() => {
    switch (endError) {
      case "minDate": {
        return "Please select a date time after the Start Time";
      }

      case "disablePast": {
        return "Please select a date time in the future";
      }

      default: {
        return "";
      }
    }
  }, [endError]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket) {
      socket.emit(
        "ReminderSend",
        {
          title,
          description,
          // Need to convert Dayjs objects to Date objects
          start_time: startTime?.toDate(),
          end_time: endTime?.toDate(),
        },
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
          <Grid container justifyContent="flex-end" columnGap={1}>
            <DateTimePicker
              label="Start Time"
              slotProps={{
                textField: { size: "small", helperText: startErrorMessage },
              }}
              onError={(newError) => setStartError(newError)}
              disablePast
              value={startTime}
              onChange={(e) => setStartTime(e)}
            />
            <DateTimePicker
              label="End Time"
              slotProps={{
                textField: { size: "small", helperText: endErrorMessage },
              }}
              onError={(newError) => setEndError(newError)}
              disablePast
              minDateTime={startTime || undefined}
              value={endTime}
              onChange={(e) => setEndTime(e)}
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
        <Button
          type="submit"
          variant="contained"
          disabled={!title || startError !== null || endError !== null}
        >
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
        setReminders((existing) => mergeReminders(existing, incoming));
      };

      // Update with reminders removed at realtime
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

  // Sort reminders in ascending order by their end date
  // If no end date is specified, it will be shown first
  const sortedReminders = [...reminders].sort((a, b) => {
    const aEndTime = a.end_time ? new Date(a.end_time).valueOf() : -Infinity;
    const bEndTime = b.end_time ? new Date(b.end_time).valueOf() : -Infinity;
    return aEndTime - bEndTime;
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {admin && (
          <Typography align="right">Sorted By: Ascending End Time</Typography>
        )}
        {sortedReminders.map((reminder) => (
          <ReminderPanel
            key={reminder.id}
            reminder={reminder}
            showTimes={admin || false}
            handleRemove={handleRemove && (() => handleRemove(reminder.id))}
          />
        ))}
        {admin && <ReminderForm socket={socket} />}
      </Box>
    </LocalizationProvider>
  );
};

export default ReminderBoard;
