#!/usr/bin/env bash

# --- Load .env ---
load_env_file() {
  set -a
  source "$(dirname "$0")/.env"
  set +a
}

# --- Base64 decode helper ---
base64_url_decode() {
  local len=$((${#1} % 4))
  local str="$1"
  [[ $len -eq 2 ]] && str="$str=="
  [[ $len -eq 3 ]] && str="$str="
  echo "$str" | tr '_-' '/+' | base64 --decode 2>/dev/null
}

# --- Log in user and get access token ---
login_user() {
  local email="$1"
  local password="$2"

  if [ -z "$email" ] || [ -z "$password" ]; then
    echo "❌ Usage: login_user <email> <password>"
    return 1
  fi

  local DOMAIN="$AUTH0_DOMAIN"
  local AUDIENCE="$AUTH0_AUDIENCE"

  local LOGIN_RESPONSE
  LOGIN_RESPONSE=$(curl --silent --request POST \
    --url "https://$DOMAIN/oauth/token" \
    --header "Content-Type: application/json" \
    --data "{
      \"username\": \"$email\",
      \"password\": \"$password\",
      \"audience\": \"$AUDIENCE\",
      \"client_id\": \"$CLIENT_ID\",
      \"client_secret\": \"$CLIENT_SECRET\",
      \"scope\": \"openid profile email\",
      \"realm\": \"Username-Password-Authentication\",
      \"grant_type\": \"http://auth0.com/oauth/grant-type/password-realm\"
    }")

  # Extract access_token
  echo "$LOGIN_RESPONSE" | jq -r '.access_token'
}

get_mgmt_token() {
  local DOMAIN="$AUTH0_DOMAIN"
  local CLIENT_ID="$CLIENT_ID"
  local CLIENT_SECRET="$CLIENT_SECRET"

  curl --silent --request POST \
    --url "https://$DOMAIN/oauth/token" \
    --header "Content-Type: application/json" \
    --data "{
      \"client_id\": \"$CLIENT_ID\",
      \"client_secret\": \"$CLIENT_SECRET\",
      \"audience\": \"https://$DOMAIN/api/v2/\",
      \"grant_type\": \"client_credentials\"
    }" | jq -r '.access_token'
}

# --- Extract user ID from access token ---
get_user_id() {
  local token="$1"
  local payload=$(echo "$token" | cut -d. -f2)
  base64_url_decode "$payload" | jq -r '.sub'
}

# --- Get roles of a user using Management API token ---
get_user_roles() {
  local USER_ID="$1"
  local MGMT_TOKEN="$2"
  local DOMAIN="$AUTH0_DOMAIN"

  curl --silent --request GET \
    --url "https://$DOMAIN/api/v2/users/$USER_ID/roles" \
    --header "Authorization: Bearer $MGMT_TOKEN" | jq
}

# --- Main ---
load_env_file

ACCESS_TOKEN=$(login_user "ivankuts8240+2@gmail.com" "NotWeakPassword123")
echo "✅ Access token received."

USER_ID=$(get_user_id "$ACCESS_TOKEN")
echo "✅ User ID extracted: $USER_ID"

MGMT_TOKEN=$(get_mgmt_token)
echo "✅ Got MGTM Token to read user roles"

echo "✅ Roles assigned to user:"
get_user_roles "$USER_ID" "$MGMT_TOKEN"
