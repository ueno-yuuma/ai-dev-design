<?php

/**
 * Google OAuth 2.0 Configuration
 * .env ファイルから設定を読み込み
 */

return array(
    /**
     * Google OAuth 2.0 Client ID
     * .env の GOOGLE_CLIENT_ID から読み込まれます
     */
    'client_id' => Env::get('GOOGLE_CLIENT_ID'),
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