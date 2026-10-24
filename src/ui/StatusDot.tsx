import { Box } from "@mui/material";
import type { VpnStatus } from "../typing/definitions";

const COLOR: Record<VpnStatus, string> = {
  connected: "success.main",
  connecting: "warning.main",
  reconnecting: "warning.main",
  disconnected: "text.disabled",
  unknown: "error.main",
};

export function StatusDot({ status }: { status: VpnStatus }) {
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        bgcolor: COLOR[status] ?? "text.disabled",
        flexShrink: 0,
      }}
    />
  );
}
