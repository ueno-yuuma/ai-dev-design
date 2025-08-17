<?php

namespace Fuel\Migrations;

/**
 * Chartテーブル作成マイグレーション
 */
class Create_chart_table
{
  /**
   * マイグレーション実行
   */
  public function up()
  {
    // SQLiteの場合
    \DB::query("
      CREATE TABLE IF NOT EXISTS chart (
        id TEXT PRIMARY KEY,
        title TEXT,
        google_user_id TEXT NOT NULL,
        content TEXT,
        updated_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ")->execute();
    
    // インデックス作成
    \DB::query("CREATE INDEX IF NOT EXISTS idx_google_user_id ON chart(google_user_id)")->execute();
    \DB::query("CREATE INDEX IF NOT EXISTS idx_updated_at ON chart(updated_at)")->execute();
    
    \Cli::write('Chart table created successfully.', 'green');
  }
  
  /**
   * マイグレーション取り消し
   */
  public function down()
  {
    \DB::query("DROP TABLE IF EXISTS chart")->execute();
    \Cli::write('Chart table dropped successfully.', 'yellow');
  }
}