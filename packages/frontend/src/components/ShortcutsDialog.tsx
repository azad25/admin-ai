import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Chip,
} from '@mui/material';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
}

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

export default function ShortcutsDialog({
  open,
  onClose,
  shortcuts,
}: ShortcutsDialogProps) {
  const formatShortcut = (shortcut: Shortcut) => {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="shortcuts-dialog-title"
    >
      <DialogTitle id="shortcuts-dialog-title">
        Keyboard Shortcuts
      </DialogTitle>
      <DialogContent dividers>
        <List>
          {shortcuts.map((shortcut, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={shortcut.description}
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={formatShortcut(shortcut)}
                      size="small"
                      variant="outlined"
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, px: 2 }}>
          Tip: Press '?' to open this dialog at any time
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 