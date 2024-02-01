import { Container, Typography } from "@mui/material";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Class Interactor</title>
        <meta name="description" content="Class interaction application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
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
