import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, Button,
  CircularProgress, Alert, LinearProgress,
} from '@mui/material';
import api from '../api/axios';
import Layout from '../components/Layout';
import { employeeNav } from '../components/employeeNav';

/**
 * Employee Dashboard
 * -------------------
 * Fetches the logged-in employee's leave balances and shows one card per leave
 * type with remaining / total days and a usage bar. Data comes from
 * GET /api/leaves/me/balances (the endpoint you tested in Postman).
 */
const Dashboard = () => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const res = await api.get('/leaves/me/balances');
        setBalances(res.data.balances);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load balances');
      } finally {
        setLoading(false);
      }
    };
    fetchBalances();
  }, []);

  return (
    <Layout nav={employeeNav}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>My Leave Balances</Typography>
        <Button variant="contained" onClick={() => navigate('/apply')}>
          Apply for Leave
        </Button>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && balances.length === 0 && (
        <Alert severity="info">
          No leave balances set up yet. Contact HR to get your leave allocated.
        </Alert>
      )}

      <Grid container spacing={3}>
        {balances.map((b) => {
          const remaining = b.total - b.used;
          const usedPct = b.total > 0 ? (b.used / b.total) * 100 : 0;
          return (
            <Grid item xs={12} sm={6} md={4} key={b._id}>
              <Card sx={{ boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    {b.leaveType?.name || 'Leave'}
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {remaining}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    days remaining of {b.total}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={usedPct}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {b.used} used
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Layout>
  );
};

export default Dashboard;
