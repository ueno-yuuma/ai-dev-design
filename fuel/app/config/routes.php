<?php
return array(
	'_root_'  => 'welcome/index',  // The default route
	'_404_'   => 'welcome/404',    // The main 404 route
	
	'hello(/:name)?' => array('welcome/hello', 'name' => 'hello'),
	
	// API Routes
	'api/charts' => 'api/charts',
	'api/chart/(:segment)' => 'api/chart/$1',
	'api/health' => 'api/health',
);
