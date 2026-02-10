<?php
header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Não autenticado']);
    exit;
}

$user_id = $_SESSION['user_id'];
$evolution_api_url = getenv('EVOLUTION_API_URL') ?: 'https://evolution-api.com';
$evolution_api_key = getenv('EVOLUTION_API_KEY') ?: 'SUA_CHAVE_AQUI';

try {
    // Get instance name
    $stmt = $pdo->prepare("SELECT instance FROM whatsapp_connections WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $connection = $stmt->fetch();

    if (!$connection) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Conexão não encontrada']);
        exit;
    }

    $instance_name = $connection['instance'];

    // Delete from Evolution API
    $ch = curl_init("$evolution_api_url/instance/delete/$instance_name");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => "DELETE",
        CURLOPT_HTTPHEADER => [
            "apikey: $evolution_api_key"
        ],
        CURLOPT_TIMEOUT => 10
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // Evolution API might return 200 or 204 or even 404 if already deleted but we should clean DB

    // Delete from DB
    $stmt = $pdo->prepare("DELETE FROM whatsapp_connections WHERE user_id = ?");
    $stmt->execute([$user_id]);

    echo json_encode(['success' => true, 'message' => 'Conexão removida com sucesso']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
