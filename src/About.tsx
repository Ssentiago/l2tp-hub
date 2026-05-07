import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Button,
  IconButton,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import TelegramIcon from "@mui/icons-material/Telegram";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CodeIcon from "@mui/icons-material/Code";
import { api } from "./api.ts";

interface Props {
  version: string;
  onBack: () => void;
}

const techStack = ["Rust + Tauri", "React + TypeScript", "Material UI"];

export function About({ version, onBack }: Props) {
  return (
    <Box sx={{ maxWidth: 480, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          О приложении
        </Typography>
        <Chip
          label={`v${version}`}
          size="small"
          variant="outlined"
          sx={{ fontFamily: "monospace", fontWeight: 600 }}
        />
      </Box>

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="body1" sx={{ lineHeight: 1.7, mb: 1 }}>
          Инструмент для управления L2TP VPN подключениями. Хранит учётные
          данные в системном хранилище, автоматически создаёт и пересоздаёт
          соединения при изменении параметров.
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.6 }}
        >
          Поддерживает множество подключений, кастомные метки для категоризации
          и быстрое переключение между клиентами.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Технологии
        </Typography>
        <Stack sx={{ gap: 1, mt: 1, flexWrap: "wrap", direction: "row" }}>
          {techStack.map((t) => (
            <Chip
              key={t}
              label={t}
              size="small"
              icon={<CodeIcon sx={{ fontSize: 14 }} />}
              variant="outlined"
            />
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary">
          Разработчик
        </Typography>
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Sentiago
          </Typography>
          <Typography variant="caption" color="text.secondary">
            System Engineer / Fullstack dev
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TelegramIcon />}
            onClick={() => api.openUrl("https://t.me/Sentiago")}
            sx={{ flex: 1, textTransform: "none" }}
          >
            @Sentiago
          </Button>
          <Button
            variant="outlined"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            onClick={() => api.openUrl("https://itego.pro")}
            sx={{ flex: 1, textTransform: "none" }}
          >
            itego.pro
          </Button>
        </Stack>
      </Paper>

      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: "block", textAlign: "center", mt: 3 }}
      >
        © 2026 Sentiago
      </Typography>
    </Box>
  );
}
