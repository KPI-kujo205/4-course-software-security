#!/usr/bin/env bash

REFRESH_TOKEN="$1"

# --- load initial .env values from .env file ---
load_env_file() {
  set -a
  source "$(dirname "$0")/.env"
  set +a
}

curl_with_refresh_token() {
  curl --request POST \
    --url "https://${AUTH0_DOMAIN}/oauth/token" \
    --header 'content-type: application/x-www-form-urlencoded' \
    --data "grant_type=refresh_token" \
    --data "client_id=${CLIENT_ID}" \
    --data "client_secret=${CLIENT_SECRET}" \
    --data "refresh_token=${REFRESH_TOKEN}"
}

# --- run everything ---
load_env_file
curl_with_refresh_token
