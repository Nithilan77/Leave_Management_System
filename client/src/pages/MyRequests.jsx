import { useState, useEffect } from 'react';
import {
  Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, CircularProgress, Alert, Box,
} from '@mui/material';
import api from '../api/axios';
import Layout from '../components/Layout';
import { employeeNav } from '../components/employeeNav';

/**
 * My Requests
 * ------------
 * Lists all the employee's leave requests (GET /api/leaves/me) in a table with
 * colored status chips. PENDING requests get a Cancel button
 * (PATCH /api/leaves/:id/cancel). Refreshes the list after a cancel.
 */

// Map each status to an MUI chip color for a clear visual cue.
const statusColor = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
  ESCALATED: 'info',
};

const formatDate = (d) => new Date(d).toLocaleDateString();

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelingId, setCancelingId] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/leaves/me');
      setRequests(res.data.requests);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleCancel = async (id) => {
    setCancelingId(id);
    try {
      await api.patch(`/leaves/${id}/cancel`);
      await fetchRequests(); // refresh to show updated status
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel request');
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <Layout nav={employeeNav}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        My Leave Requests
      </Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && requests.length === 0 && (
        <Alert severity="info">You haven't submitted any leave requests yet.</Alert>
      )}

      {!loading && requests.length > 0 && (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Action'].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>{r.leaveType?.name || '—'}</TableCell>
                  <TableCell>{formatDate(r.startDate)}</TableCell>
                  <TableCell>{formatDate(r.endDate)}</TableCell>
                  <TableCell>{r.days}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{r.reason}</TableCell>
                  <TableCell>
                    <Chip label={r.status} color={statusColor[r.status] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    {r.status === 'PENDING' ? (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={cancelingId === r._id}
                        onClick={() => handleCancel(r._id)}
                      >
                        {cancelingId === r._id ? '...' : 'Cancel'}
                      </Button>
                    ) : (
                      <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Layout>
  );
};

export default MyRequests;
