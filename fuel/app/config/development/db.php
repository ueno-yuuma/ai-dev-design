<?php
/**
 * The development database settings. These get merged with the global settings.
 * 
 * このプロジェクトはSQLiteデータベースを使用します。
 * データベースファイル: fuel/app/database/test.db
 */

return array(
	// SQLiteデータベース設定（メイン使用）
	'default' => array(
		'type'        => 'pdo',
		'connection'  => array(
			'dsn'        => 'sqlite:' . APPPATH . 'database/test.db',
			'username'   => '',
			'password'   => '',
			'persistent' => false,
		),
		'identifier'   => '"',
		'table_prefix' => '',
		'charset'      => null, // SQLiteではcharsetをnullに設定
		'enable_cache' => true,
		'profiling'    => false,
	),
);
