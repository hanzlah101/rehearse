//! Local SQLite for the desktop app, driven from TypeScript through Drizzle's
//! `sqlite-proxy` driver. Rows come back as positional arrays (Drizzle maps
//! them by column order), so joins with repeated column names stay intact.

use std::sync::Mutex;

use rusqlite::types::{Value, ValueRef};
use rusqlite::{Connection, params_from_iter};
use serde::Deserialize;
use serde_json::Value as Json;
use tauri::{AppHandle, Manager, State};

pub struct Database(Mutex<Connection>);

/// Opens (or creates) `rehearse.db` in the app data directory.
pub fn open(app: &AppHandle) -> Result<Database, Box<dyn std::error::Error>> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;

    let connection = Connection::open(dir.join("rehearse.db"))?;
    connection.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )?;

    Ok(Database(Mutex::new(connection)))
}

#[derive(Deserialize)]
pub struct Query {
    sql: String,
    params: Vec<Json>,
    method: String,
}

fn to_sql(value: &Json) -> Value {
    match value {
        Json::Null => Value::Null,
        Json::Bool(flag) => Value::Integer(i64::from(*flag)),
        Json::Number(number) => number
            .as_i64()
            .map(Value::Integer)
            .unwrap_or_else(|| Value::Real(number.as_f64().unwrap_or_default())),
        Json::String(text) => Value::Text(text.clone()),
        other => Value::Text(other.to_string()),
    }
}

fn to_json(value: ValueRef) -> Json {
    match value {
        ValueRef::Null => Json::Null,
        ValueRef::Integer(number) => Json::from(number),
        ValueRef::Real(number) => Json::from(number),
        ValueRef::Text(text) => Json::from(String::from_utf8_lossy(text).into_owned()),
        ValueRef::Blob(bytes) => Json::from(bytes.to_vec()),
    }
}

fn run(connection: &Connection, query: &Query) -> rusqlite::Result<Vec<Vec<Json>>> {
    let mut statement = connection.prepare_cached(&query.sql)?;
    let params = params_from_iter(query.params.iter().map(to_sql));

    if query.method == "run" {
        statement.execute(params)?;
        return Ok(Vec::new());
    }

    let columns = statement.column_count();
    let mut rows = statement.query(params)?;
    let mut result = Vec::new();

    while let Some(row) = rows.next()? {
        let mut values = Vec::with_capacity(columns);
        for index in 0..columns {
            values.push(to_json(row.get_ref(index)?));
        }
        result.push(values);
    }

    Ok(result)
}

/// One statement. `method` is Drizzle's: "run" executes, anything else
/// ("all", "get", "values") returns the rows.
#[tauri::command]
pub fn db_execute(database: State<Database>, query: Query) -> Result<Vec<Vec<Json>>, String> {
    let connection = database.0.lock().map_err(|error| error.to_string())?;
    run(&connection, &query).map_err(|error| error.to_string())
}

/// Several statements in one transaction (Drizzle batches and migrations):
/// all of them apply, or none do.
#[tauri::command]
pub fn db_batch(
    database: State<Database>,
    queries: Vec<Query>,
) -> Result<Vec<Vec<Vec<Json>>>, String> {
    let mut connection = database.0.lock().map_err(|error| error.to_string())?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;

    let results = queries
        .iter()
        .map(|query| run(&transaction, query))
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;

    transaction.commit().map_err(|error| error.to_string())?;
    Ok(results)
}
