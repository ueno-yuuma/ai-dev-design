<?php

/**
 * Google API Configuration
 */
return array(
    /**
     * Google OAuth 2.0 Client ID
     * This should be obtained from Google Cloud Console
     */
    'client_id' => 'your-google-client-id.apps.googleusercontent.com',
    
    /**
     * Google OAuth 2.0 Client Secret (if needed for server-side operations)
     */
    'client_secret' => 'your-google-client-secret',
    
    /**
     * Allowed domains for authentication (optional)
     * If specified, only users from these domains will be allowed
     */
    'allowed_domains' => array(
        // 'example.com',
        // 'company.com',
    ),
);