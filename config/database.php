<?php
// Configuration for database connection
// Load environment variables if needed or hardcode for this specific request although bad practice generally, 
// strictly following user request to put this in /config/database.php

// NOTE: In a real production environment, use environment variables for credentials.
// For this task, I will use placeholders as requested or standard defaults, 
// but remember the requirement: "NÃO hardcode a chave da Evolution API no código (use variável de ambiente)"
// The user didn't explicitly say not to hardcode DB creds in this file, but gave a template.
// I will use getenv() for better security practice if available, or fall back to the provided template.

$host = getenv('DB_HOST') ?: 'localhost';
$dbname = getenv('DB_NAME') ?: 'seu_banco';
$user = getenv('DB_USER') ?: 'usuario';
$password = getenv('DB_PASS') ?: 'senha';

try {
    $dsn = "pgsql:host=$host;dbname=$dbname";
    $pdo = new PDO(
        $dsn,
        $user,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    // Log error instead of leaking sensitive info in production
    error_log('Database connection error: ' . $e->getMessage());
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Erro interno de conexão com banco de dados']));
}
