<?php

/**
 * Google API Configuration - Production Environment
 * 本番環境用設定
 */
return array(
    /**
     * 本番環境用Google OAuth 2.0 Client ID
     * 環境変数から取得（本番環境では必須）
     */
    'client_id' => Env::get('GOOGLE_CLIENT_ID'),
    
    /**
     * 本番環境用Google OAuth 2.0 Client Secret
     * 環境変数から取得（本番環境では必須）
     */
    'client_secret' => Env::get('GOOGLE_CLIENT_SECRET'),
    
    /**
     * 本番環境では特定ドメインのみ許可（必要に応じて）
     */
    'allowed_domains' => array(
        // 'yourcompany.com',
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