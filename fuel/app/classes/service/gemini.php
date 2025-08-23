<?php

class Service_Gemini
{
    private $api_key;
    private $http_client;

    public function __construct($http_client = null)
    {
        Config::load('google', true);
        $this->api_key = Config::get('google.gemini_api_key');
        $this->http_client = $http_client; // For testing/mocking
    }

    /**
     * Generate a group name using Gemini API
     */
    public function generate_group_name(array $node_labels)
    {
        if (empty($this->api_key)) {
            \Log::error('Gemini API key is not configured.');
            throw new \Exception('Service temporarily unavailable.', 503);
        }

        // Sanitize node labels
        $sanitized_labels = array_map(function($label) {
            return substr(trim(strip_tags($label)), 0, 100);
        }, $node_labels);

        $prompt_text = "以下の要素をグループ化するのに最もふさわしい、簡潔な名前を1つだけ提案してください。\n\n要素リスト：\n- " . implode("\n- ", $sanitized_labels);

        $client = $this->create_secure_http_client();
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $this->api_key;

        $body = [
            'contents' => [['parts' => [['text' => $prompt_text]]]],
            'generationConfig' => [
                'temperature' => 0.5,
                'topK' => 1,
                'topP' => 1,
                'responseMimeType' => 'application/json',
                'responseSchema' => [
                    'type' => 'OBJECT',
                    'properties' => ['group_name' => ['type' => 'STRING']],
                    'required' => ['group_name']
                ]
            ]
        ];

        $response = $client->post($url, ['json' => $body]);

        if ($response->getStatusCode() !== 200) {
            \Log::error('Gemini API request failed with status: ' . $response->getStatusCode());
            throw new \Exception('Service temporarily unavailable.', 503);
        }

        $result = json_decode($response->getBody(), true);
        \Log::debug('Gemini API full response: ' . json_encode($result));

        if (!isset($result['candidates'][0])) {
            \Log::error('Gemini API response did not contain candidates. Response: ' . json_encode($result));
            throw new \Exception('Unable to generate group name. Please try again.', 503);
        }

        $candidate = $result['candidates'][0];
        $finishReason = $candidate['finishReason'] ?? 'UNKNOWN';

        if ($finishReason === 'MAX_TOKENS') {
            \Log::error('Gemini API response truncated due to MAX_TOKENS');
            throw new \Exception('Response was too long. Please try with fewer items.', 503);
        }

        if ($finishReason !== 'STOP') {
            \Log::error('Gemini API finished with reason: ' . $finishReason);
            throw new \Exception('Unable to generate group name. Please try again.', 503);
        }

        $responseText = $candidate['content']['parts'][0]['text'] ?? null;
        if (empty($responseText)) {
            \Log::error('Gemini API response did not contain text. Response structure: ' . json_encode($result));
            throw new \Exception('Unable to generate group name. Please try again.', 503);
        }

        $responseJson = json_decode($responseText, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            \Log::error('Failed to decode JSON from Gemini response. JSON error: ' . json_last_error_msg());
            throw new \Exception('Unable to generate group name. Please try again.', 503);
        }

        $generated_text = $responseJson['group_name'] ?? null;
        if (empty($generated_text)) {
            \Log::error('Parsed JSON from Gemini did not contain group_name.');
            throw new \Exception('Unable to generate group name. Please try again.', 503);
        }

        $clean_name = trim($generated_text, " *\t\n\r\0\x0B\"'");
        $clean_name = substr($clean_name, 0, 50);

        if (empty($clean_name)) {
            \Log::error('Generated group name is empty after sanitization.');
            throw new \Exception('Unable to generate group name. Please try again.', 503);
        }

        return $clean_name;
    }

    /**
     * AI-powered node splitting analysis
     */
    public function analyze_node_for_splitting(string $node_text, array $connections)
    {
        if (empty($this->api_key)) {
            \Log::error('Gemini API key is not configured for split_node.');
            throw new \Exception('サービス一時停止中', 503);
        }

        return $this->analyze_node_splitting($node_text, $connections, $this->api_key);
    }

