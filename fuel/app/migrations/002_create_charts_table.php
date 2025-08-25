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
    \DB::query("
      CREATE TABLE charts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title VARCHAR(255),
        content TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ")->execute();
  }
  
  /**
   * マイグレーション取り消し
   */
  public function down()
  {
    \DB::query("DROP TABLE IF EXISTS charts")->execute();
  }
}