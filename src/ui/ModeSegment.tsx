import { Box, Tooltip } from "@mui/material";
import type { TunnelMode } from "../typing/bindings";

interface Props {
  value: TunnelMode;
  onChange?: (mode: TunnelMode) => void;
  disabled?: boolean;
  disabledModes?: TunnelMode[];
  size?: "sm" | "md";
}

const MODE_DESC: Record<TunnelMode, string> = {
  split: "Раздельный туннель — только подсети через VPN",
  full: "Полный туннель — весь трафик через VPN",
};

export function ModeSegment({ value, onChange, disabled, disabledModes = [], size = "sm" }: Props) {
  const h = size === "sm" ? 26 : 32;
  const px = size === "sm" ? 1 : 1.5;
  const fontSize = size === "sm" ? 11 : 12;

  const btn = (mode: TunnelMode, label: string) => {
    const active = value === mode;
    const isDisabled = disabled || disabledModes.includes(mode);

    let tooltip = MODE_DESC[mode];
    if (disabled && active) {
      tooltip = "Отключите соединение для смены режима";
    } else if (disabledModes.includes(mode)) {
      tooltip = mode === "split"
        ? "Нет подсетей для раздельного туннелирования"
        : "Полный туннель недоступен при активных подключениях";
    } else if (active) {
      tooltip = `${MODE_DESC[mode]} (текущий)`;
    }

    const inner = (
      <Box
        onClick={(e) => {
          e.stopPropagation();
          if (!isDisabled && onChange) onChange(mode);
        }}
        sx={{
          px,
          height: h,
          display: "flex",
          alignItems: "center",
          cursor: isDisabled ? "default" : "pointer",
          bgcolor: active ? "primary.main" : "transparent",
          color: active ? "primary.contrastText" : "text.secondary",
          border: "1px solid",
          borderColor: active ? "primary.main" : "divider",
          fontSize,
          fontWeight: active ? 600 : 400,
          lineHeight: 1,
          userSelect: "none",
          "&:first-of-type": { borderRadius: "6px 0 0 6px", borderRight: "none" },
          "&:last-of-type": { borderRadius: "0 6px 6px 0" },
          opacity: isDisabled ? 0.4 : 1,
          transition: "background-color 120ms, color 120ms",
        }}
      >
        {label}
      </Box>
    );

    return (
      <Tooltip key={mode} title={tooltip} placement="top" arrow>
        {inner}
      </Tooltip>
    );
  };

  return (
    <Box sx={{ display: "inline-flex" }}>
      {btn("split", "Сплит")}
      {btn("full", "Фулл")}
    </Box>
  );
}
