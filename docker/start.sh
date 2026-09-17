#!/bin/bash
# NOTE: no `set -e` on purpose — the web service must always start serving,
# even if a startup step fails. The SQLite schema also self-heals on the
# first query (see db() in api/bootstrap.php), so a failed migration is
# never fatal for the running app.

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

if ! php /var/www/html/api/migrate.php; then
    echo "WARNING: migrate.php failed; starting Apache anyway (schema self-heals on first query)." >&2
fi

# SQLite/WAL files created during migration must be writable by Apache (www-data).
chown -R www-data:www-data /var/www/html/api/data

exec apache2-foreground
