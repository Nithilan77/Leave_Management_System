import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Box, Typography, Button, TextField, MenuItem, Alert, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Stack,
} from '@mui/material';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { hrNav } from '../../components/hrNav';
import ConfirmDialog from '../../components/ConfirmDialog';

/**
 * Manage Users  (/hr/users)
 * --------------------------
 *   - list + filter users              GET   /api/users
 *   - add a user                       POST  /api/users        (balances set up automatically)
 *   - edit details / reset password    PUT   /api/users/:id, PATCH /api/users/:id/password
 *   - activate / deactivate            PATCH /api/users/:id/status
 *   - view and adjust leave balances   GET/PUT /api/users/:id/balances...
 */

const ROLES = ['employee', 'manager', 'hr'];
const roleColor = { employee: 'default', manager: 'info', hr: 'secondary' };
const emptyForm = { name: '', email: '', password: '', role: 'employee', department: '', manager: '' };

const errMsg = (err, fallback) => err.response?.data?.message || fallback;

/* ------------------------------------------------------------------ */
/* Add / edit user dialog                                              */
/* ------------------------------------------------------------------ */
const UserDialog = ({ open, user, managers, onClose, onSaved }) => {
  const isEdit = Boolean(user);
  const [form, setForm] = useState(emptyForm);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Fill the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError('');
    setInfo('');
    setNewPassword('');
    setForm(user
      ? {
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role,
        department: user.department || '',
        manager: user.manager?._id || '',
      }
      : emptyForm);
  }, [open, user]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async () => {
    setError('');
    if (!form.name || !form.email || (!isEdit && !form.password)) {
      setError('Name, email and password are required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
        role: form.role,
        department: form.department,
        manager: form.manager || null,
      };
      if (isEdit) {
        await api.put(`/users/${user._id}`, body);
      } else {
        await api.post('/users', { ...body, password: form.password });
      }
      onSaved(isEdit ? 'User updated' : 'User added and leave balances set up');
    } catch (err) {
      setError(errMsg(err, 'Could not save user'));
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    setInfo('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    try {
      await api.patch(`/users/${user._id}/password`, { password: newPassword });
      setNewPassword('');
      setInfo('Password updated. Share it with the user privately.');
    } catch (err) {
      setError(errMsg(err, 'Could not update password'));
    }
  };

  // A user can't be their own manager.
  const managerOptions = managers.filter((m) => !user || m._id !== user._id);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? `Edit ${user.name}` : 'Add user'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mb: 1 }}>{info}</Alert>}

        <TextField label="Name" name="name" value={form.name} onChange={change} fullWidth margin="dense" required />
        <TextField label="Email" name="email" type="email" value={form.email} onChange={change} fullWidth margin="dense" required />
        {!isEdit && (
          <TextField
            label="Temporary password"
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            fullWidth
            margin="dense"
            helperText="At least 6 characters"
            required
          />
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select label="Role" name="role" value={form.role} onChange={change} fullWidth margin="dense">
            {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField label="Department" name="department" value={form.department} onChange={change} fullWidth margin="dense" />
        </Stack>
        <TextField select label="Manager" name="manager" value={form.manager} onChange={change} fullWidth margin="dense">
          <MenuItem value="">No manager</MenuItem>
          {managerOptions.map((m) => (
            <MenuItem key={m._id} value={m._id}>{m.name} ({m.role})</MenuItem>
          ))}
        </TextField>

        {isEdit && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Reset password</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                type="password"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
              />
              <Button variant="outlined" onClick={resetPassword}>Set password</Button>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={22} /> : isEdit ? 'Save changes' : 'Add user'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ------------------------------------------------------------------ */
/* Leave balances dialog                                               */
/* ------------------------------------------------------------------ */
const BalancesDialog = ({ open, user, onClose }) => {
  const [balances, setBalances] = useState([]);
  const [edits, setEdits] = useState({}); // leaveTypeId -> typed total
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get(`/users/${user._id}/balances`);
      setBalances(res.data.balances);
      setEdits({});
    } catch (err) {
      setError(errMsg(err, 'Could not load balances'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      setError('');
      setInfo('');
      load();
    }
  }, [open, load]);

  const saveRow = async (b) => {
    const typeId = b.leaveType._id;
    setError('');
    setInfo('');
    try {
      await api.put(`/users/${user._id}/balances/${typeId}`, { total: Number(edits[typeId]) });
      setInfo(`${b.leaveType.name} updated`);
      load();
    } catch (err) {
      setError(errMsg(err, 'Could not update balance'));
    }
  };

  const initialize = async () => {
    setError('');
    setInfo('');
    try {
      const res = await api.post(`/users/${user._id}/balances/initialize`);
      setInfo(res.data.created ? `Set up ${res.data.created} missing balance(s)` : 'All leave types are already set up');
      load();
    } catch (err) {
      setError(errMsg(err, 'Could not set up balances'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Leave balances{user ? ` for ${user.name}` : ''}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mb: 1 }}>{info}</Alert>}
        {loading && <CircularProgress size={24} />}

        {!loading && balances.length === 0 && (
          <Alert severity="info">
            This user has no balances yet. Set them up from the current leave types.
          </Alert>
        )}

        {!loading && balances.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Used</TableCell>
                <TableCell>Remaining</TableCell>
                <TableCell>Total days</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {balances.map((b) => {
                const typeId = b.leaveType?._id;
                const value = edits[typeId] ?? b.total;
                const changed = edits[typeId] !== undefined && Number(edits[typeId]) !== b.total;
                return (
                  <TableRow key={b._id}>
                    <TableCell>{b.leaveType?.name}</TableCell>
                    <TableCell>{b.used}</TableCell>
                    <TableCell>{b.total - b.used}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={value}
                        onChange={(e) => setEdits({ ...edits, [typeId]: e.target.value })}
                        slotProps={{ htmlInput: { min: b.used } }}
                        sx={{ width: 90 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" disabled={!changed} onClick={() => saveRow(b)}>Save</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={initialize}>Set up missing balances</Button>
        <Button variant="contained" onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
const ManageUsers = () => {
  const me = useSelector((state) => state.auth.user);
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [balanceUser, setBalanceUser] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const [u, m] = await Promise.all([
        api.get('/users', { params }),
        api.get('/users/managers'),
      ]);
      setUsers(u.data.users);
      setManagers(m.data.managers);
      setError('');
    } catch (err) {
      setError(errMsg(err, 'Could not load users'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Small delay so typing in the search box doesn't fire a request per key.
  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const changeFilter = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleSaved = (message) => {
    setEditing(undefined);
    setNotice(message);
    loadUsers();
  };

  const toggleStatus = async () => {
    setBusy(true);
    try {
      await api.patch(`/users/${statusTarget._id}/status`, { isActive: !statusTarget.isActive });
      setNotice(`${statusTarget.name} ${statusTarget.isActive ? 'deactivated' : 'activated'}`);
      setStatusTarget(null);
      loadUsers();
    } catch (err) {
      setError(errMsg(err, 'Could not change status'));
      setStatusTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout nav={hrNav}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>Users</Typography>
        <Button variant="contained" onClick={() => setEditing(null)}>Add user</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search name or email"
          name="search"
          value={filters.search}
          onChange={changeFilter}
          sx={{ minWidth: 240 }}
        />
        <TextField select size="small" label="Role" name="role" value={filters.role} onChange={changeFilter} sx={{ minWidth: 140 }}>
          <MenuItem value="">All roles</MenuItem>
          {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Status" name="isActive" value={filters.isActive} onChange={changeFilter} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>
      </Stack>

      {loading && <CircularProgress />}

      {!loading && (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['Name', 'Email', 'Role', 'Department', 'Manager', 'Status', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 && (
                <TableRow><TableCell colSpan={7}>No users match these filters.</TableCell></TableRow>
              )}
              {users.map((u) => {
                const isMe = me && (u._id === me.id || u._id === me._id);
                return (
                  <TableRow key={u._id} hover sx={{ opacity: u.isActive ? 1 : 0.6 }}>
                    <TableCell>{u.name}{isMe && ' (you)'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Chip size="small" label={u.role} color={roleColor[u.role]} /></TableCell>
                    <TableCell>{u.department || '—'}</TableCell>
                    <TableCell>{u.manager?.name || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.isActive ? 'Active' : 'Inactive'}
                        color={u.isActive ? 'success' : 'default'}
                        variant={u.isActive ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => setEditing(u)}>Edit</Button>
                      <Button size="small" onClick={() => setBalanceUser(u)}>Balances</Button>
                      <Button
                        size="small"
                        color={u.isActive ? 'error' : 'success'}
                        disabled={isMe}
                        onClick={() => setStatusTarget(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UserDialog
        open={editing !== undefined}
        user={editing || null}
        managers={managers}
        onClose={() => setEditing(undefined)}
        onSaved={handleSaved}
      />

      <BalancesDialog
        open={Boolean(balanceUser)}
        user={balanceUser}
        onClose={() => setBalanceUser(null)}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.isActive ? `Deactivate ${statusTarget?.name}?` : `Activate ${statusTarget?.name}?`}
        message={statusTarget?.isActive
          ? 'They will be signed out and unable to log in. Their leave history is kept.'
          : 'They will be able to log in again.'}
        confirmLabel={statusTarget?.isActive ? 'Deactivate' : 'Activate'}
        danger={statusTarget?.isActive}
        busy={busy}
        onConfirm={toggleStatus}
        onClose={() => setStatusTarget(null)}
      />
    </Layout>
  );
};

export default ManageUsers;
