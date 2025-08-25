<?php

namespace Fuel\Migrations;

/**
 * Sessionsテーブル作成マイグレーション (MySQL用)
 */
class Create_sessions_table
{
  /**
   * マイグレーション実行
   */
  public function up()
  {
    \DB::query("
      CREATE TABLE sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        google_user_id VARCHAR(255),
        email VARCHAR(255),
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ")->execute();
  }
  
  /**
   * マイグレーション取り消し
   */
  public function down()
  {
    \DB::query("DROP TABLE IF EXISTS sessions")->execute();
  }
}