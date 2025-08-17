<?php

/**
 * Chart Model
 * 
 * chartテーブルにアクセスするためのモデル
 */
class Model_Chart extends \Model
{
  /**
   * テーブル名
   */
  protected static $_table_name = 'chart';
  
  /**
   * 主キー
   */
  protected static $_primary_key = array('id');
  
  /**
   * プロパティ
   */
  protected static $_properties = array(
    'id' => array(
      'data_type' => 'varchar',
      'label' => 'ID',
    ),
    'title' => array(
      'data_type' => 'varchar',
      'label' => 'タイトル',
    ),
    'google_user_id' => array(
      'data_type' => 'varchar',
      'label' => 'Google User ID',
      'validation' => array('required'),
    ),
    'content' => array(
      'data_type' => 'text',
      'label' => 'Mermaidコード',
    ),
    'updated_at' => array(
      'data_type' => 'varchar',
      'label' => '更新日時',
    ),
    'created_at' => array(
      'data_type' => 'varchar',
      'label' => '作成日時',
    ),
  );
  
  /**
   * 新しいチャートを作成
   * 
   * @param string $title チャートタイトル
   * @param string $google_user_id Google User ID
   * @param string $content Mermaidコード
   * @return Model_Chart
   */
  public static function create_chart($title, $google_user_id, $content = '')
  {
    $chart = new static();
    $chart->id = static::generate_uuid();
    $chart->title = $title;
    $chart->google_user_id = $google_user_id;
    $chart->content = $content;
    $chart->created_at = date('Y-m-d H:i:s');
    $chart->updated_at = date('Y-m-d H:i:s');
    
    $chart->save();
    return $chart;
  }
  
  /**
   * ユーザーのチャート一覧を取得
   * 
   * @param string $google_user_id Google User ID
   * @return array
   */
  public static function get_user_charts($google_user_id)
  {
    return \DB::select()
      ->from(static::$_table_name)
      ->where('google_user_id', $google_user_id)
      ->order_by('updated_at', 'desc')
      ->execute()
      ->as_array();
  }
  
  /**
   * チャートを更新
   * 
   * @param string $title タイトル
   * @param string $content Mermaidコード
   */
  public function update_chart($title = null, $content = null)
  {
    if ($title !== null) {
      $this->title = $title;
    }
    if ($content !== null) {
      $this->content = $content;
    }
    $this->updated_at = date('Y-m-d H:i:s');
    
    $this->save();
  }
  
  /**
   * データベース接続テスト用メソッド
   * 
   * @return bool
   */
  public static function test_connection()
  {
    try {
      \DB::select('1')->execute();
      return true;
    } catch (\Exception $e) {
      \Log::error('Database connection test failed: ' . $e->getMessage());
      return false;
    }
  }
  
  /**
   * テーブル存在確認
   * 
   * @return bool
   */
  public static function table_exists()
  {
    try {
      \DB::select()->from(static::$_table_name)->limit(1)->execute();
      return true;
    } catch (\Exception $e) {
      \Log::error('Table existence check failed: ' . $e->getMessage());
      return false;
    }
  }
  
  /**
   * UUID生成
   * 
   * @return string
   */
  public static function generate_uuid()
  {
    return sprintf(
      '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
      mt_rand(0, 0xffff), mt_rand(0, 0xffff),
      mt_rand(0, 0xffff),
      mt_rand(0, 0x0fff) | 0x4000,
      mt_rand(0, 0x3fff) | 0x8000,
      mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
  }
}