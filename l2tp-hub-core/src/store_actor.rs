use tokio::sync::{mpsc, oneshot};

use crate::db;
use crate::error::AppError;
use crate::store;
use crate::store::Store;

enum StoreRequest {
    Mutate {
        apply: Box<dyn FnOnce(&mut Store) -> Result<(), AppError> + Send>,
        respond_to: oneshot::Sender<Result<Store, AppError>>,
    },
}

/// Serializes every store mutation through a single mailbox.
///
/// The actor is a dumb transaction worker: commands decide what to change and
/// hand over the work as a closure, the actor only owns the exclusive
/// transaction. Each mutation runs as load, apply, save, commit on fresh
/// state, so concurrent commands can never overwrite each other's changes.
pub struct StoreActor {
    rx: mpsc::Receiver<StoreRequest>,
    pool: sqlx::SqlitePool,
}

/// Cloneable handle to submit mutations and read snapshots.
#[derive(Clone)]
pub struct StoreHandle {
    tx: mpsc::Sender<StoreRequest>,
    pool: sqlx::SqlitePool,
}

impl StoreActor {
    /// Spawn the actor on the current tokio runtime and return its handle.
    pub fn spawn(pool: sqlx::SqlitePool) -> StoreHandle {
        let (tx, rx) = mpsc::channel(64);
        tokio::spawn(Self { rx, pool: pool.clone() }.run());
        StoreHandle { tx, pool }
    }

    async fn run(mut self) {
        while let Some(request) = self.rx.recv().await {
            match request {
                StoreRequest::Mutate { apply, respond_to } => {
                    let result = self.mutate(apply).await;
                    // A dropped receiver only means the caller went away
                    let _ = respond_to.send(result);
                }
            }
        }
    }

    async fn mutate(
        &self,
        apply: Box<dyn FnOnce(&mut Store) -> Result<(), AppError> + Send>,
    ) -> Result<Store, AppError> {
        let mut tx = self.pool.begin().await.map_err(|e| format!("begin tx: {}", e))?;
        let mut store = db::load_store_conn(&mut *tx).await?;
        apply(&mut store)?;
        db::save_store_tx(&mut *tx, &store).await?;
        tx.commit().await.map_err(|e| format!("commit tx: {}", e))?;
        Ok(store)
    }
}

impl StoreHandle {
    /// Read a state snapshot directly from the pool.
    ///
    /// Not serialized through the mailbox: the snapshot may lag behind
    /// concurrent mutations.
    pub async fn load(&self) -> Store {
        store::load(&self.pool).await
    }

    /// Run one mutation serialized through the mailbox.
    ///
    /// The closure receives the freshly loaded state. The actor persists the
    /// diff and commits in a single transaction before this future resolves,
    /// then returns the post-mutation state to the caller.
    pub async fn mutate<F>(&self, apply: F) -> Result<Store, AppError>
    where
        F: FnOnce(&mut Store) -> Result<(), AppError> + Send + 'static,
    {
        let (respond_to, rx) = oneshot::channel();
        self.tx
            .send(StoreRequest::Mutate {
                apply: Box::new(apply),
                respond_to,
            })
            .await
            .map_err(|_| "store actor stopped".to_string())?;
        rx.await
            .map_err(|_| "store actor dropped the response".to_string())?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::connection::Connection;
    use crate::models::workspace::Workspace;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup() -> StoreHandle {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("connect");
        db::create_tables(&pool).await.expect("create tables");
        StoreActor::spawn(pool)
    }

    fn conn(id: &str) -> Connection {
        Connection {
            id: id.into(),
            service_name: format!("svc-{}", id),
            ..Default::default()
        }
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn concurrent_mutations_do_not_lose_updates() {
        let handle = setup().await;
        handle
            .mutate(|s| {
                let mut ws = Workspace::new("Main");
                ws.id = "ws-1".into();
                ws.connections.push(conn("c-1"));
                s.workspaces.push(ws);
                Ok(())
            })
            .await
            .expect("seed");

        let mut tasks = Vec::new();
        for _ in 0..20 {
            let handle = handle.clone();
            tasks.push(tokio::spawn(async move {
                handle
                    .mutate(|s| {
                        if let Some(c) = s.find_connection_mut("c-1") {
                            c.connect_count += 1;
                        }
                        Ok(())
                    })
                    .await
            }));
        }
        for task in tasks {
            task.await.expect("join").expect("mutate");
        }

        let state = handle.load().await;
        assert_eq!(state.find_connection("c-1").expect("c-1").connect_count, 20);
    }

    #[tokio::test]
    async fn failed_mutation_rolls_back() {
        let handle = setup().await;
        handle
            .mutate(|s| {
                let mut ws = Workspace::new("Main");
                ws.id = "ws-1".into();
                ws.connections.push(conn("c-1"));
                s.workspaces.push(ws);
                Ok(())
            })
            .await
            .expect("seed");

        let result = handle
            .mutate(|s| {
                if let Some(c) = s.find_connection_mut("c-1") {
                    c.service_name = "changed".into();
                }
                Err(AppError::from("boom"))
            })
            .await;
        assert!(result.is_err());

        let state = handle.load().await;
        assert_eq!(
            state.find_connection("c-1").expect("c-1").service_name,
            "svc-c-1"
        );
    }

    #[tokio::test]
    async fn mutate_returns_post_mutation_state() {
        let handle = setup().await;
        let state = handle
            .mutate(|s| {
                let mut ws = Workspace::new("Main");
                ws.id = "ws-1".into();
                ws.connections.push(conn("c-1"));
                s.workspaces.push(ws);
                Ok(())
            })
            .await
            .expect("seed");

        assert!(state.find_connection("c-1").is_some());
        assert!(state.workspaces.iter().any(|w| w.id == "ws-1"));
    }
}
