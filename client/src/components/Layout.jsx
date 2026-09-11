import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Button, Container, Stack,
} from '@mui/material';
import { logout } from '../store/slices/authSlice';

/**
 * Layout
 * -------
 * A reusable page shell: the top AppBar with the app title, role-aware nav
 * links, the user's name, and a logout button. Wrap any page in <Layout> so the
 * whole app shares one consistent header. Manager/HR pages will reuse this.
 *
 * `nav` is an array of { label, path } for the links to show.
 */
const Layout = ({ children, nav = [] }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 600, mr: 4 }}>
            LMS
          </Typography>

          {/* Navigation links */}
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {nav.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                onClick={() => navigate(item.path)}
                sx={{
                  // Highlight the active page
                  borderBottom: location.pathname === item.path ? '2px solid white' : '2px solid transparent',
                  borderRadius: 0,
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.name} ({user?.role})
          </Typography>
          <Button color="inherit" onClick={() => dispatch(logout())}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, pb: 6 }}>{children}</Container>
    </Box>
  );
};

export default Layout;
