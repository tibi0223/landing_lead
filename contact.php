<?php
/**
 * Nexus Klíma - Contact Form Backend
 * Designed for Rackhost / standard PHP servers
 */

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Collect and sanitize input
    $name    = strip_tags(trim($_POST["name"]));
    $email   = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $phone   = strip_tags(trim($_POST["phone"]));
    $service = isset($_POST["service"]) ? strip_tags(trim($_POST["service"])) : "Nincs megadva";
    $message = strip_tags(trim($_POST["message"]));

    // Validate required fields
    if (empty($name) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // Redirect back with error status
        header("Location: index.html?status=error#contact");
        exit;
    }

    // Email configuration
    $recipient = "info@nexusklima.hu";
    $subject   = "Webes árajánlat kérés - $name";
    
    // Prepare email body
    $email_body = "Új érdeklődés érkezett a weboldalról:\n\n";
    $email_body .= "Név: $name\n";
    $email_body .= "Email: $email\n";
    $email_body .= "Telefonszám: $phone\n";
    $email_body .= "Szolgáltatás: $service\n\n";
    $email_body .= "Üzenet:\n" . ($message ? $message : "Nincs üzenet") . "\n\n";
    $email_body .= "--\nEz az üzenet automatikusan generálódott a nexus-klima.hu weboldalon.";

    // Headers
    // Note: Some hosts require the 'From' header to be a valid account on their server.
    // If mail doesn't arrive, try setting 'From: web@nexus-klima.hu' and 'Reply-To: $email'
    $headers = "From: $name <$email>\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    // Send email
    if (mail($recipient, $subject, $email_body, $headers)) {
        // Success
        header("Location: index.html?status=success#contact");
    } else {
        // Mail server error
        header("Location: index.html?status=error#contact");
    }
} else {
    // Not a POST request
    header("Location: index.html");
}
?>
