import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, MenuItem, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { hrNav } from '../../components/hrNav';

/**
 * HR Overview
 * ------------
 * The HR home page (/hr). Loads four reports in parallel:
 *   GET /api/reports/summary         -> headline numbers
 *   GET /api/reports/monthly?year=   -> approved days per month (bar chart)
 *   GET /api/reports/by-leave-type   -> table + pie chart
 *   GET /api/reports/by-department   -> table + bar chart
 */

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

// Brand-neutral categorical palette (swap for your brand's colors if you have one).
const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

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

const ChartCard = ({ title, action, children, height = 280 }) => (
  <Card sx={{ boxShadow: 2 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">{title}</Typography>
        {action}
      </Box>
      <Box sx={{ width: '100%', height }}>{children}</Box>
    </CardContent>
  </Card>
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

  // Only chart leave types that have any approved days, so the pie isn't
  // cluttered with zero-slices.
  const typePieData = byType
    .filter((r) => r.approvedDays > 0)
    .map((r) => ({ name: r.name, value: r.approvedDays }));

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
      <Box sx={{ mb: 4 }}>
        <ChartCard
          title="Approved leave days by month"
          action={(
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
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                formatter={(value, name, props) => [`${value} day(s)`, `${props.payload.requests} request(s)`]}
              />
              <Bar dataKey="days" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
        {/* Days taken by leave type - pie */}
        <ChartCard title="Days taken by leave type">
          {typePieData.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No approved leave yet.</Typography>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typePieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {typePieData.map((entry, i) => (
                    <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} day(s)`, 'Days taken']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Days taken by department - bar */}
        <ChartCard title="Days taken by department">
          {byDept.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No leave requests yet.</Typography>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="department" width={100} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`${value} day(s)`, 'Days taken']} />
                <Bar dataKey="approvedDays" fill={PALETTE[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Box>

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
