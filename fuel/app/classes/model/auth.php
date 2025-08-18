<?php

/**
 * Auth Model
 * 
 * Google ID Token authentication handler
 */
class Model_Auth extends \Model
{
    /**
     * Google Client ID (should be set in config)
     */
    protected static $google_client_id;
    
    /**
     * Initialize Google Client ID from config
     */
    public static function _init()
    {
        static::$google_client_id = \Config::get('google.client_id', '');
    }
    
    /**
     * Verify Google ID Token
     * 
     * @param string $id_token Google ID Token
     * @return array|false User data if valid, false if invalid
     */
    public static function verify_google_token($id_token)
    {
        try {
            if (empty($id_token)) {
                \Log::warning('Empty ID token provided');
                return false;
            }
            
            if (empty(static::$google_client_id)) {
                \Log::error('Google Client ID not configured');
                return false;
            }
            
            // Create Google Client
            $client = new \Google_Client(['client_id' => static::$google_client_id]);
            
            // Verify the ID token
            $payload = $client->verifyIdToken($id_token);
            
            if ($payload) {
                // Token is valid, extract user information
                $user_data = array(
                    'google_user_id' => $payload['sub'],
                    'email' => $payload['email'],
                    'name' => isset($payload['name']) ? $payload['name'] : '',
                    'picture' => isset($payload['picture']) ? $payload['picture'] : '',
                    'email_verified' => isset($payload['email_verified']) ? $payload['email_verified'] : false
                );
                
                \Log::info('Successfully verified Google ID token for user: ' . $payload['email']);
                return $user_data;
            } else {
                \Log::warning('Invalid Google ID token provided');
                return false;
            }
            
        } catch (\Exception $e) {
            \Log::error('Error verifying Google ID token: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Extract token from Authorization header
     * 
     * @return string|false Token if found, false otherwise
     */
    public static function extract_token_from_header()
    {
        // FuelPHPのInput::headers()を使用
        $auth_header = \Input::headers('Authorization');
        
        if ($auth_header) {
            // Expected format: "Bearer <token>"
            if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
                return $matches[1];
            }
        }
        
        return false;
    }
    
    /**
     * Get authenticated user from request
     * 
     * @return array|false User data if authenticated, false otherwise
     */
    public static function get_authenticated_user()
    {
        $token = static::extract_token_from_header();
        
        if (!$token) {
            return false;
        }
        
        // For development/testing - allow test token
        if ($token === 'test-token') {
            return array(
                'google_user_id' => 'test-user-123',
                'email' => 'test@example.com',
                'name' => 'Test User'
            );
        }
        
        return static::verify_google_token($token);
    }
    
    /**
     * Check if user has access to chart
     * 
     * @param string $user_id User's internal ID
     * @param string $chart_id Chart ID
     * @return bool True if user has access, false otherwise
     */
    public static function user_can_access_chart($user_id, $chart_id)
    {
        try {
            $chart = \Model_Chart::find($chart_id);
            
            if (!$chart) {
                return false;
            }
            
            return $chart->user_id === $user_id;
            
        } catch (\Exception $e) {
            \Log::error('Error checking chart access: ' . $e->getMessage());
            return false;
        }
    }
}