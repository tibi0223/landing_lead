<?php
/**
 * Nexus Klima - Lead form processor
 * Receives price calculator submissions and stores/sends them.
 */

header('Content-Type: application/json');

// Collect form data
$data = [
    'postcode'           => $_POST['postcode'] ?? '',
    'service'            => $_POST['service'] ?? '',
    'property'           => $_POST['property'] ?? '',
    'size'               => $_POST['size'] ?? '',
    'heating_preference' => $_POST['heating_preference'] ?? '',
    'goal'               => $_POST['goal'] ?? '',
    'product_name'  => $_POST['product_name'] ?? '',
    'product_price' => $_POST['product_price'] ?? '0',
    'pipe_meters'   => $_POST['pipe_meters'] ?? '3',
    'price_netto'   => $_POST['price_netto'] ?? '0',
    'price_brutto'  => $_POST['price_brutto'] ?? '0',
    'price_range'   => $_POST['price_range'] ?? '',
    'name'          => $_POST['name'] ?? '',
    'email'         => $_POST['email'] ?? '',
    'phone'         => $_POST['phone'] ?? '',
];

// Validate required fields
$errors = [];
if (empty($data['name']))    $errors[] = 'Name is required';
if (empty($data['email']))   $errors[] = 'Email is required';
if (empty($data['phone']))   $errors[] = 'Phone is required';
if (empty($data['service'])) $errors[] = 'Service is required';

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'errors' => $errors]);
    exit;
}

// Handle photo upload
$photoPath = '';
if (!empty($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/uploads';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    $ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
    $filename = 'lead_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $destPath = $uploadDir . '/' . $filename;
    if (move_uploaded_file($_FILES['photo']['tmp_name'], $destPath)) {
        $photoPath = 'uploads/' . $filename;
    }
}

// Build a human-readable summary
$summary = "=== ÚJ ÁRAJÁNLAT KÉRÉS ===\n\n";
$summary .= "Név: {$data['name']}\n";
$summary .= "Email: {$data['email']}\n";
$summary .= "Telefon: {$data['phone']}\n";
$summary .= "Irányítószám: {$data['postcode']}\n";
$summary .= "Szolgáltatás: {$data['service']}\n";
$summary .= "Ingatlan: {$data['property']}\n";
$summary .= "Alapterület: {$data['size']}\n";
$summary .= "Fűtési preferencia: {$data['heating_preference']}\n";
$summary .= "Cél: {$data['goal']}\n";
if (!empty($data['product_name'])) {
    $summary .= "Készülék: {$data['product_name']}\n";
    $summary .= "Készülék ára (nettó): {$data['product_price']} Ft\n";
}
if (!empty($data['pipe_meters'])) {
    $summary .= "Csőhossz: {$data['pipe_meters']} m\n";
}
$summary .= "Becsült nettó ár: {$data['price_netto']} Ft\n";
$summary .= "Becsült bruttó ár: {$data['price_brutto']} Ft\n";
$summary .= "Ár tartomány: {$data['price_range']}\n";
if ($photoPath) {
    $summary .= "Fotó: {$photoPath}\n";
}
$summary .= "\n---\nKüldve: " . date('Y-m-d H:i:s') . "\n";

// Store to file (simple log)
$logDir = __DIR__ . '/leads';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/lead_' . date('Y-m-d') . '.log';
file_put_contents($logFile, $summary . str_repeat('=', 50) . "\n\n", FILE_APPEND | LOCK_EX);

// Store as JSON for easy processing
$jsonFile = $logDir . '/lead_' . time() . '_' . bin2hex(random_bytes(4)) . '.json';
file_put_contents($jsonFile, json_encode($data + ['photo' => $photoPath, 'submitted_at' => date('c')], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// --- Optional: Send email notification ---
/*
$to = 'your@email.hu';
$subject = 'Új árajánlat kérés - ' . $data['name'];
$headers = 'From: kalkulator@nexusklima.hu' . "\r\n" .
           'Content-Type: text/plain; charset=UTF-8' . "\r\n" .
           'Reply-To: ' . $data['email'];

mail($to, $subject, $summary, $headers);
*/

echo json_encode(['success' => true, 'message' => 'Ajánlatkérés sikeresen elküldve!']);
