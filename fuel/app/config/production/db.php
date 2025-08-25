<?php
/**
 * The production database settings. These get merged with the global settings.
 */

return array(
	'default' => array(
		'type'        => 'pdo',
		'connection'  => array(
			'dsn'        => 'mysql:host=localhost;dbname=ai_dev_design_prod;charset=utf8mb4',
			'username'   => 'ai_dev_user',
			'password'   => 'your_secure_password_here',
			'persistent' => false,
		),
		'identifier'   => '`',
		'table_prefix' => '',
		'charset'      => 'utf8mb4',
		'enable_cache' => true,
		'profiling'    => false,
	),
);
