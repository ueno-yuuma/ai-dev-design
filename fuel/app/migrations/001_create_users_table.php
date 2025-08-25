<?php

namespace Fuel\Migrations;

/**
 * Usersテーブル作成マイグレーション (MySQL用)
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
        id INT AUTO_INCREMENT PRIMARY KEY,
        google_user_id VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255),
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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