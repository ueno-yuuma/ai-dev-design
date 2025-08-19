<?php

/**
 * Google OAuth 2.0 Configuration
 * secrets/google_oauth_client.json から設定を読み込み
 */

// 基本設定（一部の機能で使用）
$oauth_config = array();

return array(
    /**
     * Google OAuth 2.0 設定（JSONファイルから読み込み）
     */
    'client_id' => isset($oauth_config['client_id']) ? $oauth_config['client_id'] : null,
    'client_secret' => isset($oauth_config['client_secret']) ? $oauth_config['client_secret'] : null,
    'auth_uri' => 'https://accounts.google.com/o/oauth2/auth',
    'token_uri' => 'https://oauth2.googleapis.com/token',
    'redirect_uris' => array(),
    
    /**
     * 認証を許可するドメイン (オプション)
     * 指定した場合、これらのドメインのユーザーのみ認証が許可されます
     */
    'allowed_domains' => array(
        // 例: 特定の組織のみに制限する場合
        // 'example.com',
        // 'company.com',
    ),
    
    /**
     * OAuth スコープ
     */
    'scopes' => array(
        'profile',
        'email'
    ),
    
    /**
     * セッション設定
     */
    'session' => array(
        'token_name' => 'google_access_token',
        'user_info_name' => 'google_user_info',
        'expire_time' => 3600, // 1時間
    ),
);