<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

function wait_for_db(int $attempts = 60): PDO
{
    $last = null;
    for ($i = 1; $i <= $attempts; $i++) {
        try {
            $pdo = db();
            $pdo->query('SELECT 1');
            return $pdo;
        } catch (Throwable $e) {
            $last = $e;
            fwrite(STDERR, "Waiting for MySQL ({$i}/{$attempts}): {$e->getMessage()}\n");
            sleep(2);
        }
    }
    throw $last ?? new RuntimeException('Could not connect to MySQL');
}

$pdo = wait_for_db();
$sql = file_get_contents(__DIR__ . '/../mysql/tables.sql');
if ($sql === false) {
    fwrite(STDERR, "mysql/tables.sql is missing\n");
    exit(1);
}

foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
    if ($statement === '' || str_starts_with($statement, '--')) {
        continue;
    }
    $pdo->exec($statement);
}

try {
    $pdo->exec('ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE');
} catch (PDOException $e) {
    if (!str_contains($e->getMessage(), 'Duplicate column')) {
        throw $e;
    }
}

fwrite(STDOUT, "Database schema is ready.\n");
