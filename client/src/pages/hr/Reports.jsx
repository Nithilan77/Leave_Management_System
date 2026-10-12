import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Alert, CircularProgress, Chip, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Stack,
} from '@mui/material';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { hrNav } from '../../components/hrNav';

/**
 * Reports  (/hr/reports)
 * -----------------------
 * Two tabs:
 *   1. Leave requests — every request in the organisation, filterable,
 *      with a CSV download.            GET /api/reports/requests(/export)
 *   2. Audit trail    — who did what, when (paginated).
 *                                       GET /api/reports/audit-logs
 */

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED'];
const ACTIONS = ['CREATED', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED'];
const statusColor = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error', CANCELLED: 'default', ESCALATED: 'info',
  CREATED: 'primary',
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const formatDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');
const errMsg = (err, fallback) => err.response?.data?.message || fallback;

// Drop empty filter values so they aren't sent as ?status=&...
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null));

const HeadRow = ({ cols }) => (
  <TableHead>
    <TableRow sx={{ bgcolor: 'primary.main' }}>
      {cols.map((h) => <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>)}
    </TableRow>
  </TableHead>
);

/* ------------------------------------------------------------------ */
/* Tab 1: all leave requests                                           */
/* ------------------------------------------------------------------ */
const RequestsTab = () => {
  const [filters, setFilters] = useState({ status: '', leaveType: '', department: '', from: '', to: '' });
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown options: leave types, and departments taken from the user list.
  useEffect(() => {
    api.get('/leave-types').then((res) => setLeaveTypes(res.data.leaveTypes)).catch(() => {});
    api.get('/users').then((res) => {
      const depts = [...new Set(res.data.users.map((u) => u.department).filter(Boolean))].sort();
      setDepartments(depts);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/requests', { params: clean(filters) });
      setRequests(res.data.requests);
      setError('');
    } catch (err) {
      setError(errMsg(err, 'Could not load requests'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const change = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  // The export endpoint needs the auth header, so we fetch it through our api
  // instance as a Blob and trigger the download ourselves.
  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/reports/requests/export', {
        params: clean(filters),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave-requests-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download the CSV file');
    } finally {
      setDownloading(false);
    }
  };

  const dateProps = { slotProps: { inputLabel: { shrink: true } } };

  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
        <TextField select size="small" label="Status" name="status" value={filters.status} onChange={change} sx={{ minWidth: 140 }}>
          <MenuItem value="">All statuses</MenuItem>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Leave type" name="leaveType" value={filters.leaveType} onChange={change} sx={{ minWidth: 140 }}>
          <MenuItem value="">All types</MenuItem>
          {leaveTypes.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Department" name="department" value={filters.department} onChange={change} sx={{ minWidth: 160 }}>
          <MenuItem value="">All departments</MenuItem>
          {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="From" name="from" value={filters.from} onChange={change} {...dateProps} />
        <TextField size="small" type="date" label="To" name="to" value={filters.to} onChange={change} {...dateProps} />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={downloadCsv} disabled={downloading || requests.length === 0}>
          {downloading ? 'Preparing…' : 'Download CSV'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress />}

      {!loading && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {requests.length} request(s)
          </Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table size="small">
              <HeadRow cols={['Employee', 'Department', 'Type', 'From', 'To', 'Days', 'Status', 'Reviewed by']} />
              <TableBody>
                {requests.length === 0 && (
                  <TableRow><TableCell colSpan={8}>No requests match these filters.</TableCell></TableRow>
                )}
                {requests.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.employee?.name || '—'}</TableCell>
                    <TableCell>{r.employee?.department || '—'}</TableCell>
                    <TableCell>{r.leaveType?.name || '—'}</TableCell>
                    <TableCell>{formatDate(r.startDate)}</TableCell>
                    <TableCell>{formatDate(r.endDate)}</TableCell>
                    <TableCell>{r.days}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status} color={statusColor[r.status] || 'default'} />
                    </TableCell>
                    <TableCell>{r.reviewedBy?.name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Tab 2: audit trail                                                  */
/* ------------------------------------------------------------------ */
const AuditTab = () => {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0); // MUI pagination is 0-based, the API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [data, setData] = useState({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/reports/audit-logs', { params: clean({ action, page: page + 1, limit: rowsPerPage }) })
      .then((res) => { setData(res.data); setError(''); })
      .catch((err) => setError(errMsg(err, 'Could not load the audit trail')))
      .finally(() => setLoading(false));
  }, [action, page, rowsPerPage]);

  const describeRequest = (req) => {
    if (!req) return 'Request no longer exists';
    return `${req.employee?.name || '—'}: ${req.leaveType?.name || '—'}, ${req.days} day(s) from ${formatDate(req.startDate)}`;
  };

  return (
    <>
      <TextField
        select
        size="small"
        label="Action"
        value={action}
        onChange={(e) => { setAction(e.target.value); setPage(0); }}
        sx={{ minWidth: 160, mb: 2 }}
      >
        <MenuItem value="">All actions</MenuItem>
        {ACTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
      </TextField>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress />}

      {!loading && (
        <Paper sx={{ boxShadow: 2 }}>
          <TableContainer>
            <Table size="small">
              <HeadRow cols={['When', 'Action', 'By', 'Request', 'Details']} />
              <TableBody>
                {data.logs.length === 0 && (
                  <TableRow><TableCell colSpan={5}>Nothing has been logged yet.</TableCell></TableRow>
                )}
                {data.logs.map((log) => (
                  <TableRow key={log._id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={log.action} color={statusColor[log.action] || 'default'} />
                    </TableCell>
                    <TableCell>
                      {log.performedBy ? `${log.performedBy.name} (${log.performedBy.role})` : '—'}
                    </TableCell>
                    <TableCell>{describeRequest(log.request)}</TableCell>
                    <TableCell>{log.details || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.total}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(e, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </Paper>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
const Reports = () => {
  const [tab, setTab] = useState(0);

  return (
    <Layout nav={hrNav}>
      <Typography variant="h4" fontWeight={600} gutterBottom>Reports</Typography>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Leave requests" />
        <Tab label="Audit trail" />
      </Tabs>
      {tab === 0 ? <RequestsTab /> : <AuditTab />}
    </Layout>
  );
};

export default Reports;
