<?php

/**
 * User Model
 * 
 * usersテーブルにアクセスするためのモデル
 */
class Model_User extends \Orm\Model
{
  /**
   * テーブル名
   */
  protected static $_table_name = 'users';
  
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
    'google_user_id' => array(
      'data_type' => 'varchar',
      'label' => 'Google User ID',
      'validation' => array('required'),
    ),
    'email' => array(
      'data_type' => 'varchar',
      'label' => 'Email',
    ),
    'name' => array(
      'data_type' => 'varchar',
      'label' => 'Name',
    ),
    'created_at' => array(
      'data_type' => 'varchar',
      'label' => '作成日時',
    ),
  );
  
  /**
   * Chartsとの関係
   */
  protected static $_has_many = array(
    'charts' => array(
      'key_from' => 'id',
      'model_to' => 'Model_Chart',
      'key_to' => 'user_id',
      'cascade_save' => true,
      'cascade_delete' => true,
    )
  );
  
  /**
   * Google User IDからユーザーを取得または作成
   * 
   * @param string $google_user_id Google User ID
   * @param string $email Email address
   * @param string $name User name
   * @return Model_User
   */
  public static function find_or_create_by_google_id($google_user_id, $email = null, $name = null)
  {
    // 既存ユーザーを検索
    $user = static::query()
      ->where('google_user_id', $google_user_id)
      ->get_one();
    
    if ($user) {
      // 既存ユーザーの情報を更新（必要に応じて）
      $updated = false;
      if ($email && $user->email !== $email) {
        $user->email = $email;
        $updated = true;
      }
      if ($name && $user->name !== $name) {
        $user->name = $name;
        $updated = true;
      }
      if ($updated) {
        $user->save();
      }
      return $user;
    }
    
    // 新規ユーザーを作成
    $user = new static();
    $user->id = static::generate_uuid();
    $user->google_user_id = $google_user_id;
    $user->email = $email;
    $user->name = $name;
    $user->created_at = date('Y-m-d H:i:s');
    
    $user->save();
    return $user;
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