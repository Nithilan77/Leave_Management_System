import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Typography, TextField, Button, MenuItem,
  Alert, CircularProgress, Box,
} from '@mui/material';
import api from '../api/axios';
import Layout from '../components/Layout';
import { employeeNav } from '../components/employeeNav';

/**
 * Apply for Leave
 * ----------------
 * A controlled form: pick a leave type, start/end dates, and a reason.
 * On submit, POSTs to /api/leaves. Shows validation and backend errors
 * (e.g. insufficient balance) and, on success, redirects to My Requests.
 *
 * The leave-type dropdown is populated from the employee's balances, so they
 * only see types they actually have allocated.
 */
const ApplyLeave = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Load the employee's leave types (from their balances).
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/leaves/me/balances');
        // Map balances to {id, name} for the dropdown.
        const types = res.data.balances
          .filter((b) => b.leaveType)
          .map((b) => ({ id: b.leaveType._id, name: b.leaveType.name }));
        setLeaveTypes(types);
      } catch {
        setError('Failed to load leave types');
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic front-end validation (backend validates too).
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.reason) {
      setError('Please fill in all fields');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError('End date cannot be before start date');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/leaves', form);
      setSuccess('Leave request submitted successfully!');
      // Brief pause so the user sees the success message, then go to requests.
      setTimeout(() => navigate('/my-requests'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout nav={employeeNav}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Apply for Leave
      </Typography>

      <Card sx={{ maxWidth: 600, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              select
              label="Leave Type"
              name="leaveTypeId"
              value={form.leaveTypeId}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            >
              {leaveTypes.length === 0 && (
                <MenuItem disabled value="">No leave types available</MenuItem>
              )}
              {leaveTypes.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Start Date"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="End Date"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="Reason"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              fullWidth
              margin="normal"
              multiline
              rows={3}
              required
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? <CircularProgress size={24} /> : 'Submit Request'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/')}>
                Cancel
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default ApplyLeave;
