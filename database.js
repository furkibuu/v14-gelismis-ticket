const Database = require("better-sqlite3");
const db = new Database("./ticketDB.sqlite");


db.prepare(`
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    yetkili_id TEXT,
    category TEXT,
    created_at INTEGER,
    closed_at INTEGER
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS ticket_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT,
    action TEXT,
    executor_id TEXT,
    timestamp INTEGER
)
`).run();


module.exports = db;
