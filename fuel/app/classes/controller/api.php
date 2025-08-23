<?php

/**
 * API Controller
 * 
 * REST API endpoints for chart management
 */
class Controller_Api extends Controller_Rest
{
    protected $authenticated_user = null;
    protected $current_user = null;
    protected $format = 'json';
    
    public function before()
    {
        parent::before();
        
        // Force JSON format for all responses
        $this->format = 'json';
        $this->response->set_header('Content-Type', 'application/json');
        
        // CORS headers
        $this->response->set_header('Access-Control-Allow-Origin', '*');
        $this->response->set_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $this->response->set_header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Handle preflight requests
        if (Input::method() === 'OPTIONS') {
            return $this->response();
        }
    }

    /**
     * Router method override for authentication
     */
    public function router($method, $params)
    {
        // Skip authentication for health check and auth endpoints
        $public_endpoints = array('health', 'login', 'status');
        if (in_array($method, $public_endpoints)) {
            return parent::router($method, $params);
        }

        // Check for cookie-based authentication
        $session_id = Cookie::get('auth_session');
        
        if (!$session_id) {
            $this->response(array(
                'error' => 'Authentication required. Please login first.'
            ), 401);
            return;
        }
        
        $user_data = Model_Session::get_session($session_id);
        
        if (!$user_data) {
            Cookie::delete('auth_session', '/');
            $this->response(array(
                'error' => 'Session expired. Please login again.'
            ), 401);
            return;
        }

        try {
            // Load current user from database
            $this->current_user = Model_User::find($user_data['user_id']);
            
            if (!$this->current_user) {
                Model_Session::destroy_session($session_id);
                Cookie::delete('auth_session', '/');
                $this->response(array(
                    'error' => 'User not found. Please login again.'
                ), 401);
                return;
            }
            
        } catch (\Exception $e) {
            \Log::error('User loading error: ' . $e->getMessage());
            $this->response(array(
                'error' => 'Authentication failed'
            ), 401);
            return;
        }

        // Authentication successful, continue with normal routing
        parent::router($method, $params);
    }

    /**
     * GET /api/charts
     * Get all charts for a user
     */
    public function get_charts()
    {
        try {
            $charts = Model_Chart::get_user_charts($this->current_user->id);
            
            return $this->response(array(
                'success' => true,
                'data' => $charts
            ));
            
        } catch (\Exception $e) {
            \Log::error('API Error in get_charts: ' . $e->getMessage());
            return $this->response(array(
                'error' => 'Internal server error'
            ), 500);
        }
    }

    /**
     * GET /api/chart/:id
     * Get a specific chart by ID
     */
    public function get_chart($id = null)
    {
        try {
            if (empty($id)) {
                return $this->response(array(
                    'error' => 'Chart ID is required'
                ), 400);
            }
            
            // Check if user has access to this chart
            if (!Model_Auth::user_can_access_chart($this->current_user->id, $id)) {
                return $this->response(array(
                    'error' => 'Chart not found or access denied'
                ), 404);
            }
            
            $chart = Model_Chart::find($id);
            
            if (!$chart) {
                return $this->response(array(
                    'error' => 'Chart not found'
                ), 404);
            }
            
            return $this->response(array(
                'success' => true,
                'data' => $chart->to_array()
            ));
            
        } catch (\Exception $e) {
            \Log::error('API Error in get_chart: ' . $e->getMessage());
            return $this->response(array(
                'error' => 'Internal server error'
            ), 500);
        }
    }

    /**
     * POST /api/charts
     * Create a new chart
     */
    public function post_charts()
    {
        try {
            $input = Input::json();
            
            if (empty($input['title'])) {
                return $this->response(array(
                    'error' => 'title is required'
                ), 400);
            }
            
            $chart = Model_Chart::create_chart(
                $input['title'],
                $this->current_user->id,
                isset($input['content']) ? $input['content'] : ''
            );
            
            return $this->response(array(
                'success' => true,
                'data' => $chart->to_array()
            ), 201);
            
        } catch (\Exception $e) {
            \Log::error('API Error in post_charts: ' . $e->getMessage());
            return $this->response(array(
                'error' => 'Internal server error'
            ), 500);
        }
    }

    /**
     * PUT /api/chart/:id
     * Update an existing chart
     */
    public function put_chart($id = null)
    {
        try {
            if (empty($id)) {
                return $this->response(array(
                    'error' => 'Chart ID is required'
                ), 400);
            }
            
            // Check if user has access to this chart
            if (!Model_Auth::user_can_access_chart($this->current_user->id, $id)) {
                return $this->response(array(
                    'error' => 'Chart not found or access denied'
                ), 404);
            }
            
            $chart = Model_Chart::find($id);
            
            if (!$chart) {
                return $this->response(array(
                    'error' => 'Chart not found'
                ), 404);
            }
            
            $input = Input::json();
            
            $chart->update_chart(
                isset($input['title']) ? $input['title'] : null,
                isset($input['content']) ? $input['content'] : null
            );
            
            return $this->response(array(
                'success' => true,
                'data' => $chart->to_array()
            ));
            
        } catch (\Exception $e) {
            \Log::error('API Error in put_chart: ' . $e->getMessage());
            return $this->response(array(
                'error' => 'Internal server error'
            ), 500);
        }
    }

