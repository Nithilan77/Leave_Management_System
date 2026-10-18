import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card, CardContent, Typography, TextField, Button, MenuItem,
  Alert, CircularProgress, Box,
} from '@mui/material';
import api from '../api/axios';
import Layout from '../components/Layout';
import { navForRole } from '../components/navForRole';

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
  const [workingDays, setWorkingDays] = useState(null);
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Load the employee's leave types (from their balances).
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/leaves/me/balances');
        // Map balances to {id, name} for the dropdown.
        const types = (res.data.balances || [])
          .filter((b) => b.leaveType)
          .map((b) => ({ id: b.leaveType._id, name: b.leaveType.name }));
        setLeaveTypes(types);
      } catch {
        setError('Failed to load leave types');
      }
    };
    load();
  }, []);

  // Live preview: how many WORKING days (weekends + public holidays excluded)
  // the chosen range actually costs, mirroring the backend's
  // calculateWorkingDays — fetched fresh per distinct year in range so it
  // stays correct even across a year boundary (e.g. 30 Dec - 2 Jan).
  useEffect(() => {
    const { startDate, endDate } = form;
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) {
      setWorkingDays(null);
      return;
    }
    let cancelled = false;
    const compute = async () => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const years = new Set();
      for (let y = start.getFullYear(); y <= end.getFullYear(); y += 1) years.add(y);

      try {
        const holidaySets = await Promise.all(
          [...years].map((y) => api.get('/holidays', { params: { year: y } }))
        );
        const holidayDates = new Set(
          holidaySets.flatMap((res) => res.data.holidays.map((h) => h.date))
        );
        let count = 0;
        const cursor = new Date(start);
        while (cursor <= end) {
          const day = cursor.getDay();
          const key = cursor.toISOString().slice(0, 10);
          if (day !== 0 && day !== 6 && !holidayDates.has(key)) count += 1;
          cursor.setDate(cursor.getDate() + 1);
        }
        if (!cancelled) setWorkingDays(count);
      } catch {
        if (!cancelled) setWorkingDays(null);
      }
    };
    compute();
    return () => { cancelled = true; };
  }, [form.startDate, form.endDate]);

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
    <Layout nav={navForRole(user?.role)}>
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
              slotProps={{ inputLabel: { shrink: true } }}
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
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />
            {workingDays !== null && (
              <Alert severity={workingDays > 0 ? 'info' : 'warning'} sx={{ mt: 1, mb: 1 }}>
                {workingDays > 0
                  ? `This range is ${workingDays} working day${workingDays === 1 ? '' : 's'} (weekends & public holidays excluded).`
                  : "This range has no working days in it (only weekends/holidays) — it won't be accepted."}
              </Alert>
            )}
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
