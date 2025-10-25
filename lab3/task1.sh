#!/usr/bin/env bash

# --- load initial .env values from .env file ---
load_env_file() {
  set -a
  source "$(dirname "$0")/.env"
  set +a
}

get_token() {

  curl --request POST "https://${AUTH0_DOMAIN}/oauth/token" \
    --header "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=http://auth0.com/oauth/grant-type/password-realm" \
    --data-urlencode "realm=Username-Password-Authentication" \
    --data-urlencode "audience=https://api.kujo205.com" \
    --data-urlencode "username=ivankuts8240@gmail.com" \
    --data-urlencode "password=NotWeakPassword123" \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "client_secret=${CLIENT_SECRET}" \
    --data-urlencode "scope=offline_access"
}

# --- run everything ---
load_env_file
get_token
