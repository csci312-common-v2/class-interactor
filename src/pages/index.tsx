import { ReactElement } from "react";
import { Container, Typography } from "@mui/material";
import Header from "@/components/interactions/Header";

export default function Home() {
  return (
    <>
      <main>
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom sx={{ mt: 1 }}>
            Class Interactor
          </Typography>
          <Typography variant="body1" sx={{ fontSize: "h6.fontSize" }}>
            Class Interactor is an application designed to facilitate real time
            digital interaction in a classroom setting.
          </Typography>
          <Typography variant="h6" sx={{ mt: 1 }}>
            Features
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>Question Polling</li>
              <li>Question Board</li>
              <li>Reminders Board</li>
              <li>Reactions</li>
              <li>... and more!</li>
            </ul>
          </Typography>
          <Typography variant="h6">Contributors</Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>Professor Michael Linderman</li>
              <li>Katie Macalintal, Class of 2024</li>
            </ul>
          </Typography>
        </Container>
      </main>
    </>
  );
}

Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <>
      <Header />
      {page}
    </>
  );
};
