import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, MenuItem, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip,
} from '@mui/material';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { hrNav } from '../../components/hrNav';

/**
 * HR Overview
 * ------------
 * The HR home page (/hr). Loads four reports in parallel:
 *   GET /api/reports/summary         -> headline numbers
 *   GET /api/reports/monthly?year=   -> approved days per month (bar chart)
 *   GET /api/reports/by-leave-type   -> table
 *   GET /api/reports/by-department   -> table
 *
 * The bar chart is plain MUI Boxes (height = share of the busiest month), so
 * we don't need a charting library for one simple chart.
 */

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

const Stat = ({ label, value, hint }) => (
  <Card sx={{ boxShadow: 2 }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h4" fontWeight={700}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </CardContent>
  </Card>
);

const HeadRow = ({ cols }) => (
  <TableHead>
    <TableRow sx={{ bgcolor: 'primary.main' }}>
      {cols.map((h) => (
        <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
      ))}
    </TableRow>
  </TableHead>
);

const HRDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [byType, setByType] = useState([]);
  const [byDept, setByDept] = useState([]);
  const [year, setYear] = useState(currentYear);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Summary + tables load once.
  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, d] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/reports/by-leave-type'),
          api.get('/reports/by-department'),
        ]);
        setSummary(s.data.summary);
        setByType(t.data.rows);
        setByDept(d.data.rows);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Monthly chart reloads when the year changes.
  useEffect(() => {
    api.get(`/reports/monthly?year=${year}`)
      .then((res) => setMonthly(res.data.months))
      .catch(() => setMonthly([]));
  }, [year]);

  const maxDays = Math.max(1, ...monthly.map((m) => m.days));

  return (
    <Layout nav={hrNav}>
      <Typography variant="h4" fontWeight={600} gutterBottom>Organisation overview</Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {summary && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <Stat
            label="Pending requests"
            value={summary.requestsByStatus.PENDING}
            hint="Waiting for a manager"
          />
          <Stat
            label="Approved requests"
            value={summary.requestsByStatus.APPROVED}
            hint={`${summary.approvedDays} days in total`}
          />
          <Stat
            label="Rejected requests"
            value={summary.requestsByStatus.REJECTED}
            hint={`${summary.requestsByStatus.CANCELLED} cancelled by employees`}
          />
          <Stat
            label="Active users"
            value={summary.users.active}
            hint={`${summary.users.employee} employees, ${summary.users.manager} managers, ${summary.users.hr} HR`}
          />
        </Box>
      )}

      {/* Monthly approved days */}
      <Card sx={{ boxShadow: 2, mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Approved leave days by month</Typography>
            <TextField
              select
              size="small"
              label="Year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              sx={{ width: 110 }}
            >
              {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 180 }}>
            {monthly.map((m) => (
              <Tooltip key={m.month} title={`${m.days} day(s) across ${m.requests} request(s)`}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">{m.days || ''}</Typography>
                  <Box
                    sx={{
                      height: `${(m.days / maxDays) * 140}px`,
                      minHeight: m.days ? 4 : 0,
                      bgcolor: 'primary.main',
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  <Typography variant="caption">{m.label}</Typography>
                </Box>
              </Tooltip>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* By leave type */}
        <Box>
          <Typography variant="h6" gutterBottom>By leave type</Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table size="small">
              <HeadRow cols={['Type', 'Quota', 'Approved', 'Pending', 'Rejected', 'Days taken']} />
              <TableBody>
                {byType.length === 0 && (
                  <TableRow><TableCell colSpan={6}>No leave types yet.</TableCell></TableRow>
                )}
                {byType.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.annualQuota}</TableCell>
                    <TableCell>{r.approved}</TableCell>
                    <TableCell>{r.pending}</TableCell>
                    <TableCell>{r.rejected}</TableCell>
                    <TableCell>{r.approvedDays}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* By department */}
        <Box>
          <Typography variant="h6" gutterBottom>By department</Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table size="small">
              <HeadRow cols={['Department', 'Requests', 'Approved', 'Pending', 'Days taken', 'People']} />
              <TableBody>
                {byDept.length === 0 && (
                  <TableRow><TableCell colSpan={6}>No leave requests yet.</TableCell></TableRow>
                )}
                {byDept.map((r) => (
                  <TableRow key={r.department} hover>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.totalRequests}</TableCell>
                    <TableCell>{r.approved}</TableCell>
                    <TableCell>{r.pending}</TableCell>
                    <TableCell>{r.approvedDays}</TableCell>
                    <TableCell>{r.employeesOnLeave}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Layout>
  );
};

export default HRDashboard;
