<?php

namespace Fuel\Migrations;

/**
 * Usersテーブル作成マイグレーション (SQLite用)
 */
class Create_users_table
{
  /**
   * マイグレーション実行
   */
  public function up()
  {
    // SQLiteでusersテーブル作成
    \DB::query("
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_user_id TEXT NOT NULL UNIQUE,
        email TEXT,
        name TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    ")->execute();
    
    // インデックス作成
    \DB::query("CREATE INDEX IF NOT EXISTS idx_users_google_user_id ON users(google_user_id)")->execute();
    
    \Cli::write('Users table created successfully with SQLite.', 'green');
  }
  
  /**
   * マイグレーション取り消し
   */
  public function down()
  {
    \DB::query("DROP TABLE IF EXISTS users")->execute();
    \Cli::write('Users table dropped successfully.', 'yellow');
  }
}