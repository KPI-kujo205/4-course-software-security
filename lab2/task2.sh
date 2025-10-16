#!/usr/bin/env bash

# --- load initial .env values from .env file ---
load_env_file() {
  set -a
  source "$(dirname "$0")/.env"
  set +a
}

# --- get token and export it as AUTHORIZATION_BEARER ---
get_token() {
  export AUTHORIZATION_BEARER=$(curl --silent --request POST \
    --url https://$AUTH0_DOMAIN/oauth/token \
    --header 'content-type: application/json' \
    --data "{
      \"client_id\": \"$CLIENT_ID\",
      \"client_secret\": \"$CLIENT_SECRET\",
      \"audience\": \"$AUTH0_AUDIENCE\",
      \"grant_type\": \"client_credentials\"
    }" | jq -r '.access_token')
}

# --- create user function ---
create_user() {
  local email="$1"
  local password="$2"

  if [ -z "$email" ]; then
    echo "❌ Error: No email provided."
    echo "Usage: create_user <email>"
    return 1
  fi

  curl -s -L "https://$AUTH0_DOMAIN/api/v2/users" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer $AUTHORIZATION_BEARER" \
    --data-raw "{
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"connection\": \"Username-Password-Authentication\"
    }" | jq
}

# --- run everything ---
load_env_file
get_token
create_user "ivankuts8240+2@gmail.com" "NotWeakPassword123"
