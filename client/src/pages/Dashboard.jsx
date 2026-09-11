import { useDispatch, useSelector } from 'react-redux';
import { Box, AppBar, Toolbar, Typography, Button, Container, Paper } from '@mui/material';
import { logout } from '../store/slices/authSlice';

/**
 * Temporary dashboard placeholder.
 * Confirms the whole auth flow works: you can only see this if logged in, it
 * reads the user from Redux, and logout clears state and returns to login.
 * We replace this with the real employee dashboard (balances + requests) in Step 3.
 */
const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Leave Management System
          </Typography>
          <Button color="inherit" onClick={() => dispatch(logout())}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Welcome, {user?.name} 👋
          </Typography>
          <Typography color="text.secondary">
            Role: {user?.role} &nbsp;|&nbsp; Department: {user?.department || '—'}
          </Typography>
          <Typography sx={{ mt: 2 }} color="text.secondary">
            (This is a placeholder. The employee dashboard — balances, apply form,
            and request history — comes next.)
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard;
