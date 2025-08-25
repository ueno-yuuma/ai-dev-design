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
    \DB::query("
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        google_user_id VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255),
        name VARCHAR(255),
        created_at TEXT
      )
    ")->execute();
  }
  
  /**
   * マイグレーション取り消し
   */
  public function down()
  {
    \DB::query("DROP TABLE IF EXISTS users")->execute();
  }
}