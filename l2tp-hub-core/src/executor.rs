/// Абстракция для запуска привилегированных команд.
/// GUI реализует через helper daemon (unix socket).
/// CLI может реализовать через sudo напрямую.
pub trait PrivilegedExecutor: Send + Sync {
    /// Запустить команду с root-привилегиями. Возвращает stdout.
    fn run(&self, args: &[&str]) -> Result<String, String>;
}
