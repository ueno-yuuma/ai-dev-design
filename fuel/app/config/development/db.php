<?php
/**
 * The development database settings. These get merged with the global settings.
 * 
 * このプロジェクトはMySQLデータベースを使用します。
 * データベース: ai_dev_design
 */

return array(
	// MySQLデータベース設定（メイン使用）
	'default' => array(
		'type'        => 'pdo',
		'connection'  => array(
			'dsn'        => 'mysql:host=db;dbname=ai_dev_design;charset=utf8mb4',
			'username'   => 'ai_dev_user',
			'password'   => 'ai_dev_password',
			'persistent' => false,
		),
		'identifier'   => '`',
		'table_prefix' => '',
		'charset'      => 'utf8mb4',
		'enable_cache' => true,
		'profiling'    => false,
	),
);
