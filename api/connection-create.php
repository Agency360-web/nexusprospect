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
    // Check if already exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM whatsapp_connections WHERE user_id = ?");
    $stmt->execute([$user_id]);
    if ($stmt->fetchColumn() > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Você já possui uma conexão ativa']);
        exit;
    }

    $instance_name = "user-$user_id";

    // Create Instance in Evolution API
    $payload = [
        "instanceName" => $instance_name,
        "qrcode" => true,
        "integration" => "WHATSAPP-BAILEYS"
    ];

    $ch = curl_init("$evolution_api_url/instance/create");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "apikey: $evolution_api_key",
            "Content-Type: application/json"
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 10
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 201 || $httpCode === 200) {
        $data = json_decode($response, true);

        // Extract QR Code - Evolution API 1.x vs 2.x might differ
        // Assuming structure: { "qrcode": { "base64": "..." } } or similar based on user prompt "qrcode.code"??
        // User prompt says: "Extrair qrcode.code da resposta" if using their example context.
        // Let's try to find base64.

        $qrcode_base64 = null;
        if (isset($data['qrcode']['base64'])) {
            $qrcode_base64 = $data['qrcode']['base64'];
        } elseif (isset($data['qrcode']) && is_string($data['qrcode'])) {
            $qrcode_base64 = $data['qrcode']; // Sometimes it returns direct string if configured
        } elseif (isset($data['base64'])) {
            // Some versions
            $qrcode_base64 = $data['base64'];
        }

        // Fallback for user instruction "qrcode.code"
        if (isset($data['qrcode']['code'])) {
            $qrcode_base64 = $data['qrcode']['code'];
        }

        // Save to DB
        $stmt = $pdo->prepare("INSERT INTO whatsapp_connections (user_id, instance, status, qrcode, created_at) VALUES (?, ?, 'pending', ?, NOW())");
        $stmt->execute([$user_id, $instance_name, $qrcode_base64]);

        echo json_encode([
            'success' => true,
            'instance' => $instance_name,
            'qrcode' => $qrcode_base64,
            'message' => 'Conexão criada! Escaneie o QR Code no seu WhatsApp'
        ]);
    } else {
        // Handle API error
        http_response_code(500);
        $error_msg = 'Erro ao criar instância na Evolution API';
        if ($response) {
            $err_data = json_decode($response, true);
            if (isset($err_data['message']))
                $error_msg .= ': ' . $err_data['message'];
        }
        echo json_encode(['success' => false, 'message' => $error_msg, 'debug_response' => $response]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