    /**
     * DELETE /api/chart/:id
     * Delete a chart
     */
    public function delete_chart($id = null)
    {
        try {
            if (empty($id)) {
                return $this->response(array(
                    'error' => 'Chart ID is required'
                ), 400);
            }
            
            // Check if user has access to this chart
            if (!Model_Auth::user_can_access_chart($this->current_user->id, $id)) {
                return $this->response(array(
                    'error' => 'Chart not found or access denied'
                ), 404);
            }
            
            $chart = Model_Chart::find($id);
            
            if (!$chart) {
                return $this->response(array(
                    'error' => 'Chart not found'
                ), 404);
            }
            
            $chart->delete();
            
            return $this->response(array(
                'success' => true,
                'message' => 'Chart deleted successfully'
            ));
            
        } catch (\Exception $e) {
            \Log::error('API Error in delete_chart: ' . $e->getMessage());
            return $this->response(array(
                'error' => 'Internal server error'
            ), 500);
        }
    }

    /**
     * POST /api/auth/login
     * Server-side Google token verification and session creation
     */
    public function post_login()
    {
        try {
            $input = Input::json();
            
            if (empty($input['credential'])) {
                return $this->response(array(
                    'error' => 'Google credential is required'
                ), 400);
            }
            
            // Verify Google ID Token on server-side
            $user_data = Model_Auth::verify_google_token($input['credential']);
            
            if (!$user_data) {
                return $this->response(array(
                    'error' => 'Invalid Google credential'
                ), 401);
            }
            
            // Find or create user in database
            $user = Model_User::find_or_create_by_google_id(
                $user_data['google_user_id'],
                $user_data['email'],
                $user_data['name']
            );
            
            // Create secure session
            $session_id = Model_Session::create_session($user->id, $user_data);
            
            // Set HttpOnly cookie (FuelPHP syntax)
            Cookie::set('auth_session', $session_id, time() + (24 * 60 * 60), '/', null, false, true);
            
            return $this->response(array(
                'success' => true,
                'user' => array(
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email
                )
            ));
            
        } catch (\Exception $e) {
            \Log::error('Login error: ' . $e->getMessage());
            return $this->response(array(
                'error' => 'Authentication failed'
            ), 500);
        }
    }
    
    /**
     * POST /api/auth/logout
     * Clear authentication session
     */
    public function post_logout()
    {
        $session_id = Cookie::get('auth_session');
        
        if ($session_id) {
            Model_Session::destroy_session($session_id);
        }
        
        Cookie::delete('auth_session', '/');
        
        return $this->response(array(
            'success' => true,
            'message' => 'Logged out successfully'
        ));
    }
    
    /**
     * GET /api/auth/status
     * Check authentication status
     */
    public function get_status()
    {
        $session_id = Cookie::get('auth_session');
        
        if (!$session_id) {
            return $this->response(array(
                'authenticated' => false
            ));
        }
        
        $user_data = Model_Session::get_session($session_id);
        
        if (!$user_data) {
            Cookie::delete('auth_session', '/');
            return $this->response(array(
                'authenticated' => false
            ));
        }
        
        return $this->response(array(
            'authenticated' => true,
            'user' => array(
                'id' => $user_data['user_id'],
                'name' => $user_data['name'],
                'email' => $user_data['email']
            )
        ));
    }

    /**
     * GET /api/health
     * Health check endpoint
     */
    public function get_health()
    {
        // Set JSON format explicitly
        $this->response->set_header('Content-Type', 'application/json');
        
        $db_status = false;
        try {
            $db_status = Model_Chart::test_connection();
        } catch (\Exception $e) {
            \Log::error('Health check database error: ' . $e->getMessage());
        }
        
        return $this->response(array(
            'status' => 'healthy',
            'timestamp' => date('Y-m-d H:i:s'),
            'database' => $db_status,
            'database_type' => 'SQLite',
            'database_path' => APPPATH . 'database/test.db'
        ));
    }
    
    /**
     * POST /api/generate_name
     * Generate a group name using Gemini API
     */
    public function post_generate_name()
    {
        try {
            $node_labels = Input::json('node_labels');

            if (empty($node_labels) || !is_array($node_labels)) {
                return $this->response(['error' => 'Invalid input. "node_labels" is required as a non-empty array.'], 400);
            }

            if (count($node_labels) > 10) {
                return $this->response(['error' => 'Too many node labels. Maximum 10 allowed.'], 400);
            }

            $gemini_service = new Service_Gemini();
            $group_name = $gemini_service->generate_group_name($node_labels);

            return $this->response(['group_name' => $group_name], 200);

        } catch (\GuzzleHttp\Exception\RequestException $e) {
            \Log::error('Guzzle error in post_generate_name: ' . $e->getMessage());
            return $this->response(['error' => 'Service temporarily unavailable.'], 503);
        } catch (\Exception $e) {
            \Log::error('General error in post_generate_name: ' . $e->getMessage());
            $error_code = $e->getCode() ?: 500;
            return $this->response(['error' => $e->getMessage()], $error_code);
        }
    }

    /**
     * POST /api/split_node
     * AI-powered node splitting analysis
     */
    public function post_split_node()
    {
        try {
            $input = Input::json();
            $node_text = $input['node_text'] ?? '';
            $node_connections = $input['connections'] ?? ['incoming' => [], 'outgoing' => []];

            if (empty(trim($node_text))) {
                return $this->response(['error' => 'ノードテキストが必要です'], 400);
            }
            if (strlen($node_text) > 1000) {
                return $this->response(['error' => 'テキストが長すぎます（1000文字以内）'], 400);
            }

            $gemini_service = new Service_Gemini();
            $split_result = $gemini_service->analyze_node_for_splitting($node_text, $node_connections);

            return $this->response($split_result);

        } catch (\GuzzleHttp\Exception\RequestException $e) {
            \Log::error('Guzzle error in post_split_node: ' . $e->getMessage());
            return $this->response(['error' => 'サービス一時停止中'], 503);
        } catch (\Exception $e) {
            \Log::error('General error in post_split_node: ' . $e->getMessage());
             $error_code = $e->getCode() ?: 500;
            return $this->response(['error' => $e->getMessage()], $error_code);
        }
    }
}