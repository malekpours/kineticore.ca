<?php
/**
 * Kineticore contact form backend — Gmail SMTP.
 *
 * Receives POST fields (urlencoded or multipart):
 *   Name, Email, Company, Topic, Phone, Extension, Message
 *
 * Replies with plain text understood by js/main.js:
 *   Success            -> show thank-you block
 *   Fail: <reason>     -> configuration / validation problem
 *   Error: <reason>    -> unexpected failure (SMTP etc.)
 *   Debug: <dump>      -> MAIL_DEBUG=1 preview, nothing is sent
 *
 * Configuration is read from ../.env (site root) or ./.env (this folder).
 */

/* ---------------------------------------------------------------- helpers */

function respond($text) {
    header('Content-Type: text/plain; charset=utf-8');
    echo $text;
    exit;
}

/** Load KEY=VALUE pairs from the first readable path. Returns array|false. */
function load_env($paths) {
    foreach ($paths as $p) {
        if (!is_readable($p)) continue;
        $vars = array();
        foreach (file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
            $pair = explode('=', $line, 2);
            $vars[trim($pair[0])] = trim($pair[1], " \t\"'");
        }
        return $vars;
    }
    return false;
}

/** Trimmed POST field with hard length cap, or null. */
function field($key, $max = 5000) {
    if (!isset($_POST[$key])) return null;
    $v = trim((string)$_POST[$key]);
    if ($v === '' || strlen($v) > $max) return null;
    return $v;
}

/** Header-safe value: collapse CR/LF to spaces (blocks header injection). */
function header_safe($v) {
    return trim(preg_replace('/[\r\n\x00]+/', ' ', $v));
}

/* ------------------------------------------------------------- bootstrap */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond('Fail: POST required.');
}

$cfg = load_env(array(__DIR__ . '/../.env', __DIR__ . '/.env'));
if ($cfg === false) {
    respond('Fail: server configuration missing (.env not found next to sendmail/).');
}

$required = array('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO');
$missing = array();
foreach ($required as $k) {
    if (empty($cfg[$k])) $missing[] = $k;
}
if ($missing) {
    respond('Fail: .env is missing: ' . implode(', ', $missing) . '.');
}

/* ------------------------------------------------------------ validation */

$name    = field('Name', 200);
$email   = field('Email', 200);
$company = field('Company', 200);
$topic   = field('Topic', 50);
$phone   = field('Phone', 40);
$ext     = field('Extension', 10);
$message = field('Message', 10000);

$problems = array();
if ($name === null)                             { $problems[] = 'name'; }
if ($email === null || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $problems[] = 'email'; }
if ($message === null)                          { $problems[] = 'message'; }
if ($phone !== null) {
    $p = $phone;
    if (preg_match('/[A-Za-z]/', $p) || !preg_match('/^\+?[0-9\s\-\(\)]+$/', $p)) {
        $problems[] = 'phone';
    } else {
        $digits = preg_replace('/[^0-9]/', '', $p);
        $compact = str_replace(' ', '', $p);
        if (strpos($compact, '+1') === 0 || strpos($compact, '1') === 0) {
            if (strlen($digits) !== 11 || $digits[0] !== '1') $problems[] = 'phone';
        } elseif (strlen($digits) < 7 || strlen($digits) > 15) {
            $problems[] = 'phone';
        }
    }
}
if ($ext !== null && !preg_match('/^[0-9]{1,6}$/', $ext)) { $problems[] = 'extension'; }
if ($problems) {
    respond('Fail: invalid or missing: ' . implode(', ', $problems) . '.');
}

/* Topic label (matches contact.html deep-links) */
$topics = array(
    'lab-daq'      => 'Lab & DAQ Systems',
    'kc36-pricing' => 'KC-36 logger pricing',
    'kc36-support' => 'KC-36 logger support',
    'feedstock'    => 'Wood-waste feedstock partnership',
    'biochar-buy'  => 'Biochar supply',
    'toll'         => 'Toll processing',
    'general'      => 'General enquiry',
);
$topicLabel = ($topic !== null && isset($topics[$topic])) ? $topics[$topic] : $topics['general'];

/* ------------------------------------------------------- rate limit + spool */

$ip    = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$tmp   = sys_get_temp_dir() . '/kc-form';
if (!is_dir($tmp)) { @mkdir($tmp, 0700, true); }

/* Max 10 submissions per hour per IP. */
$rlFile = $tmp . '/ratelimit-' . preg_replace('/[^0-9a-fA-F:.]/', '_', $ip) . '.json';
$hits = array();
if (is_readable($rlFile)) { $hits = json_decode((string)@file_get_contents($rlFile), true) ?: array(); }
$now = time();
$hits = array_values(array_filter($hits, function ($t) use ($now) { return $t > $now - 3600; }));
if (count($hits) >= 10) {
    respond('Fail: too many requests from this address. Please try again later or email info@kineticore.ca.');
}
$hits[] = $now;
@file_put_contents($rlFile, json_encode($hits));

