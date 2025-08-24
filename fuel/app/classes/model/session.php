<?php

class Model_Session
{
    /**
     * Session directory path
     */
    private static function get_session_dir()
    {
        return APPPATH . 'tmp/sessions/';
    }

    /**
     * Create secure session
     */
    public static function create_session($user_id, $user_data)
    {
        $session_id = bin2hex(random_bytes(32));

        // Store session in database or cache (using simple file storage for now)
        $session_data = array(
            'user_id' => $user_id,
            'email' => $user_data['email'],
            'name' => $user_data['name'],
            'created_at' => time(),
            'expires_at' => time() + (24 * 60 * 60)
        );

        $session_dir = self::get_session_dir();
        $session_file = $session_dir . $session_id;

        // Create sessions directory if it doesn't exist
        if (!is_dir($session_dir)) {
            mkdir($session_dir, 0700, true);
        }

        file_put_contents($session_file, json_encode($session_data));

        return $session_id;
    }

    /**
     * Get session data
     */
    public static function get_session($session_id)
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $session_id)) {
            return false;
        }

        $session_file = self::get_session_dir() . $session_id;

        if (!file_exists($session_file)) {
            return false;
        }

        $session_data = json_decode(file_get_contents($session_file), true);

        if (!$session_data || $session_data['expires_at'] < time()) {
            self::destroy_session($session_id);
            return false;
        }

        return $session_data;
    }

    /**
     * Destroy session
     */
    public static function destroy_session($session_id)
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $session_id)) {
            return;
        }

        $session_file = self::get_session_dir() . $session_id;

        if (file_exists($session_file)) {
            unlink($session_file);
        }
    }
}
