<?php
/**
 * REST API Configuration for this application
 * 
 * This project uses JSON as the default format for API responses
 */
return array(
    /*
    | What format should the data be returned in by default?
    |
    |	Default: json (changed from xml for this project)
    |
    */
    'default_format' => 'json',

    /*
    | XML Basenode name
    |
    |	Default: xml
    |
    */
    'xml_basenode' => 'xml',

    /*
    | Name for the password protected REST API displayed on login dialogs
    |
    |	E.g: My Secret REST API
    |
    */
    'realm' => 'Chart Management API',

    /*
    | Is login required and if so, which type of login?
    |
    | This app uses Google ID Token authentication, so we don't use FuelPHP's built-in auth
    |
    */
    'auth' => '',

    /*
    | array of usernames and passwords for login (not used in this app)
    */
    'valid_logins' => array(),

    /*
    | Ignore HTTP_ACCEPT
    |
    | A lot of work can go into detecting incoming data,
    | disabling this will speed up your requests if you do not use a ACCEPT header.
    |
    */
    'ignore_http_accept' => false,
);