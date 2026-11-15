import { Box, Button, Typography } from "@mui/material";
import type { ConnectError } from "../typing/bindings";
import { connectErrorView, type ConnectErrorAction } from "../core/connectErrors";

interface Props {
  error: ConnectError;
  onRetry: () => void;
  onEdit: () => void;
  onLogs: () => void;
}

const ACTION_LABELS: Record<ConnectErrorAction, string> = {
  retry: "Повторить",
  edit: "Параметры подключения",
  logs: "Логи сессии",
};

/** Панель с причиной сбоя подключения, подсказками и действиями по ней. */
export function ConnectErrorBanner({ error, onRetry, onEdit, onLogs }: Props) {
  const view = connectErrorView(error);
  const handlers: Record<ConnectErrorAction, () => void> = {
    retry: onRetry,
    edit: onEdit,
    logs: onLogs,
  };

  return (
    <Box
      sx={{
        mx: 2,
        my: 1,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "error.dark",
        bgcolor: "rgba(211, 47, 47, 0.08)",
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: "error.main" }}>
        {view.message}
      </Typography>
      {view.hints.length > 0 && (
        <Box component="ul" sx={{ m: 0.5, pl: 2 }}>
          {view.hints.map((hint) => (
            <Typography component="li" key={hint} sx={{ fontSize: 12, color: "text.secondary" }}>
              {hint}
            </Typography>
          ))}
        </Box>
      )}
      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
        {view.actions.map((action) => (
          <Button
            key={action}
            size="small"
            variant={action === "retry" ? "contained" : "outlined"}
            color={action === "retry" ? "primary" : "inherit"}
            onClick={handlers[action]}
          >
            {ACTION_LABELS[action]}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
