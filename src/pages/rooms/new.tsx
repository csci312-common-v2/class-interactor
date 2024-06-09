import { useState, ReactElement } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Header from "@/components/interactions/Header";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Unstable_Grid2";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

const Page = () => {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();

  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetch("/api/rooms", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name }),
    })
      .then((res) => res.json())
      .then((room) => {
        router.push(`/rooms/${room.id}/console`);
      });
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }
  return (
    <Container component="main" maxWidth="sm">
      <Typography component="h1" variant="h5">
        Create a new room
      </Typography>
      <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
        <Grid container spacing={1}>
          <Grid xs={12}>
            <TextField
              name="name"
              required
              fullWidth
              id="name"
              label="Room name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>
        </Grid>
        <Button type="submit" variant="contained" sx={{ mt: 3, mb: 2 }}>
          Create
        </Button>
      </Box>
    </Container>
  );
};

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <>
      <Header />
      {page}
    </>
  );
};

export default Page;
