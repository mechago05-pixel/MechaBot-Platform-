FROM php:8.3-apache

WORKDIR /var/www/html

COPY api/ /var/www/html/

RUN docker-php-ext-install pdo pdo_mysql

EXPOSE 80

CMD ["apache2-foreground"]