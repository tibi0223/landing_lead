<?php
session_start();
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, follow" />
  <title>Ingyenes árajánlat | Nexus Klíma</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="icon" type="image/png" href="assets/images/logo.png" />
  <link rel="stylesheet" href="css/style.css?v=11" />
  <link rel="stylesheet" href="css/qualifier-compat.css?v=1" />
  <link rel="stylesheet" href="css/ajanlat-calculator.css?v=1" />
  <style>.ajanlat-body{margin:0;min-height:100vh;background:#050505}</style>
</head>
<body class="ajanlat-body">
<?php include __DIR__ . '/ajanlat-section.php'; ?>
<script src="new_leads/config.js"></script>
<script src="js/qualifier.js?v=1"></script>
</body>
</html>
