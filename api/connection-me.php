<?php
header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/database.php';

// Security check
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Não autenticado']);
    exit;
}

$user_id = $_SESSION['user_id'];
$evolution_api_url = getenv('EVOLUTION_API_URL') ?: 'https://evolution-api.com';
$evolution_api_key = getenv('EVOLUTION_API_KEY') ?: 'SUA_CHAVE_AQUI';

try {
    // Check if connection exists in DB
    $stmt = $pdo->prepare("SELECT * FROM whatsapp_connections WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $connection = $stmt->fetch();

    if (!$connection) {
        echo json_encode(['exists' => false]);
        exit;
    }

    $instance_name = $connection['instance'];

    // Check Status in Evolution API
    $ch = curl_init("$evolution_api_url/instance/connectionState/$instance_name");
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

    $live_state = 'close'; // Default

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        // Adjust based on actual Evolution API response structure
        // Assuming response structure: { "instance": { "state": "open" } } or similar
        // If the user's example is simplistic, we adapt. 
        // Evolution API usually returns: { "instance": { "state": "open" } } or direct state object.
        // Let's assume standard Evolution API response structure for connectionState.
        // Usually: { "instance": { "state": "open" } }
        if (isset($data['instance']['state'])) {
            $live_state = $data['instance']['state'];
        } elseif (isset($data['state'])) {
            $live_state = $data['state'];
        }
    }

    echo json_encode([
        'exists' => true,
        'instance' => $connection['instance'],
        'status' => $connection['status'],     // DB status
        'live_state' => $live_state,           // Real-time status
        'qrcode' => $connection['qrcode'],
        'created_at' => $connection['created_at']
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
