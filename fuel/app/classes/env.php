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
            $value = static::parse_value($env_cache[$key]);
            
            // ファイルパス参照の場合はファイル内容を読み込み
            if (is_string($value) && static::is_file_reference($value)) {
                return static::load_from_file($value);
            }
            
            return $value;
        }
        
        return $default;
    }
    
    /**
     * ファイル参照かどうかを判定
     * 
     * @param string $value
     * @return bool
     */
    protected static function is_file_reference($value)
    {
        return strpos($value, 'file:') === 0;
    }
    
    /**
     * ファイルから内容を読み込み（相対パスのみ）
     * 
     * @param string $file_reference
     * @return string|array|null
     */
    protected static function load_from_file($file_reference)
    {
        $file_path = substr($file_reference, 5); // 'file:' を除去
        
        // プロジェクトルートからの相対パスとして処理
        $docroot = defined('DOCROOT') ? DOCROOT : realpath(__DIR__ . '/../../..');
        $full_path = $docroot . DIRECTORY_SEPARATOR . $file_path;
        
        if (!file_exists($full_path)) {
            Log::warning("Secret file not found: {$full_path}");
            return null;
        }
        
        // ファイル権限チェック
        if (!is_readable($full_path)) {
            Log::warning("Secret file not readable: {$full_path}");
            return null;
        }
        
        $content = file_get_contents($full_path);
        if ($content === false) {
            return null;
        }
        
        $content = trim($content);
        
        // JSONファイルの場合は配列として返す
        if (static::is_json_file($file_path)) {
            $json_data = json_decode($content, true);
            return $json_data !== null ? $json_data : $content;
        }
        
        return $content;
    }
    
    /**
     * JSONファイルかどうかを判定
     * 
     * @param string $file_path
     * @return bool
     */
    protected static function is_json_file($file_path)
    {
        return pathinfo($file_path, PATHINFO_EXTENSION) === 'json';
    }
    
    /**
     * Google OAuth設定を取得
     * 
     * @return array|null
     */
    public static function get_google_oauth()
    {
        $oauth_data = static::get('GOOGLE_OAUTH_JSON');
        
        if (is_array($oauth_data) && isset($oauth_data['web'])) {
            return $oauth_data['web'];
        }
        
        return $oauth_data;
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