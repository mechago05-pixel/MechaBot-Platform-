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
            fwrite(STDERR, "Waiting for database ({$i}/{$attempts}): {$e->getMessage()}\n");
            sleep(2);
        }
    }
    throw $last ?? new RuntimeException('Could not connect to the database');
}

$pdo = wait_for_db();

if (db_driver() === 'sqlite') {
    // Schema is created automatically on first connection (see db()).
    // Make sure all tables/indexes exist even if the file was partially created.
    foreach (sqlite_schema_statements() as $statement) {
        $pdo->exec($statement);
    }
    fwrite(STDOUT, "SQLite schema is ready.\n");
} else {
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
}

// Optionally promote the named account to admin (set ADMIN_EMAIL env var).
$adminEmail = strtolower(trim((string) env_value('ADMIN_EMAIL', '')));
if ($adminEmail !== '') {
    $lookup = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $lookup->execute([$adminEmail]);
    $adminId = (string) ($lookup->fetchColumn() ?: '');
    if ($adminId !== '') {
        $pdo->prepare('UPDATE users SET role = \'admin\' WHERE id = ?')->execute([$adminId]);
        $pdo->prepare(sql_upsert(
            'INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
            'INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)'
        ))->execute([uuid(), $adminId, 'admin']);
        fwrite(STDOUT, "Admin role ensured for {$adminEmail}\n");
    } else {
        fwrite(STDOUT, "ADMIN_EMAIL={$adminEmail} not found yet; register first, then restart to promote.\n");
    }
}

fwrite(STDOUT, "Migration complete.\n");
