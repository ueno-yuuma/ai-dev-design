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
     * Verify Google ID Token using Google API Client Library (Official & Best Practice)
     * 
     * @param string $id_token Google ID Token
     * @return array|false User data if valid, false if invalid
     */
    public static function verify_google_token($id_token)
    {
        if (empty($id_token)) {
            \Log::warning('Auth: Empty ID token provided.');
            return false;
        }

        if (empty(static::$google_client_id)) {
            \Log::error('Auth: Google Client ID not configured on backend.');
            return false;
        }

        \Log::info('Auth: Attempting to verify token with backend Client ID: ' . static::$google_client_id);

        try {
            // Google API Client Libraryを使用してトークンを検証
            $payload = static::verify_with_google_client($id_token, static::$google_client_id);
            
            if ($payload) {
                \Log::info('Auth: Token successfully verified for email: ' . $payload['email']);
                $user_data = array(
                    'google_user_id' => $payload['sub'],
                    'email' => $payload['email'],
                    'name' => isset($payload['name']) ? $payload['name'] : '',
                    'picture' => isset($payload['picture']) ? $payload['picture'] : '',
                    'email_verified' => isset($payload['email_verified']) ? $payload['email_verified'] : false
                );
                return $user_data;
            } else {
                \Log::warning('Auth: Token verification failed.');
                return false;
            }
            
        } catch (\Exception $e) {
            \Log::error('Auth: Exception during token verification: ' . $e->getMessage());
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
        // FuelPHPのInputクラスからヘッダーを取得
        $headers = \Input::headers();
        
        // 'Authorization'ヘッダーが存在し、かつ空でないことを確認
        if (isset($headers['Authorization']) && !empty($headers['Authorization'])) {
            $auth_header_value = $headers['Authorization'];

            // "Bearer <token>"の形式に一致するかどうかを正規表現でチェック
            if (preg_match('/Bearer\s+(.*)$/i', $auth_header_value, $matches)) {
                // トークン部分を返す
                return $matches[1];
            }
        }
        
        // ヘッダーが存在しない、または形式が不正な場合はfalseを返す
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
    
    /**
     * Verify Google ID Token using Google API Client Library (Official Method)
     * 
     * @param string $id_token Google ID Token
     * @param string $client_id Expected client ID
     * @return array|false Payload if valid, false otherwise
     */
    protected static function verify_with_google_client($id_token, $client_id)
    {
        try {
            // Google API Clientライブラリの確認とロード
            if (!class_exists('Google_Client')) {
                // Composerのautoloaderが読み込まれていない場合
                if (file_exists(VENDORPATH . 'autoload.php')) {
                    require_once VENDORPATH . 'autoload.php';
                } else {
                    \Log::error('Auth: Google API Client library not found. Run composer install.');
                    return false;
                }
            }
            
            // Google Clientを初期化
            $client = new \Google_Client(['client_id' => $client_id]);
            
            // ID Tokenを検証（これだけで完全な検証が行われる）
            $payload = $client->verifyIdToken($id_token);
            
            if ($payload) {
                \Log::info('Auth: Token successfully verified using Google API Client');
                return $payload;
            } else {
                \Log::warning('Auth: Token verification failed - verifyIdToken returned false');
                return false;
            }
            
        } catch (\Google_Service_Exception $e) {
            \Log::error('Auth: Google Service Exception: ' . $e->getMessage());
            return false;
        } catch (\Exception $e) {
            \Log::error('Auth: Exception during Google Client verification: ' . $e->getMessage());
            return false;
        }
    }
    
}