import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Button, Container, Stack,
  IconButton, Drawer, List, ListItemButton, ListItemText, Divider,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import { logout } from '../store/slices/authSlice';

const Layout = ({ children, nav = [] }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavigate = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    dispatch(logout());
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1 }}>
          {isSmallScreen && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              aria-label="open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mr: isSmallScreen ? 'auto' : 4,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Leave Management System
          </Typography>

          {!isSmallScreen && (
            <>
              <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
                {nav.map((item) => (
                  <Button
                    key={item.path}
                    color="inherit"
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderBottom: location.pathname === item.path ? '2px solid white' : '2px solid transparent',
                      borderRadius: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>

              <Typography variant="body2" sx={{ mr: 2, whiteSpace: 'nowrap' }}>
                {user?.name} ({user?.role})
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.role}
            </Typography>
          </Box>
          <Divider />
          <List>
            {nav.map((item) => (
              <ListItemButton
                key={item.path}
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <List>
            <ListItemButton onClick={handleLogout}>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Container sx={{ mt: 4, pb: 6, px: { xs: 2, sm: 3 } }}>{children}</Container>
    </Box>
  );
};

export default Layout;