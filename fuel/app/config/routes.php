<?php
return array(
	'_root_'  => 'chart/index',  // フロントエンドアプリをデフォルトルートに設定
	'_404_'   => 'welcome/404',    // The main 404 route
	
	'hello(/:name)?' => array('welcome/hello', 'name' => 'hello'),
	
	// フロントエンドルート
	'chart' => 'chart/index',
	'chart/demo' => 'chart/demo',
	'chart/help' => 'chart/help',
	'chart/error' => 'chart/error',
	
	// API Routes
	'api/charts' => 'api/charts',
	'api/chart/(:segment)' => 'api/chart/$1',
	'api/health' => 'api/health',
	
	// 旧ルート（下位互換）
	'welcome' => 'welcome/index',
);
