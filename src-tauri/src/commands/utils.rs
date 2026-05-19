use crate::models::connection::Connection;

pub(crate) fn service_hash(conn: &Connection, password: &str, shared_secret: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    conn.server.hash(&mut h);
    conn.username.hash(&mut h);
    conn.name.hash(&mut h);
    password.hash(&mut h);
    shared_secret.hash(&mut h);
    format!("{:x}", h.finish())
}