/* Render the message (used for the e-mail, the spool backup and Debug mode). */
$stamp = date('Y-m-d H:i:s T');
$extPart = $ext !== null ? " ext. $ext" : '';
$body = "New website enquiry - kineticore.ca contact form\n"
      . "==================================================\n\n"
      . "Name:      $name\n"
      . "Email:     $email\n"
      . "Company:   " . ($company !== null ? $company : '-') . "\n"
      . "Topic:     $topicLabel\n"
      . "Phone:     " . ($phone !== null ? $phone . $extPart : '-') . "\n"
      . "Submitted: $stamp\n"
      . "IP:        $ip\n\n"
      . "Message:\n"
      . "--------------------------------------------------\n"
      . $message . "\n";

/* Best-effort local backup, so no lead is ever lost to an SMTP hiccup. */
@file_put_contents(
    $tmp . '/mail-' . date('Ymd-His') . '-' . substr(md5($email . microtime()), 0, 6) . '.txt',
    $body
);

/* ----------------------------------------------------------- Debug mode */

if (!empty($cfg['MAIL_DEBUG']) && $cfg['MAIL_DEBUG'] === '1') {
    respond("Debug: MAIL_DEBUG is ON - nothing was sent.\n\n" . $body);
}

/* ------------------------------------------------------------- send mail */

try {
    $host = $cfg['SMTP_HOST'];
    $port = (int)$cfg['SMTP_PORT'];
    $user = $cfg['SMTP_USER'];
    $pass = $cfg['SMTP_PASS'];
    $to   = $cfg['MAIL_TO'];
    $fromName = !empty($cfg['MAIL_FROM_NAME']) ? $cfg['MAIL_FROM_NAME'] : 'Kineticore Website';
    $timeout  = 15;

    /* Gmail requires the From address to match the authenticated account. */
    $from = $user;

    $transport = ($port === 465) ? 'ssl://' : 'tcp://';
    $sock = @stream_socket_client($transport . $host . ':' . $port, $errno, $errstr, $timeout);
    if (!$sock) {
        throw new Exception("cannot reach $host:$port ($errstr)");
    }
    stream_set_timeout($sock, $timeout);

    $read = function () use ($sock) {
        $data = '';
        while (($line = fgets($sock, 1024)) !== false) {
            $data .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') break; /* last line of reply */
        }
        return $data;
    };
    $say = function ($cmdline) use ($sock, $read) {
        fwrite($sock, $cmdline . "\r\n");
        return $read();
    };
    $code = function ($resp) { return (int)substr($resp, 0, 3); };

    $r = $read();
    if ($code($r) !== 220) throw new Exception("no SMTP greeting: $r");

    $ehlo = 'EHLO kineticore.ca';
    $r = $say($ehlo);
    if ($code($r) !== 250) throw new Exception("EHLO rejected: $r");

    if ($port !== 465) { /* implicit TLS on 465; STARTTLS for submission ports */
        $r = $say('STARTTLS');
        if ($code($r) !== 220) throw new Exception("STARTTLS rejected: $r");
        if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception('TLS negotiation failed');
        }
        $r = $say($ehlo);
        if ($code($r) !== 250) throw new Exception("EHLO after TLS failed: $r");
    }

    $r = $say('AUTH LOGIN');
    if ($code($r) !== 334) throw new Exception("AUTH LOGIN not offered: $r");
    $r = $say(base64_encode($user));
    if ($code($r) !== 334) throw new Exception("username rejected: $r");
    $r = $say(base64_encode($pass));
    if ($code($r) !== 235) throw new Exception('authentication failed - check SMTP_USER and the 16-character app password');

    $r = $say("MAIL FROM:<$from>");
    if ($code($r) !== 250) throw new Exception("MAIL FROM rejected: $r");
    $r = $say("RCPT TO:<$to>");
    if ($code($r) !== 250 && $code($r) !== 251) throw new Exception("recipient rejected: $r");
    $r = $say('DATA');
    if ($code($r) !== 354) throw new Exception("DATA rejected: $r");

    $enc = function ($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; };
    $headers = "From: " . $enc($fromName) . " <$from>\r\n"
             . "Reply-To: " . $enc(header_safe($name)) . " <$email>\r\n"
             . "To: <$to>\r\n"
             . "Subject: " . $enc("[$topicLabel] $name") . "\r\n"
             . "Date: " . date('r') . "\r\n"
             . "Message-ID: <" . md5(uniqid('', true)) . "@kineticore.ca>\r\n"
             . "MIME-Version: 1.0\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n"
             . "Content-Transfer-Encoding: quoted-printable\r\n"
             . "X-Mailer: kineticore-contact\r\n";

    $payload = preg_replace('/^\./m', '..', $headers . "\r\n" . quoted_printable_encode($body));
    $r = $say($payload . "\r\n.");
    if ($code($r) !== 250) throw new Exception("message rejected: $r");

    $say('QUIT');
    fclose($sock);

    respond('Success');
} catch (Exception $e) {
    respond('Error: mail could not be sent - ' . $e->getMessage());
}
