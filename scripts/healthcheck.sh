#!/bin/bash
# Sonde de santé — vérifie que l'app ET la base répondent réellement, pas juste
# que le process PM2 tourne. GET /api/health fait un SELECT 1 côté Postgres
# (cf. src/app/api/health/route.js) : un process en zombie DB répondrait "online"
# côté PM2 mais échouerait ici.
#
# Usage : scripts/healthcheck.sh [URL]  (défaut : https://notaci.brindoujunior.com/api/health)
# Cron suggéré (toutes les 5 min) :
#   */5 * * * * /var/www/noraci/scripts/healthcheck.sh >> /var/log/noraci-healthcheck.log 2>&1
set -uo pipefail

URL="${1:-https://notaci.brindoujunior.com/api/health}"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

REPONSE=$(curl -sS -m 10 -o /tmp/noraci-health-body.json -w "%{http_code}" "$URL" 2>/tmp/noraci-health-err.txt)
CODE="$REPONSE"
BODY=$(cat /tmp/noraci-health-body.json 2>/dev/null)

if [ "$CODE" = "200" ] && echo "$BODY" | grep -q '"statut":"ok"'; then
  # Silencieux en cas de succès (évite de gonfler le log toutes les 5 min).
  exit 0
fi

echo "[$TIMESTAMP] ÉCHEC sonde noraci — HTTP $CODE — corps: $BODY $(cat /tmp/noraci-health-err.txt 2>/dev/null)"
exit 1
