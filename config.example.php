<?php
/**
 * Copy to config.php (not committed) and fill in values.
 */
define('HUBSPOT_TOKEN', '');

// Before go-live: use a new key restricted to your server IP only, and rotate any key that was ever in the browser/repo.
if (!defined('GOOGLE_PLACES_API_KEY')) {
    define('GOOGLE_PLACES_API_KEY', getenv('GOOGLE_PLACES_API_KEY') ?: '');
}
if (!defined('GOOGLE_PLACE_ID')) {
    define('GOOGLE_PLACE_ID', getenv('GOOGLE_PLACE_ID') ?: '');
}
