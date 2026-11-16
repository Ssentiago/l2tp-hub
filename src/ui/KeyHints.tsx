import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { ParseKeys } from "i18next";

const HINTS: [string, ParseKeys][] = [
  ["⌃⌥L", "keyHints.showHide"],
  ["Enter", "keyHints.connect"],
  ["Tab", "keyHints.splitFull"],
  ["⌘E", "keyHints.manage"],
  ["⌘N", "keyHints.new"],
  ["⌘D", "keyHints.disconnect"],
  ["⌘,", "keyHints.settings"],
  ["Esc", "keyHints.backHide"],
];

export function KeyHints() {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: "2px 16px",
        px: 2,
        py: 0.75,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      {HINTS.map(([key, labelKey]) => (
        <Box key={key} sx={{ display: "flex", gap: 0.5, whiteSpace: "nowrap" }}>
          <Typography sx={{ fontSize: 10, color: "text.disabled", fontWeight: 600 }}>{key}</Typography>
          <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{t(labelKey)}</Typography>
        </Box>
      ))}
    </Box>
  );
}
