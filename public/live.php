<?php
// Feed de marcadores EN VIVO. Proxy cacheado de football-data.org para no exponer la API key
// ni superar el límite (10/min): cachea ~25s en disco y sirve esa copia a todos los visitantes.
// La key se inyecta en el deploy (reemplaza __FD_KEY__); en el repo va el placeholder.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=20');

$KEY = '__FD_KEY__';
$cache = sys_get_temp_dir() . '/wc_live_v1.json';
$TTL = 25;

if (is_readable($cache) && (time() - filemtime($cache)) < $TTL) { readfile($cache); exit; }

$ctx = stream_context_create(['http' => ['method' => 'GET', 'header' => "X-Auth-Token: $KEY\r\nUser-Agent: mundialsimulador\r\n", 'timeout' => 8, 'ignore_errors' => true]]);
$raw = @file_get_contents('https://api.football-data.org/v4/competitions/WC/matches', false, $ctx);
if ($raw === false) { if (is_readable($cache)) { readfile($cache); exit; } http_response_code(502); echo '{"error":"upstream"}'; exit; }
$data = json_decode($raw, true);
if (!isset($data['matches'])) { if (is_readable($cache)) { readfile($cache); exit; } http_response_code(502); echo '{"error":"bad"}'; exit; }

$EN = ['MEX'=>'Mexico','RSA'=>'South Africa','KOR'=>'South Korea','CZE'=>'Czechia','CAN'=>'Canada','QAT'=>'Qatar','SUI'=>'Switzerland','BIH'=>'Bosnia & Herz.','BRA'=>'Brazil','MAR'=>'Morocco','HAI'=>'Haiti','SCO'=>'Scotland','USA'=>'USA','PAR'=>'Paraguay','AUS'=>'Australia','TUR'=>'Türkiye','GER'=>'Germany','CUW'=>'Curaçao','CIV'=>'Ivory Coast','ECU'=>'Ecuador','NED'=>'Netherlands','JPN'=>'Japan','TUN'=>'Tunisia','SWE'=>'Sweden','BEL'=>'Belgium','EGY'=>'Egypt','IRN'=>'Iran','NZL'=>'New Zealand','ESP'=>'Spain','CPV'=>'Cape Verde','KSA'=>'Saudi Arabia','URU'=>'Uruguay','FRA'=>'France','SEN'=>'Senegal','NOR'=>'Norway','IRQ'=>'Iraq','ARG'=>'Argentina','ALG'=>'Algeria','AUT'=>'Austria','JOR'=>'Jordan','POR'=>'Portugal','COL'=>'Colombia','UZB'=>'Uzbekistan','COD'=>'DR Congo','ENG'=>'England','CRO'=>'Croatia','GHA'=>'Ghana','PAN'=>'Panama'];
$ALIASES = ['unitedstates'=>'USA','unitedstatesofamerica'=>'USA','bosniaherzegovina'=>'BIH','bosniaandherzegovina'=>'BIH','capeverdeislands'=>'CPV','caboverde'=>'CPV','turkey'=>'TUR','turkiye'=>'TUR','cotedivoire'=>'CIV','ivorycoast'=>'CIV','congodr'=>'COD','drcongo'=>'COD','democraticrepublicofcongo'=>'COD','iriran'=>'IRN','iran'=>'IRN','islamicrepublicofiran'=>'IRN','korearepublic'=>'KOR','southkorea'=>'KOR','republicofkorea'=>'KOR','czechrepublic'=>'CZE','czechia'=>'CZE'];

function wc_norm($s) {
  $s = mb_strtolower($s ?? '', 'UTF-8');
  $from = ['á','à','ä','â','ã','é','è','ë','ê','í','ì','ï','î','ó','ò','ö','ô','õ','ú','ù','ü','û','ç','ñ','ş','ı','ğ'];
  $to   = ['a','a','a','a','a','e','e','e','e','i','i','i','i','o','o','o','o','o','u','u','u','u','c','n','s','i','g'];
  return preg_replace('/[^a-z0-9]/', '', str_replace($from, $to, $s));
}
$LOOKUP = [];
foreach ($EN as $code => $en) $LOOKUP[wc_norm($en)] = $code;
function wc_resolve($name, $LOOKUP, $ALIASES) { $n = wc_norm($name); return $ALIASES[$n] ?? $LOOKUP[$n] ?? null; }

$byPair = [];
foreach ($data['matches'] as $m) {
  $a = wc_resolve($m['homeTeam']['name'] ?? '', $LOOKUP, $ALIASES);
  $b = wc_resolve($m['awayTeam']['name'] ?? '', $LOOKUP, $ALIASES);
  if (!$a || !$b) continue;
  $kk = [$a, $b]; sort($kk); $key = implode('-', $kk);
  $hs = $m['score']['fullTime']['home'] ?? null;
  $as = $m['score']['fullTime']['away'] ?? null;
  $e = ['status' => $m['status']];
  if ($hs !== null && $as !== null) $e['scores'] = [$a => $hs, $b => $as];
  $w = $m['score']['winner'] ?? null;
  if ($w === 'HOME_TEAM') $e['winner'] = $a; elseif ($w === 'AWAY_TEAM') $e['winner'] = $b;
  if (in_array($m['status'], ['IN_PLAY', 'PAUSED'], true)) $e['live'] = true;
  if (isset($m['minute']) && $m['minute'] !== null) $e['minute'] = $m['minute'];
  $byPair[$key] = $e;
}

$out = json_encode(['updatedAt' => gmdate('Y-m-d\TH:i:s\Z'), 'byPair' => $byPair], JSON_UNESCAPED_UNICODE);
@file_put_contents($cache, $out);
echo $out;
