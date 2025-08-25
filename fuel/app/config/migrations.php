<?php
/**
 * Fuel
 *
 * Fuel is a fast, lightweight, community driven PHP5 framework.
 *
 * @package    Fuel
 * @version    1.8
 * @author     Fuel Development Team
 * @license    MIT License
 * @copyright  2010 - 2016 Fuel Development Team
 * @link       http://fuelphp.com
 */

return array(

	/*
	| Which version of the schema should be considered "current"
	|
	|	Default: 0
	|
	*/
	'version' => array(
		'app' => array(
			'default' => 3, // Set to the latest migration number
		),
		'module' => array(),
		'package' => array(),
	),

	/*
	| Which folder should be used for migrations
	|
	|	Default: migrations/
	|
	*/
	'folder' => 'migrations/',

	/*
	| Which table should be used for schema version
	|
	|	Default: migration
	|
	*/
	'table' => 'migration',

	/*
	| Defaults connection (if null it will use the default_connection of \Config::get('db.default')
	|
	|	Default: null
	|
	*/
	'connection' => null,
);