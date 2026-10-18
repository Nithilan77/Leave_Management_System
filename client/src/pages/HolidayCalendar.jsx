import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Typography, Card, CardContent, Box, Chip, CircularProgress, Alert,
  TextField, MenuItem, Grid,
} from '@mui/material';
import api from '../api/axios';
import Layout from '../components/Layout';
import { navForRole } from '../components/navForRole';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const HolidayCalendar = () => {
  const { user } = useSelector((state) => state.auth);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/holidays', { params: { year } });
        setHolidays(res.data.holidays);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load holidays');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year]);

  const byMonth = holidays.reduce((acc, h) => {
    const month = new Date(h.date).getMonth();
    (acc[month] = acc[month] || []).push(h);
    return acc;
  }, {});

  return (
    <Layout nav={navForRole(user?.role)}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" fontWeight={600}>
          Holiday Calendar
        </Typography>
        <TextField
          select
          size="small"
          label="Year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ width: 120 }}
        >
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        These are the India public holidays that get skipped automatically when your leave
        request's day count is calculated — along with weekends.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : holidays.length === 0 ? (
        <Alert severity="info">No holiday data loaded for {year} yet.</Alert>
      ) : (
        <Grid container spacing={2}>
          {Object.keys(byMonth)
            .map(Number)
            .sort((a, b) => a - b)
            .map((month) => (
              <Grid item xs={12} sm={6} md={4} key={month}>
                <Card sx={{ boxShadow: 1, height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {MONTH_NAMES[month]}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {byMonth[month].map((h) => {
                        const d = new Date(h.date);
                        const dayLabel = d.toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', weekday: 'short',
                        });
                        return (
                          <Box key={h.date} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={dayLabel}
                              size="small"
                              variant={h.type === 'national' ? 'filled' : 'outlined'}
                              color={h.type === 'national' ? 'primary' : 'default'}
                            />
                            <Typography variant="body2">{h.name}</Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}
    </Layout>
  );
};

export default HolidayCalendar;