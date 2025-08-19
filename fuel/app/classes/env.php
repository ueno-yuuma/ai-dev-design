<?php

/**
 * Environment Variables Helper for FuelPHP
 * 環境変数ヘルパークラス
 */
class Env
{
    /**
     * 環境変数の値を取得
     * 
     * @param string $key 環境変数名
     * @param mixed $default デフォルト値
     * @return mixed
     */
    public static function get($key, $default = null)
    {
        // 1. 環境変数から取得を試行
        $value = getenv($key);
        if ($value !== false) {
            return static::parse_value($value);
        }
        
        // 2. $_ENV から取得を試行
        if (isset($_ENV[$key])) {
            return static::parse_value($_ENV[$key]);
        }
        
        // 3. $_SERVER から取得を試行
        if (isset($_SERVER[$key])) {
            return static::parse_value($_SERVER[$key]);
        }
        
        // 4. .envファイルから読み込み（キャッシュあり）
        static $env_cache = null;
        if ($env_cache === null) {
            $env_cache = static::load_env_file();
        }
        
        if (isset($env_cache[$key])) {
            return static::parse_value($env_cache[$key]);
        }
        
        return $default;
    }
    
    /**
     * Google OAuth Client ID を取得
     * 
     * @return string
     */
    public static function get_google_client_id()
    {
        return static::get('GOOGLE_CLIENT_ID', '');
    }
    
    /**
     * Google OAuth Client Secret を取得（サーバーサイドのみ）
     * 
     * @return string
     */
    public static function get_google_client_secret()
    {
        return static::get('GOOGLE_CLIENT_SECRET', '');
    }
    
    /**
     * .envファイルを読み込み
     * 
     * @return array
     */
    protected static function load_env_file()
    {
        $env_data = array();
        $docroot = defined('DOCROOT') ? DOCROOT : realpath(__DIR__ . '/../../..');
        $env_file = $docroot . DIRECTORY_SEPARATOR . '.env';
        
        if (!file_exists($env_file)) {
            return $env_data;
        }
        
        $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // コメント行をスキップ
            if (strpos($line, '#') === 0) {
                continue;
            }
            
            // KEY=VALUE 形式の行を解析
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // クォートを除去
                if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                    (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                    $value = substr($value, 1, -1);
                }
                
                $env_data[$key] = $value;
            }
        }
        
        return $env_data;
    }
    
    /**
     * 値を適切な型に変換
     * 
     * @param string $value
     * @return mixed
     */
    protected static function parse_value($value)
    {
        // 真偽値の変換
        $lower = strtolower($value);
        if (in_array($lower, array('true', 'false'))) {
            return $lower === 'true';
        }
        
        // 数値の変換
        if (is_numeric($value)) {
            return strpos($value, '.') !== false ? (float) $value : (int) $value;
        }
        
        // nullの変換
        if ($lower === 'null') {
            return null;
        }
        
        return $value;
    }
    
    /**
     * 環境変数をセット
     * 
     * @param string $key
     * @param mixed $value
     */
    public static function set($key, $value)
    {
        putenv("$key=$value");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
    
    /**
     * 必須環境変数をチェック
     * 
     * @param array $required_keys
     * @throws FuelException
     */
    public static function require_vars($required_keys)
    {
        $missing = array();
        
        foreach ($required_keys as $key) {
            if (static::get($key) === null) {
                $missing[] = $key;
            }
        }
        
        if (!empty($missing)) {
            throw new FuelException('Required environment variables are missing: ' . implode(', ', $missing));
        }
    }
}