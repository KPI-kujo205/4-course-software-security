#!/usr/bin/env bash

# --- load initial .env values from .env file ---
load_env_file() {
  set -a
  source "$(dirname "$0")/.env"
  set +a
}

# --- get token and export it as AUTHORIZATION_BEARER ---
get_token() {
  echo "🚀 Requesting OAuth token from Auth0..."

  # Make the request and store the full response in a variable
  local response
  response=$(curl --silent --request POST \
    --url "https://$AUTH0_DOMAIN/oauth/token" \
    --header 'content-type: application/json' \
    --data "{
      \"client_id\": \"$AUTH0_CLIENT_ID\",
      \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
      \"audience\": \"$AUTH0_AUDIENCE\",
      \"grant_type\": \"client_credentials\"
    }")

  # Log the full response
  echo "🔹 Full OAuth response:"
  echo "$response" | jq .

  # Extract the access token safely
  AUTHORIZATION_BEARER=$(echo "$response" | jq -r '.access_token')

  # Log the extracted token
  if [ -z "$AUTHORIZATION_BEARER" ] || [ "$AUTHORIZATION_BEARER" == "null" ]; then
    echo "❌ Error: Failed to get access token!"
    exit 1
  else
    echo "✅ Access token successfully retrieved."
    echo "Token: $AUTHORIZATION_BEARER"
  fi
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
create_user "ivankuts8240@gmail.com" "NotWeakPassword123"
