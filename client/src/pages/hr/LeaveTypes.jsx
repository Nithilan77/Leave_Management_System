import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Alert, CircularProgress, Checkbox, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack,
} from '@mui/material';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { hrNav } from '../../components/hrNav';
import ConfirmDialog from '../../components/ConfirmDialog';

/**
 * Leave Types & Policy  (/hr/leave-types)
 * ----------------------------------------
 *   - list types                    GET    /api/leave-types
 *   - add type (+ give to everyone) POST   /api/leave-types
 *   - edit name / quota             PUT    /api/leave-types/:id
 *   - delete an unused type         DELETE /api/leave-types/:id
 *   - give a type to all users      POST   /api/leave-types/:id/allocate
 *   - start a new leave year        POST   /api/leave-types/reset-balances
 */

const errMsg = (err, fallback) => err.response?.data?.message || fallback;

/* Add / edit dialog */
const TypeDialog = ({ open, type, onClose, onSaved }) => {
  const isEdit = Boolean(type);
  const [form, setForm] = useState({ name: '', annualQuota: '', description: '' });
  const [applyFlag, setApplyFlag] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(type
      ? { name: type.name, annualQuota: String(type.annualQuota), description: type.description || '' }
      : { name: '', annualQuota: '', description: '' });
    // New type: give it to everyone by default. Edit: only change balances if asked.
    setApplyFlag(!type);
  }, [open, type]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const quotaChanged = isEdit && Number(form.annualQuota) !== type.annualQuota;

  const save = async () => {
    setError('');
    if (!form.name.trim() || form.annualQuota === '') {
      setError('Name and days per year are required');
      return;
    }
    if (Number(form.annualQuota) < 0) {
      setError('Days per year cannot be negative');
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, annualQuota: Number(form.annualQuota) };
      if (isEdit) {
        const res = await api.put(`/leave-types/${type._id}`, { ...body, applyToBalances: applyFlag });
        onSaved(
          res.data.balancesUpdated
            ? `${body.name} updated; ${res.data.balancesUpdated} balance(s) changed`
            : `${body.name} updated`
        );
      } else {
        const res = await api.post('/leave-types', { ...body, allocateToAll: applyFlag });
        onSaved(`${body.name} added; ${res.data.balancesCreated} user(s) received it`);
      }
    } catch (err) {
      setError(errMsg(err, 'Could not save leave type'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? `Edit ${type.name}` : 'Add leave type'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <TextField label="Name" name="name" value={form.name} onChange={change} fullWidth margin="dense" required />
        <TextField
          label="Days per year"
          name="annualQuota"
          type="number"
          value={form.annualQuota}
          onChange={change}
          fullWidth
          margin="dense"
          slotProps={{ htmlInput: { min: 0 } }}
          required
        />
        <TextField
          label="Description"
          name="description"
          value={form.description}
          onChange={change}
          fullWidth
          margin="dense"
          multiline
          rows={2}
        />

        {!isEdit && (
          <FormControlLabel
            control={<Checkbox checked={applyFlag} onChange={(e) => setApplyFlag(e.target.checked)} />}
            label="Give this leave to all active users now"
          />
        )}
        {quotaChanged && (
          <FormControlLabel
            control={<Checkbox checked={applyFlag} onChange={(e) => setApplyFlag(e.target.checked)} />}
            label="Also update everyone's current balance to the new number of days"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={22} /> : isEdit ? 'Save changes' : 'Add leave type'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const LeaveTypes = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [editing, setEditing] = useState(undefined); // undefined closed, null new, object edit
  const [deleting, setDeleting] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/leave-types');
      setTypes(res.data.leaveTypes);
    } catch (err) {
      setError(errMsg(err, 'Could not load leave types'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (message) => {
    setEditing(undefined);
    setNotice(message);
    load();
  };

  const allocate = async (t) => {
    setError('');
    try {
      const res = await api.post(`/leave-types/${t._id}/allocate`);
      setNotice(res.data.created
        ? `${t.name} given to ${res.data.created} user(s) who didn't have it`
        : `Every active user already has ${t.name}`);
    } catch (err) {
      setError(errMsg(err, 'Could not allocate leave type'));
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/leave-types/${deleting._id}`);
      setNotice(`${deleting.name} deleted`);
      load();
    } catch (err) {
      setError(errMsg(err, 'Could not delete leave type'));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const confirmReset = async () => {
    setBusy(true);
    try {
      const res = await api.post('/leave-types/reset-balances');
      setNotice(`New leave year started; ${res.data.modified} balance(s) reset`);
    } catch (err) {
      setError(errMsg(err, 'Could not reset balances'));
    } finally {
      setBusy(false);
      setResetOpen(false);
    }
  };

  return (
    <Layout nav={hrNav}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" fontWeight={600}>Leave types</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" color="warning" onClick={() => setResetOpen(true)}>
            Start new leave year
          </Button>
          <Button variant="contained" onClick={() => setEditing(null)}>Add leave type</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {loading && <CircularProgress />}

      {!loading && types.length === 0 && (
        <Alert severity="info">No leave types yet. Add one so employees can apply for leave.</Alert>
      )}

      {!loading && types.length > 0 && (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['Name', 'Days per year', 'Description', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t._id} hover>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.annualQuota}</TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>{t.description || '—'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setEditing(t)}>Edit</Button>
                    <Button size="small" onClick={() => allocate(t)}>Give to all users</Button>
                    <Button size="small" color="error" onClick={() => setDeleting(t)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TypeDialog
        open={editing !== undefined}
        type={editing || null}
        onClose={() => setEditing(undefined)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name}?`}
        message="Everyone's balance for this type is removed too. Types that already have leave requests can't be deleted."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Start a new leave year?"
        message="Every user's balance goes back to the full days per year for each type, and days used go to 0. Do this once at the start of the year."
        confirmLabel="Reset all balances"
        danger
        busy={busy}
        onConfirm={confirmReset}
        onClose={() => setResetOpen(false)}
      />
    </Layout>
  );
};

export default LeaveTypes;
