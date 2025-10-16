#!/bin/bash

GRANT_TYPE="client_credentials"
CLIENT_ID="JIvCO5c2IBHlAe2patn6l6q5H35qxti0"
CLIENT_SECRET="ZRF8Op0tWM36p1_hxXTU-B0K_Gq_-eAVtlrQpY24CasYiDmcXBhNS6IJMNcz1EgB"
AUDIENCE="https://kpi.eu.auth0.com/api/v2/"

curl --request POST \
  --url 'https://kpi.eu.auth0.com/oauth/token' \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data "grant_type=$GRANT_TYPE&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&audience=$AUDIENCE"
