import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";
import ListItemIcon from "@mui/material/ListItemIcon";
import Logout from "@mui/icons-material/Logout";
import MeetingRoom from "@mui/icons-material/MeetingRoom";

export default function Header() {
  const [anchorElmnt, setAnchorElmnt] = useState<HTMLElement | null>(null);
  const { data: session, status } = useSession();

  const handleOpenProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElmnt(event.currentTarget);
  };

  const handleCloseProfileMenu = () => {
    setAnchorElmnt(null);
  };

  const handleLogin = () => {
    signIn();
  };

  const handleLogout = () => {
    signOut();
    handleCloseProfileMenu();
  };

  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Class Interactor
          </Typography>
          {status === "unauthenticated" && (
            <Button color="inherit" onClick={handleLogin}>
              Login
            </Button>
          )}
          {status === "authenticated" && (
            <Box sx={{ flexGrow: 0 }}>
              <IconButton onClick={handleOpenProfileMenu} sx={{ p: 0 }}>
                {/* Coalesce operating to eliminate null */}
                <Avatar
                  alt={session.user.name ?? undefined}
                  src={session.user.image ?? undefined}
                />
              </IconButton>
              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar"
                anchorEl={anchorElmnt}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorElmnt)}
                onClose={handleCloseProfileMenu}
              >
                <MenuItem
                  onClick={handleCloseProfileMenu}
                  component={Link}
                  href="/rooms"
                >
                  <ListItemIcon>
                    <MeetingRoom fontSize="small" />
                  </ListItemIcon>
                  Test
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
