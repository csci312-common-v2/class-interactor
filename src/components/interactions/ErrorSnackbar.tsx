import { forwardRef, useCallback } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";

// Known error messages to show in global error snackbar
const ErrorMessages = {
  InvalidRoom: "Unknown or unauthorized room",
};

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  },
);

type ErrorSnackbarProps = {
  errorCode: string | null;
  handleErrorClear: () => void;
};

export default function ErrorSnackbar({
  errorCode,
  handleErrorClear,
}: ErrorSnackbarProps) {
  const message =
    errorCode && Object.hasOwn(ErrorMessages, errorCode)
      ? ErrorMessages[errorCode as keyof typeof ErrorMessages]
      : null;

  const handleClose = useCallback(
    (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === "clickaway") {
        return;
      }
      handleErrorClear();
    },
    [handleErrorClear],
  );

  return (
    <Snackbar open={!!message} autoHideDuration={6000} onClose={handleClose}>
      <Alert onClose={handleClose} severity="error" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
