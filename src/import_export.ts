import { invoke } from "@tauri-apps/api/core";

export async function exportConfig(password: string): Promise<boolean> {
  return await invoke<boolean>("export_config_dialog", { password });
}

export async function importConfig(password: string): Promise<boolean> {
  return await invoke<boolean>("import_config_dialog", { password });
}
