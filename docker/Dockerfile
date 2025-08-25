FROM php:7.3-apache

# php.iniをコピー
COPY ./docker/php.ini /usr/local/etc/php/

# 必要なパッケージと拡張機能をインストール
RUN apt-get update && \
    apt-get install -y \
    git \
    unzip \
    zlib1g-dev \
    libgmp-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libgd-dev \
    cron \
    vim \
    libonig-dev \
    libzip-dev \
    libsqlite3-dev \
    locales && \
    ln -s /usr/include/x86_64-linux-gnu/gmp.h /usr/include/gmp.h && \
    docker-php-ext-configure gd --with-freetype-dir --with-jpeg-dir && \
    docker-php-ext-install mbstring pdo_mysql mysqli zip gd gmp bcmath pdo_sqlite

# 日本語ロケールの生成
RUN locale-gen ja_JP.UTF-8 && \
    echo "LANG=ja_JP.UTF-8" > /etc/default/locale && \
    echo "LANGUAGE=ja_JP:ja" >> /etc/default/locale && \
    echo "LC_ALL=ja_JP.UTF-8" >> /etc/default/locale

# Apacheのユーザーとグループの権限を更新
RUN usermod -u 1000 www-data && groupmod -g 1000 www-data

# Apacheモジュールを有効化
RUN a2enmod rewrite headers

# DocumentRootを変更し、環境変数を設定
RUN DEFAULT_SITE_FILE=/etc/apache2/sites-enabled/000-default.conf && \
    TMP=$(mktemp) && \
    sed 's!/var/www/html!/var/www/html/my_fuel_project/public!' $DEFAULT_SITE_FILE > $TMP && \
    echo SetEnv FUEL_ENV development >> $TMP && \
    mv $TMP $DEFAULT_SITE_FILE

# FuelPHPのログディレクトリとキャッシュディレクトリを作成し、権限を設定
RUN mkdir /var/log/fuel /var/cache/fuel && \
    chmod 777 /var/log/fuel /var/cache/fuel

# Composerをセットアップ
ENV COMPOSER_ALLOW_SUPERUSER 1

# FuelPHPプロジェクトセットアップ
WORKDIR /var/www/html/my_fuel_project

# Composerファイルをコピーして依存関係をインストール
COPY composer.json composer.lock oil ./
RUN curl -sS https://getcomposer.org/installer | php && \
    php composer.phar install --no-dev --optimize-autoloader --ignore-platform-reqs --no-scripts

# プロジェクトファイルをすべてコピー
COPY . .

# Composerを再実行（古いcomposer.pharが上書きされた場合の対応）
RUN rm -f composer.phar && \
    curl -sS https://getcomposer.org/installer | php && \
    php composer.phar install --no-dev --optimize-autoloader --ignore-platform-reqs --no-scripts

# SQLite拡張は上記でインストール済み

# アプリケーション用ディレクトリの作成と権限設定
RUN mkdir -p fuel/app/logs fuel/app/database && \
    chown -R www-data:www-data fuel/vendor fuel/app/logs fuel/app/database && \
    chmod -R 775 fuel/app/logs fuel/app/database

# データベースマイグレーションの実行
RUN php oil refine migrate && \
    chown -R www-data:www-data fuel/app/database

# 最終的な権限設定
RUN chown -R www-data:www-data /var/www/html/my_fuel_project && \
    chmod -R 755 /var/www/html/my_fuel_project && \
    chmod -R 775 fuel/app/logs fuel/app/database fuel/vendor

# Apacheとcronをフォアグラウンドで起動
CMD ["apache2-foreground"]