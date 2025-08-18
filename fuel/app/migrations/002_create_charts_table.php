<?php

namespace Fuel\Migrations;

/**
 * Chartsテーブル作成マイグレーション (SQLite用)
 */
class Create_charts_table
{
  /**
   * マイグレーション実行
   */
  public function up()
  {
    // SQLiteでchartsテーブル作成
    \DB::query("
      CREATE TABLE IF NOT EXISTS charts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        content TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ")->execute();
    
    // インデックス作成
    \DB::query("CREATE INDEX IF NOT EXISTS idx_charts_user_id ON charts(user_id)")->execute();
    \DB::query("CREATE INDEX IF NOT EXISTS idx_charts_created_at ON charts(created_at)")->execute();
    \DB::query("CREATE INDEX IF NOT EXISTS idx_charts_updated_at ON charts(updated_at)")->execute();
    \DB::query("CREATE INDEX IF NOT EXISTS idx_charts_title ON charts(title)")->execute();
    \DB::query("CREATE INDEX IF NOT EXISTS idx_charts_user_created ON charts(user_id, created_at)")->execute();
    
    \Cli::write('Charts table created successfully with SQLite.', 'green');
  }
  
  /**
   * マイグレーション取り消し
   */
  public function down()
  {
    \DB::query("DROP TABLE IF EXISTS charts")->execute();
    \Cli::write('Charts table dropped successfully.', 'yellow');
  }
}