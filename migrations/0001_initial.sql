-- KruWi Science Lab: Cloudflare D1 schema (never store student passwords in plaintext)
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS classes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 grade TEXT NOT NULL CHECK(grade IN ('ม.1','ม.2','ม.3')),
 room TEXT NOT NULL,
 academic_year INTEGER NOT NULL CHECK(academic_year BETWEEN 2560 AND 2700),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(grade,room,academic_year)
);
CREATE TABLE IF NOT EXISTS accounts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT NOT NULL COLLATE NOCASE UNIQUE,
 display_name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('teacher','student')),
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 must_change_password INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS students (
 account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 student_code TEXT NOT NULL UNIQUE,
 class_id INTEGER NOT NULL REFERENCES classes(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
CREATE TABLE IF NOT EXISTS login_attempts (
 username TEXT PRIMARY KEY COLLATE NOCASE,
 failures INTEGER NOT NULL DEFAULT 0,
 locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS scores (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 student_account_id INTEGER NOT NULL REFERENCES students(account_id) ON DELETE CASCADE,
 class_id INTEGER NOT NULL REFERENCES classes(id),
 category TEXT NOT NULL CHECK(category IN ('onet','quiz','manual')),
 topic TEXT NOT NULL,
 score REAL NOT NULL CHECK(score >= 0),
 max_score REAL NOT NULL CHECK(max_score > 0),
 source TEXT NOT NULL CHECK(source IN ('teacher','practice_unverified')),
 recorded_by INTEGER REFERENCES accounts(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(score <= max_score)
);
CREATE INDEX IF NOT EXISTS idx_scores_class_date ON scores(class_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_student_date ON scores(student_account_id,created_at DESC);
