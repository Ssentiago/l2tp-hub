import { Box, Typography } from "@mui/material";

const HINTS = [
  ["⌃⌥L", "Показать/скрыть"],
  ["Enter", "Подключить"],
  ["Tab", "Сплит/Фулл"],
  ["⌘E", "Управление"],
  ["⌘N", "Новое"],
  ["⌘D", "Отключить"],
  ["⌘,", "Настройки"],
  ["Esc", "Назад/Скрыть"],
];

export function KeyHints() {
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
      {HINTS.map(([key, label]) => (
        <Box key={key} sx={{ display: "flex", gap: 0.5, whiteSpace: "nowrap" }}>
          <Typography sx={{ fontSize: 10, color: "text.disabled", fontWeight: 600 }}>{key}</Typography>
          <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{label}</Typography>
        </Box>
      ))}
    </Box>
  );
}