    /**
     * Analyze node content for splitting with Gemini API
     */
    private function analyze_node_splitting($node_text, $connections, $api_key)
    {
        $incoming_text = !empty($connections['incoming']) ? implode(', ', $connections['incoming']) : 'なし';
        $outgoing_text = !empty($connections['outgoing']) ? implode(', ', $connections['outgoing']) : 'なし';

        $prompt = "以下のノードを、実行可能な具体的な行程・工程に分割してください。\n\n【分割対象ノード】\n{$node_text}\n\n【既存の接続情報】\n入力接続: {$incoming_text}\n出力接続: {$outgoing_text}\n\n【行程的分割の基準】\n- 実際に実行する具体的な手順・工程に分解\n- 各工程は独立して実行可能\n- 時系列順序で実行される流れ\n- 最小2個、最大5個程度の工程に分割\n\n【接続配分ルール】\n- 入力接続: 最初の工程が受け取る\n- 出力接続: 最後の工程から出力\n- 分割ノード間: 工程の順序で順次接続\n\n【分割例】\n元ノード：「資料作成」\n→ 工程1：「情報収集」\n→ 工程2：「構成検討」  \n→ 工程3：「文書作成」\n→ 工程4：「レビュー・修正」\n\nレスポンス例：\n{\n  \"can_split\": true,\n  \"splits\": [\n    {\"name\": \"情報収集\", \"sequence_order\": 1, \"should_receive_input\": true},\n    {\"name\": \"構成検討\", \"sequence_order\": 2},\n    {\"name\": \"文書作成\", \"sequence_order\": 3},\n    {\"name\": \"レビュー・修正\", \"sequence_order\": 4, \"should_provide_output\": true}\n  ]\n}";

        $client = $this->create_secure_http_client();
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $api_key;

        $body = [
            'contents' => [['parts' => [['text' => $prompt]]]],
            'generationConfig' => [
                'temperature' => 0.3,
                'topK' => 1,
                'topP' => 1,
                'responseMimeType' => 'application/json',
                'responseSchema' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'can_split' => ['type' => 'BOOLEAN'],
                        'splits' => [
                            'type' => 'ARRAY',
                            'items' => [
                                'type' => 'OBJECT',
                                'properties' => [
                                    'name' => ['type' => 'STRING'],
                                    'should_receive_input' => ['type' => 'BOOLEAN'],
                                    'should_provide_output' => ['type' => 'BOOLEAN'],
                                    'sequence_order' => ['type' => 'INTEGER']
                                ],
                                'required' => ['name', 'sequence_order']
                            ]
                        ],
                        'internal_connections' => [
                            'type' => 'ARRAY',
                            'items' => [
                                'type' => 'OBJECT',
                                'properties' => [
                                    'from_index' => ['type' => 'INTEGER'],
                                    'to_index' => ['type' => 'INTEGER'],
                                    'connection_type' => ['type' => 'STRING']
                                ],
                                'required' => ['from_index', 'to_index', 'connection_type']
                            ]
                        ]
                    ],
                    'required' => ['can_split']
                ]
            ]
        ];

        $response = $client->post($url, ['json' => $body]);

        if ($response->getStatusCode() !== 200) {
            \Log::error('Gemini API split_node request failed with status: ' . $response->getStatusCode());
            throw new \Exception('Gemini API request failed');
        }

        $result = json_decode($response->getBody(), true);
        \Log::debug('Gemini API split_node response: ' . json_encode($result));

        if (!isset($result['candidates'][0])) {
            \Log::error('Gemini API split_node response did not contain candidates');
            throw new \Exception('Invalid response from Gemini API');
        }

        $candidate = $result['candidates'][0];
        $finishReason = $candidate['finishReason'] ?? 'UNKNOWN';

        if ($finishReason !== 'STOP') {
            \Log::error('Gemini API split_node finished with reason: ' . $finishReason);
            throw new \Exception('Incomplete response from Gemini API');
        }

        $response_text = $candidate['content']['parts'][0]['text'] ?? null;

        if (empty($response_text)) {
            \Log::error('Gemini API split_node response did not contain text');
            throw new \Exception('Empty response from Gemini API');
        }

        $response_json = json_decode($response_text, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            \Log::error('Failed to decode JSON from Gemini split_node response. JSON error: ' . json_last_error_msg());
            throw new \Exception('Invalid JSON response from Gemini API');
        }

        return $response_json;
    }

    /**
     * Create a secure HTTP client with proper configuration
     */
    private function create_secure_http_client()
    {
        // Only allow in test environment for mocking
        if (defined('PHPUNIT_RUNNING') && isset($this->http_client)) {
            return $this->http_client;
        }

        // Production: always create a new, secure client
        return new \GuzzleHttp\Client([
            'timeout' => 30.0,
            'verify' => true, // SSL verification
            'http_errors' => false, // Don't throw exceptions on HTTP errors
            'headers' => [
                'User-Agent' => 'AI-Dev-Design/1.0'
            ]
        ]);
    }
}
