FROM php:7.3-apache

# php.iniをコピー
COPY ./docker/php.ini /usr/local/etc/php/

# 必要なパッケージと拡張機能をインストール
RUN apt-get update && \
    apt-get install -y \
    git \
    unzip \
    curl \
    zlib1g-dev \
    libgmp-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libgd-dev \
    libonig-dev \
    libzip-dev \
    sqlite3 \
    libsqlite3-dev && \
    ln -s /usr/include/x86_64-linux-gnu/gmp.h /usr/include/gmp.h && \
    docker-php-ext-configure gd --with-freetype-dir --with-jpeg-dir && \
    docker-php-ext-install mbstring pdo_mysql pdo_sqlite mysqli zip gd gmp bcmath

# Apacheのユーザーとグループの権限を更新
RUN usermod -u 1000 www-data && groupmod -g 1000 www-data

# Apacheモジュールを有効化
RUN a2enmod rewrite headers

# Apache設定ファイルをコピーし、環境変数を設定
COPY docker/apache-config.conf /etc/apache2/sites-available/000-default.conf
RUN sed -i '/<\/VirtualHost>/i\    SetEnv FUEL_ENV development' /etc/apache2/sites-available/000-default.conf

# FuelPHPのログディレクトリとキャッシュディレクトリを作成し、安全な権限を設定
RUN mkdir -p /var/log/fuel /var/cache/fuel && \
    chown -R www-data:www-data /var/log/fuel /var/cache/fuel && \
    chmod 755 /var/log/fuel /var/cache/fuel

# Composerをインストール
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER 1

# Oilをインストール（エラーハンドリング付き）
RUN mkdir -p /var/www/html/my_fuel_project && \
    cd /var/www/html/my_fuel_project && \
    (curl https://get.fuelphp.com/oil | sh || echo "Oil installation failed, continuing...")

# プロジェクトファイルをコピーしてComposer依存関係をインストール
WORKDIR /var/www/html/my_fuel_project
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader

EXPOSE 80

# Apacheをフォアグラウンドで起動
CMD ["apache2-foreground"]