import { useState, useCallback } from "react";
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, ContentPaste, Lan } from "@mui/icons-material";
import { parseSubnetInput, formatCidr, describeCidr } from "../core/subnet";

interface Props {
  routes: string[];
  onChange: (routes: string[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SubnetEditor({
  routes,
  onChange,
  label = "Подсети через VPN",
  placeholder = "10.0.0.0/8 или 192.168.1",
  disabled = false,
}: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addRoute = useCallback(() => {
    const result = parseSubnetInput(input);
    if (!result.ok) {
      setError(result.error ?? "Невалидный ввод");
      return;
    }
    const cidr = result.cidr!;
    if (routes.includes(cidr)) {
      setError("Такая подсеть уже добавлена");
      return;
    }
    onChange([...routes, cidr]);
    setInput("");
    setError(null);
  }, [input, routes, onChange]);

  const removeRoute = useCallback(
    (index: number) => {
      onChange(routes.filter((_, i) => i !== index));
    },
    [routes, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRoute();
    }
    if (e.key === "Tab" && input && !error) {
      // Autocomplete: если ввёл shorthand, Tab подставляет нормализованный
      const result = parseSubnetInput(input);
      if (result.ok && result.cidr !== input) {
        e.preventDefault();
        setInput(result.cidr!);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text
        .split(/[\n\r,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const added: string[] = [];
      const errors: string[] = [];
      for (const line of lines) {
        const result = parseSubnetInput(line);
        if (result.ok && result.cidr && !routes.includes(result.cidr) && !added.includes(result.cidr)) {
          added.push(result.cidr);
        } else if (!result.ok) {
          errors.push(line);
        }
      }
      if (added.length > 0) {
        onChange([...routes, ...added]);
      }
      if (errors.length > 0) {
        setError(`Не распознано: ${errors.join(", ")}`);
      } else {
        setError(null);
      }
    } catch {
      // clipboard не доступен
    }
  };

  // Валидация в реальном времени при вводе
  const liveValidation = input.trim()
    ? parseSubnetInput(input).ok
      ? null
      : parseSubnetInput(input).error
    : null;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Tooltip title="Вставить из буфера (CIDR через запятую/перенос строки)">
          <IconButton size="small" onClick={handlePaste} disabled={disabled}>
            <ContentPaste sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Список подсетей */}
      {routes.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          {routes.map((route, i) => (
            <Tooltip key={i} title={describeCidr(route)} arrow>
              <Chip
                icon={<Lan sx={{ fontSize: 14 }} />}
                label={formatCidr(route)}
                size="small"
                onDelete={disabled ? undefined : () => removeRoute(i)}
                sx={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  "& .MuiChip-deleteIcon": { fontSize: 16 },
                }}
              />
            </Tooltip>
          ))}
        </Box>
      )}

      {routes.length === 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ mb: 1, display: "block" }}>
          Подсети не добавлены. Введите CIDR и нажмите Enter.
        </Typography>
      )}

      {/* Поле ввода */}
      <TextField
        size="small"
        fullWidth
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        error={!!error}
        helperText={error || (input.trim() && !liveValidation ? `${formatCidr(parseSubnetInput(input).cidr ?? "")}` : "CIDR, маска, диапазон или shorthand (напр. 192.168.1)")}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={addRoute}
                  disabled={disabled || !input.trim() || !!liveValidation}
                  color="primary"
                >
                  <Add />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}