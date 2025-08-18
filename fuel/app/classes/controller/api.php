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
        // Skip authentication for health check
        if ($method === 'health') {
            return parent::router($method, $params);
        }

        // Authenticate user using Google ID Token
        $this->authenticated_user = Model_Auth::get_authenticated_user();
        
        if (!$this->authenticated_user) {
            $this->response(array(
                'error' => 'Authentication required. Please provide a valid Google ID token in Authorization header.'
            ), 401);
            return;
        }

        try {
            // Find or create user in database
            $this->current_user = Model_User::find_or_create_by_google_id(
                $this->authenticated_user['google_user_id'],
                $this->authenticated_user['email'],
                $this->authenticated_user['name']
            );
        } catch (\Exception $e) {
            \Log::error('User creation error: ' . $e->getMessage());
            $this->response(array(
                'error' => 'Authentication failed'
            ), 401);
            return;
        }

        // 認証成功時は通常のルーティングを実行
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
}