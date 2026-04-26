<?php
/**
 * Server-side proxy for Google Place Details (reviews).
 * Keeps API keys off the client; responses are cached to reduce quota use.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('X-Robots-Tag: noindex, nofollow');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/config.php';

$apiKey = '';
if (defined('GOOGLE_PLACES_API_KEY') && GOOGLE_PLACES_API_KEY !== '') {
    $apiKey = (string) GOOGLE_PLACES_API_KEY;
} elseif (getenv('GOOGLE_PLACES_API_KEY')) {
    $apiKey = (string) getenv('GOOGLE_PLACES_API_KEY');
}

$placeId = '';
if (defined('GOOGLE_PLACE_ID') && GOOGLE_PLACE_ID !== '') {
    $placeId = (string) GOOGLE_PLACE_ID;
} elseif (getenv('GOOGLE_PLACE_ID')) {
    $placeId = (string) getenv('GOOGLE_PLACE_ID');
}

if ($apiKey === '' || $placeId === '') {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'not_configured'], JSON_UNESCAPED_UNICODE);
    exit;
}

$cacheDir = __DIR__ . '/cache';
$cacheFile = $cacheDir . '/google_reviews.json';
$ttlSeconds = 6 * 3600;

if (is_readable($cacheFile)) {
    $age = time() - (int) filemtime($cacheFile);
    if ($age >= 0 && $age < $ttlSeconds) {
        readfile($cacheFile);
        exit;
    }
}

$fields = 'rating,user_ratings_total,reviews';
$url = 'https://maps.googleapis.com/maps/api/place/details/json'
    . '?place_id=' . rawurlencode($placeId)
    . '&fields=' . rawurlencode($fields)
    . '&key=' . rawurlencode($apiKey);

$ctx = stream_context_create([
    'http' => [
        'timeout' => 8,
        'ignore_errors' => true,
    ],
]);

$raw = @file_get_contents($url, false, $ctx);
if ($raw === false || $raw === '') {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'upstream_unavailable'], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode($raw, true);
if (!is_array($data) || ($data['status'] ?? '') !== 'OK' || empty($data['result'])) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'bad_response',
        'status' => $data['status'] ?? 'UNKNOWN',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$result = $data['result'];
$out = [
    'ok' => true,
    'rating' => $result['rating'] ?? null,
    'totalReviews' => $result['user_ratings_total'] ?? null,
    'reviews' => $result['reviews'] ?? [],
];

$payload = json_encode($out, JSON_UNESCAPED_UNICODE);
if ($payload === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'encode_failed'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}
@file_put_contents($cacheFile, $payload);

echo $payload;
