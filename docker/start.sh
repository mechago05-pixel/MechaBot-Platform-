#!/bin/bash
set -euo pipefail

PORT="${PORT:-80}"

cat > /etc/apache2/ports.conf <<EOF
Listen ${PORT}
EOF

cat > /etc/apache2/sites-available/000-default.conf <<EOF
<VirtualHost *:${PORT}>
    ServerName localhost
    DocumentRoot /var/www/html
    <Directory /var/www/html>
        Options FollowSymLinks
        AllowOverride None
        Require all granted
        RewriteEngine On
        RewriteRule ^api(/.*)?$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ /index.html [L]
    </Directory>
    <Directory /var/www/html/api>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.php [QSA,L]
    </Directory>
</VirtualHost>
EOF

mkdir -p /var/www/html/api/uploads /var/www/html/api/data
chown -R www-data:www-data /var/www/html/api/uploads /var/www/html/api/data

php /var/www/html/api/migrate.php

# SQLite/WAL files created during migration must be writable by Apache (www-data).
chown -R www-data:www-data /var/www/html/api/data

exec apache2-foreground
