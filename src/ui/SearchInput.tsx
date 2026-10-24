import { useRef, useEffect } from "react";
import { Box, InputBase, IconButton, Tooltip } from "@mui/material";
import { Search, ViewList, ViewModule } from "@mui/icons-material";

interface Props {
  value: string;
  onChange: (v: string) => void;
  groupByCompany: boolean;
  onToggleGroup: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchInput({ value, onChange, groupByCompany, onToggleGroup, inputRef }: Props) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        height: 48,
        px: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        gap: 1,
      }}
    >
      <Search sx={{ color: "text.secondary", fontSize: 20 }} />
      <InputBase
        inputRef={ref}
        placeholder="Поиск…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          flex: 1,
          fontSize: 16,
          "& input::placeholder": { color: "text.secondary", opacity: 1 },
        }}
      />
      <Tooltip title={groupByCompany ? "Плоский список" : "Группировать по компании"}>
        <IconButton size="small" onClick={onToggleGroup} sx={{ color: groupByCompany ? "primary.main" : "text.secondary" }}>
          {groupByCompany ? <ViewModule fontSize="small" /> : <ViewList fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
