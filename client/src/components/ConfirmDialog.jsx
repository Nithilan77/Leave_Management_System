import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';

/**
 * ConfirmDialog
 * --------------
 * A small "are you sure?" dialog for destructive or wide-reaching actions
 * (deleting a leave type, resetting every balance, deactivating a user).
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     title="Delete leave type?"
 *     message="This cannot be undone."
 *     confirmLabel="Delete"
 *     danger
 *     busy={working}
 *     onConfirm={handleDelete}
 *     onClose={() => setOpen(false)}
 *   />
 */
const ConfirmDialog = ({
  open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose,
}) => (
  <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={busy}>Cancel</Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        color={danger ? 'error' : 'primary'}
        disabled={busy}
      >
        {busy ? 'Working…' : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
