#!/usr/bin/env bash

USER_ID="auth0|68f0c234f71c9e1ca787a1b4"
NEW_PASSWORD="$1"

if [ -z "$NEW_PASSWORD" ]; then
  echo "❌ Usage: $0 NEW_PASSWORD"
  exit 1
fi

# --- Load .env values ---
load_env_file() {
  set -a
  source "$(dirname "$0")/.env"
  set +a
}

# --- Get Management API access token ---
get_token() {
  # Get full JSON response (not just token)
  local response=$(curl --silent --request POST \
    --url "https://${AUTH0_DOMAIN}/oauth/token" \
    --header 'content-type: application/json' \
    --data "{
      \"client_id\": \"${CLIENT_ID}\",
      \"client_secret\": \"${CLIENT_SECRET}\",

      \"audience\": \"https://dev-uyva8o2agwdavjfm.us.auth0.com/api/v2/\",
      \"grant_type\": \"client_credentials\"
    }")

  # Extract token from JSON
  AUTHORIZATION_BEARER=$(echo "$response" | jq -r '.access_token')

  # Check if token was retrieved successfully
  if [ -z "$AUTHORIZATION_BEARER" ] || [ "$AUTHORIZATION_BEARER" = "null" ]; then
    echo "❌ Failed to get Management API token"
    echo "🔍 Auth0 response:"
    echo "$response" | jq .
    exit 1
  fi

  export AUTHORIZATION_BEARER
}

# --- Change user password ---
change_password() {
  echo "🔁 Changing password for user: ${USER_ID}"
  echo "Authorization Bearer Token: ${AUTHORIZATION_BEARER:0:30}..."

  curl --request PATCH \
    --url "https://dev-uyva8o2agwdavjfm.us.auth0.com/api/v2/users/${USER_ID}" \
    --header "Authorization: Bearer ${AUTHORIZATION_BEARER}" \
    --header 'content-type: application/json' \
    --data "{
    \"password\": \"${NEW_PASSWORD}\",
    \"connection\": \"Username-Password-Authentication\"
  }"

}

# --- Main flow ---
load_env_file
get_token
echo "✅ Got Management API token successfully"
change_password
echo "✅ Password change request completed."
