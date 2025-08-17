<?php
/**
 * The development database settings. These get merged with the global settings.
 */

return array(
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
		'charset'      => 'utf8',
		'enable_cache' => true,
		'profiling'    => false,
	),
	// MySQL用設定（Docker環境）
	'mysql' => array(
		'type'        => 'mysqli',
		'connection'  => array(
			'hostname'   => $_ENV['DB_HOST'] ?? 'db',
			'database'   => $_ENV['DB_NAME'] ?? 'fuelphp',
			'username'   => $_ENV['DB_USER'] ?? 'fuelphp',
			'password'   => $_ENV['DB_PASSWORD'] ?? 'fuelphp',
			'persistent' => false,
		),
		'identifier'   => '`',
		'table_prefix' => '',
		'charset'      => 'utf8',
		'collation'    => 'utf8_unicode_ci',
		'enable_cache' => true,
		'profiling'    => false,
	),
);
