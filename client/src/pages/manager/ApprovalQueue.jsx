import { useState, useEffect } from 'react';
import {
  Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, CircularProgress, Alert, Box,
  ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField,
} from '@mui/material';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { managerNav } from '../../components/managerNav';

/**
 * Approval Queue (Manager vertical)
 * -----------------------------------
 * Lists the manager's team requests (GET /api/manager/team) with a status
 * filter. PENDING requests get Approve / Reject buttons. Reject opens a small
 * dialog to collect the required comment; Approve fires straight away.
 */

const statusColor = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
  ESCALATED: 'info',
};

const formatDate = (d) => new Date(d).toLocaleDateString();

const ApprovalQueue = () => {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState(null);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState(null); // request being rejected
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState('');

  const fetchRequests = async (status) => {
    setLoading(true);
    try {
      const res = await api.get('/manager/team', { params: { status } });
      setRequests(res.data.requests);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(statusFilter); }, [statusFilter]);

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await api.patch(`/manager/leaves/${id}/approve`);
      await fetchRequests(statusFilter);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setActingId(null);
    }
  };

  const openRejectDialog = (request) => {
    setRejectTarget(request);
    setRejectComment('');
    setRejectError('');
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setRejectError('A comment is required to reject a request.');
      return;
    }
    setActingId(rejectTarget._id);
    try {
      await api.patch(`/manager/leaves/${rejectTarget._id}/reject`, { comment: rejectComment });
      setRejectTarget(null);
      await fetchRequests(statusFilter);
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setActingId(null);
    }
  };

  return (
    <Layout nav={managerNav}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Team Approval Queue
      </Typography>

      <ToggleButtonGroup
        value={statusFilter}
        exclusive
        onChange={(e, val) => val && setStatusFilter(val)}
        size="small"
        sx={{ mb: 3 }}
      >
        <ToggleButton value="PENDING">Pending</ToggleButton>
        <ToggleButton value="ALL">All</ToggleButton>
      </ToggleButtonGroup>

      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && requests.length === 0 && (
        <Alert severity="info">
          {statusFilter === 'PENDING' ? 'No pending requests from your team.' : 'No requests found.'}
        </Alert>
      )}

      {!loading && requests.length > 0 && (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Action'].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>{r.employee?.name || '—'}</TableCell>
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
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          color="success"
                          variant="contained"
                          disabled={actingId === r._id}
                          onClick={() => handleApprove(r._id)}
                        >
                          {actingId === r._id ? '...' : 'Approve'}
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={actingId === r._id}
                          onClick={() => openRejectDialog(r)}
                        >
                          Reject
                        </Button>
                      </Box>
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

      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject leave request</DialogTitle>
        <DialogContent>
          {rejectError && <Alert severity="error" sx={{ mb: 2 }}>{rejectError}</Alert>}
          <TextField
            label="Comment (required)"
            fullWidth
            multiline
            minRows={2}
            autoFocus
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={actingId === rejectTarget?._id}>
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={actingId === rejectTarget?._id}
          >
            {actingId === rejectTarget?._id ? 'Working…' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default ApprovalQueue;