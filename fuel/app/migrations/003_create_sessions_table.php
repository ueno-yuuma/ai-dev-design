<?php

namespace Fuel\Migrations;

/**
 * Sessionsテーブル作成マイグレーション (SQLite用)
 */
class Create_sessions_table
{
  /**
   * マイグレーション実行
   */
  public function up()
  {
    // SQLiteでsessionsテーブル作成
    \DB::query("
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        google_user_id TEXT,
        email TEXT,
        name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ")->execute();
    
    // インデックス作成
    \DB::query("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")->execute();
    \DB::query("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")->execute();
    
    \Cli::write('Sessions table created successfully with SQLite.', 'green');
  }
  
  /**
   * マイグレーション取り消し
   */
  public function down()
  {
    \DB::query("DROP TABLE IF EXISTS sessions")->execute();
    \Cli::write('Sessions table dropped successfully.', 'yellow');
  }
}