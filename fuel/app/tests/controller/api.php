<?php

/**
 * Tests for the API Controller
 *
 * @group App
 */
class Test_Controller_Api extends TestCase
{
    private static $test_user = null;

    public static function setUpBeforeClass(): void
    {
        // Create a temporary user for all tests in this class
        self::$test_user = Model_User::find_or_create_by_google_id(
            'test-user-12345',
            'test.user@example.com',
            'Test User'
        );
    }

    public static function tearDownAfterClass(): void
    {
        // Clean up the temporary user
        if (self::$test_user) {
            self::$test_user->delete();
            self::$test_user = null;
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure the user exists for each test
        if (!self::$test_user) {
            self::setUpBeforeClass();
        }
    }

    /**
     * Integration test for the post_generate_name method.
     *
     * This test makes a real API call to the Gemini API.
     * It requires a valid GEMINI_API_KEY to be set in the environment.
     */
    public function test_integration_post_generate_name_success()
    {
        // Skip the test if the API key is not configured
        Config::load('google', true);
        $api_key = Config::get('google.gemini_api_key');
        if (empty($api_key)) {
            $this->markTestSkipped('GEMINI_API_KEY is not set in the environment, skipping integration test.');
        }

        // Instantiate the controller
        $controller = new Controller_Api();

        // Manually set the authenticated user to bypass session/cookie checks
        $controller->current_user = self::$test_user;

        // Set the JSON input for the request
        $node_labels = ['ユーザー認証', 'データベース接続', '決済処理'];
        Input::json('node_labels', $node_labels);

        // Call the method directly
        $response = $controller->post_generate_name();

        // Get the response body and decode it
        $body = json_decode($response->body, true);

        // Assertions
        $this->assertEquals(200, $response->status);
        $this->assertIsArray($body);
        $this->assertArrayHasKey('group_name', $body);
        $this->assertIsString($body['group_name']);
        $this->assertNotEmpty($body['group_name']);

        // Log the result for manual verification
        Log::info('Gemini API generated group name: ' . $body['group_name']);
    }

    public function test_post_generate_name_no_input()
    {
        // Instantiate the controller
        $controller = new Controller_Api();
        $controller->current_user = self::$test_user;

        // Set empty JSON input
        Input::json('node_labels', []);

        // Call the method
        $response = $controller->post_generate_name();
        $body = json_decode($response->body, true);

        // Assert that it returns a 400 Bad Request error
        $this->assertEquals(400, $response->status);
        $this->assertArrayHasKey('error', $body);
    }
}
