<?php

return [
    'client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',
    'gemini_api_key' => getenv('GEMINI_API_KEY') ?: '',
];
