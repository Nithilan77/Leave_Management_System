import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, CardActionArea, TextField, Button, Typography,
  Alert, CircularProgress, Grid, Chip,
} from '@mui/material';
import { loginUser, clearError } from '../store/slices/authSlice';

/**
 * Login page
 * -----------
 * Controlled form (React state drives the inputs). On submit, dispatches the
 * loginUser thunk. On success, redirects the user to the right home page based
 * on their role. Shows a loading spinner and any error from the backend.
 *
 * DEMO_ACCOUNTS below match server/seed.js exactly. Login is still just
 * email + password under the hood — there's no separate "login as role"
 * mechanism, these cards just pre-fill the real seeded credentials so you
 * can demo all three roles quickly without retyping. Remove DEMO_ACCOUNTS
 * (and the card row) before this ever points at a real database.
 */
const DEMO_ACCOUNTS = [
  { role: 'Employee', email: 'ABC@ssn.com', password: 'ABCDEF', color: 'primary' },
  { role: 'Manager', email: 'manager_1@ssn.com', password: 'MANAGER', color: 'secondary' },
  { role: 'HR', email: 'hr_1@ssn.com', password: 'HR_ADMIN', color: 'success' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, status, error } = useSelector((state) => state.auth);

  const loading = status === 'loading';

  useEffect(() => {
    if (token && user) {
      if (user.role === 'hr') navigate('/hr');
      else if (user.role === 'manager') navigate('/manager');
      else navigate('/');
    }
  }, [token, user, navigate]);

  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  // Fills the form AND logs in immediately — one click per role for demos.
  const handleQuickLogin = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    dispatch(loginUser({ email: account.email, password: account.password }));
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 820 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom textAlign="center">
          Leave Management System
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={4}>
          Sign in to your account
        </Typography>

        <Grid container spacing={3} alignItems="stretch">
          {/* Role quick-login cards */}
          <Grid item xs={12} md={7}>
            <Grid container spacing={2}>
              {DEMO_ACCOUNTS.map((account) => (
                <Grid item xs={12} sm={4} key={account.role}>
                  <Card sx={{ height: '100%', boxShadow: 2 }}>
                    <CardActionArea
                      onClick={() => handleQuickLogin(account)}
                      disabled={loading}
                      sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                      <Chip label={account.role} color={account.color} size="small" sx={{ mb: 1.5 }} />
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ width: '100%' }}>
                        {account.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Click to sign in
                      </Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Demo accounts from server/seed.js — click a card to sign in instantly as that role.
            </Typography>
          </Grid>

          {/* Manual login form */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%', boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Or sign in manually
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    sx={{ mt: 3 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Login;