FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json \
     tailwind.config.ts postcss.config.js components.json ./
COPY public ./public
COPY src ./src
ARG VITE_API_BASE_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
RUN npm run build

FROM composer:2 AS phpdeps
WORKDIR /app
COPY api/composer.json ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist

FROM php:8.3-apache
WORKDIR /var/www/html
# NOTE: pdo_sqlite is already bundled and enabled in the official php:8.3-apache image.
RUN docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite \
    && echo "ServerName localhost" >> /etc/apache2/apache2.conf

COPY mysql /var/www/html/mysql
COPY api /var/www/html/api
COPY --from=phpdeps /app/vendor /var/www/html/api/vendor
COPY --from=frontend /app/dist /var/www/html
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh \
    && mkdir -p /var/www/html/api/uploads /var/www/html/api/data \
    && chown -R www-data:www-data /var/www/html/api/uploads /var/www/html/api/data

EXPOSE 80
CMD ["/usr/local/bin/start.sh"]
