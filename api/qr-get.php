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
    // Get instance
    $stmt = $pdo->prepare("SELECT instance FROM whatsapp_connections WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $connection = $stmt->fetch();

    if (!$connection) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Nenhuma conexão encontrada']);
        exit;
    }

    $instance_name = $connection['instance'];

    // Request new connection/QR from Evolution
    $ch = curl_init("$evolution_api_url/instance/connect/$instance_name");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "apikey: $evolution_api_key"
        ],
        CURLOPT_TIMEOUT => 10
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);

        $qrcode_base64 = null;
        if (isset($data['base64'])) {
            $qrcode_base64 = $data['base64'];
        } elseif (isset($data['qrcode']['base64'])) {
            $qrcode_base64 = $data['qrcode']['base64'];
        } elseif (isset($data['code'])) { // Sometimes returned as 'code'
            $qrcode_base64 = $data['code'];
        }

        if ($qrcode_base64) {
            // Update DB
            $stmt = $pdo->prepare("UPDATE whatsapp_connections SET qrcode = ?, updated_at = NOW() WHERE user_id = ?");
            $stmt->execute([$qrcode_base64, $user_id]);

            echo json_encode(['success' => true, 'qrcode' => $qrcode_base64]);
        } else {
            // Maybe already connected?
            echo json_encode(['success' => false, 'message' => 'Não foi possível obter QR Code ou instância já conectada.', 'data' => $data]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Erro ao comunicar com Evolution API', 'debug' => $response]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
