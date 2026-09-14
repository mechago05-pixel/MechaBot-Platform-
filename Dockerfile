FROM php:8.3-apache

WORKDIR /var/www/html

COPY api/ /var/www/html/

RUN docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite \
    && echo "ServerName localhost" >> /etc/apache2/apache2.conf

EXPOSE 80

CMD ["apache2-foreground"]