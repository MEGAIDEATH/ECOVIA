#!/usr/bin/env bash
# Firestore security-rules regression check (emulator-based).
#
# Usage:
#   npx firebase-tools emulators:start --only firestore --project demo-baeeyen &
#   bash scripts/check-security-rules.sh
#
# Exits non-zero if any expectation fails. The cases below cover the defects
# found during the security audit (and their fixes):
#   * any signed-in user could LIST every message (legacy read clause)
#   * messages / chats / applications could be forged with an unrelated chatId
#   * pending profiles leaking to other users, cross-user writes
#   * contract signing by the wrong participant, signing twice
#   * queries whose constraints do not mirror the rules (must be rejected)
set -u
# FIRESTORE_EMULATOR_HOST conventionally looks like "127.0.0.1:8080".
HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"
PROJECT="${GCLOUD_PROJECT:-demo-baeeyen}"
PARENT="http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents/artifacts/default-app-id/public/data"
DATA="$PARENT"
OUT="$(mktemp -d)/rules"
pass=0
fail=0

token() {
  node -e '
    const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const n = Math.floor(Date.now() / 1000);
    const [uid, project] = process.argv.slice(1);
    const p = { iss: "https://securetoken.google.com/" + project, aud: project,
      iat: n, exp: n + 3600, auth_time: n, sub: uid, user_id: uid,
      firebase: { identities: {}, sign_in_provider: "custom" } };
    console.log(b({ alg: "none", typ: "JWT" }) + "." + b(p) + ".");
  ' "$1" "$PROJECT"
}

parse() {
  node -e '
    const fs = require("node:fs");
    let docs = "", status = "";
    try {
      const j = JSON.parse(fs.readFileSync(process.env.OUT + ".json", "utf8"));
      if (Array.isArray(j)) {
        const err = j.find((e) => e.error);
        docs = j.filter((e) => e.document).map((e) => e.document.name.split("/").pop()).sort().join(",");
        status = err ? err.error.status : "ok";
      } else if (j.error) { status = j.error.status; } else { status = "ok"; }
    } catch { status = "unparseable"; }
    fs.writeFileSync(process.env.OUT + ".docs", docs);
    process.stdout.write(status === "PERMISSION_DENIED" ? "denied" : (status === "ok" ? "allowed" : status));
  '
}

expect() { # label expected(denied|allowed) [expected-docs-csv]
  local label="$1" want="$2" wantDocs="${3:-}"
  local got; got="$(cat "$OUT.code")"
  local gotStatus; gotStatus="$(cat "$OUT.status")"
  local gotDocs=""; [ -f "$OUT.docs" ] && gotDocs="$(cat "$OUT.docs")"
  local httpGot; httpGot="$(cat "$OUT.http")"
  local ok=1
  [ "$gotStatus" = "$want" ] || ok=0
  [ "$want" = "allowed" ] && [ "$httpGot" != "200" ] && ok=0
  [ "$want" = "denied" ] && [ "$httpGot" != "403" ] && ok=0
  if [ -n "$wantDocs" ] && [ "$gotDocs" != "$wantDocs" ]; then ok=0; fi
  if [ "$ok" = "1" ]; then
    pass=$((pass + 1)); printf 'PASS  %-56s %s %s\n' "$label" "$gotStatus" "${gotDocs:+docs=[$gotDocs]}"
  else
    fail=$((fail + 1)); printf 'FAIL  %-56s got=%s(%s)%s want=%s%s\n' "$label" "$gotStatus" "$got" \
      "${gotDocs:+ docs=[$gotDocs]}" "$want" "${wantDocs:+ docs=[$wantDocs]}"
  fi
}

seed() {
  curl -s -X PATCH "$1" -H 'Authorization: Bearer owner' -H 'Content-Type: application/json' \
    -d "$2" -o /dev/null -w '%{http_code}'
}

request() { # token method url [body]
  local auth=()
  [ -n "$1" ] && auth=(-H "Authorization: Bearer $1")
  if [ -n "${4:-}" ]; then
    curl -s -X "$2" "$3" "${auth[@]}" -H 'Content-Type: application/json' -d "$4" \
      -o "$OUT.json" -w '%{http_code}' > "$OUT.http"
  else
    curl -s -X "$2" "$3" "${auth[@]}" -o "$OUT.json" -w '%{http_code}' > "$OUT.http"
  fi
  parse > "$OUT.status"
  cat "$OUT.http" > "$OUT.code"
}

q() { # label expected [docs] token body
  local label="$1" want="$2" wantDocs="" token body
  if [ "$#" -eq 5 ]; then
    wantDocs="$3"; token="$4"; body="$5"
  else
    token="$3"; body="$4"
  fi
  request "$token" POST "$PARENT:runQuery" "$body"
  expect "$label" "$want" "$wantDocs"
}

W() { # label expected token method path [body]
  if [ -n "${6:-}" ]; then request "$3" "$4" "$5" "$6"; else request "$3" "$4" "$5"; fi
  expect "$1" "$2"
}

export OUT
T_SPEC_B="$(token specB)"; T_SPEC_D="$(token specD)"; T_SPEC_P="$(token specP)"; T_SPEC_Q="$(token specQ)"
T_ORG_C="$(token orgC)"; T_EVIL="$(token evil)"
CAB="chat_orgA_specB"; CCD="chat_orgC_specD"

echo "=== seeding (owner bypass) ==="
seed "$DATA/specialists/specB" '{"fields":{"status":{"stringValue":"approved"},"fullName":{"stringValue":"Khaled"},"nationalId":{"stringValue":"1099"},"createdAt":{"timestampValue":"2026-01-01T00:00:00Z"}}}' > /dev/null
seed "$DATA/specialists/specD" '{"fields":{"status":{"stringValue":"approved"},"fullName":{"stringValue":"Noura"},"nationalId":{"stringValue":"2088"},"createdAt":{"timestampValue":"2026-01-01T00:00:00Z"}}}' > /dev/null
seed "$DATA/specialists/specP" '{"fields":{"status":{"stringValue":"pending"},"fullName":{"stringValue":"Pending"},"nationalId":{"stringValue":"2089"},"createdAt":{"timestampValue":"2026-01-01T00:00:00Z"}}}' > /dev/null
seed "$DATA/organizations/orgA" '{"fields":{"status":{"stringValue":"approved"},"orgName":{"stringValue":"Org A"},"createdAt":{"timestampValue":"2026-01-01T00:00:00Z"}}}' > /dev/null
seed "$DATA/organizations/orgC" '{"fields":{"status":{"stringValue":"approved"},"orgName":{"stringValue":"Org C"},"createdAt":{"timestampValue":"2026-01-01T00:00:00Z"}}}' > /dev/null
seed "$DATA/organizations/orgP" '{"fields":{"status":{"stringValue":"pending"},"orgName":{"stringValue":"Org P"},"createdAt":{"timestampValue":"2026-01-01T00:00:00Z"}}}' > /dev/null
seed "$DATA/chats/$CAB" '{"fields":{"participants":{"arrayValue":{"values":[{"stringValue":"orgA"},{"stringValue":"specB"}]}},"lastMessage":{"stringValue":"hi"}}}' > /dev/null
seed "$DATA/chats/$CCD" '{"fields":{"participants":{"arrayValue":{"values":[{"stringValue":"orgC"},{"stringValue":"specD"}]}},"lastMessage":{"stringValue":"hi"}}}' > /dev/null
seed "$DATA/messages/legacy1" '{"fields":{"chatId":{"stringValue":"'"$CAB"'"},"senderId":{"stringValue":"orgA"},"text":{"stringValue":"legacy"}}}' > /dev/null
seed "$DATA/messages/new1" '{"fields":{"chatId":{"stringValue":"'"$CAB"'"},"participants":{"arrayValue":{"values":[{"stringValue":"orgA"},{"stringValue":"specB"}]}},"senderId":{"stringValue":"orgA"},"text":{"stringValue":"new"}}}' > /dev/null
seed "$DATA/messages/other1" '{"fields":{"chatId":{"stringValue":"'"$CCD"'"},"participants":{"arrayValue":{"values":[{"stringValue":"orgC"},{"stringValue":"specD"}]}},"senderId":{"stringValue":"orgC"},"text":{"stringValue":"private"}}}' > /dev/null
seed "$DATA/applications/app1" '{"fields":{"specialistId":{"stringValue":"specB"},"organizationId":{"stringValue":"orgC"},"status":{"stringValue":"submitted"},"chatId":{"stringValue":"'"$CCD"'"}}}' > /dev/null

echo
echo "=== message confidentiality (the legacy-clause leak) ==="
q "any signed-in user LIST messages unfiltered"   denied "$T_EVIL" '{"structuredQuery":{"from":[{"collectionId":"messages"}]}}'
q "any signed-in user LIST another chat"          denied "$T_EVIL" '{"structuredQuery":{"from":[{"collectionId":"messages"}],"where":{"fieldFilter":{"field":{"fieldPath":"chatId"},"op":"EQUAL","value":{"stringValue":"'"$CCD"'"}}}}}'
q "chatId-only query (not rule-aligned)"          denied "$T_SPEC_B" '{"structuredQuery":{"from":[{"collectionId":"messages"}],"where":{"fieldFilter":{"field":{"fieldPath":"chatId"},"op":"EQUAL","value":{"stringValue":"'"$CAB"'"}}}}}'
q "participant query (rule-aligned)"              allowed "new1" "$T_SPEC_B" '{"structuredQuery":{"from":[{"collectionId":"messages"}],"where":{"compositeFilter":{"op":"AND","filters":[{"fieldFilter":{"field":{"fieldPath":"chatId"},"op":"EQUAL","value":{"stringValue":"'"$CAB"'"}}},{"fieldFilter":{"field":{"fieldPath":"participants"},"op":"ARRAY_CONTAINS","value":{"stringValue":"specB"}}}]}}}}'
q "participant LIST own conversations"            allowed "$CCD" "$T_ORG_C" '{"structuredQuery":{"from":[{"collectionId":"chats"}],"where":{"fieldFilter":{"field":{"fieldPath":"participants"},"op":"ARRAY_CONTAINS","value":{"stringValue":"orgC"}}}}}'

echo
echo "=== account visibility / ownership ==="
q "approved specialists directory requires server projection" denied "$T_ORG_C" '{"structuredQuery":{"from":[{"collectionId":"specialists"}],"where":{"fieldFilter":{"field":{"fieldPath":"status"},"op":"EQUAL","value":{"stringValue":"approved"}}}}}'
q "unrelated user cannot list approved specialists" denied "$T_EVIL" '{"structuredQuery":{"from":[{"collectionId":"specialists"}],"where":{"fieldFilter":{"field":{"fieldPath":"status"},"op":"EQUAL","value":{"stringValue":"pending"}}}}}'
q "pending specialists list (any signed-in)"       denied "$T_EVIL" '{"structuredQuery":{"from":[{"collectionId":"specialists"}],"where":{"fieldFilter":{"field":{"fieldPath":"status"},"op":"EQUAL","value":{"stringValue":"pending"}}}}}' 
q "approved organizations directory requires server projection" denied "$T_SPEC_B" '{"structuredQuery":{"from":[{"collectionId":"organizations"}],"where":{"fieldFilter":{"field":{"fieldPath":"status"},"op":"EQUAL","value":{"stringValue":"approved"}}}}}' 
q "unrelated user cannot list approved organizations" denied "$T_EVIL" '{"structuredQuery":{"from":[{"collectionId":"organizations"}],"where":{"fieldFilter":{"field":{"fieldPath":"status"},"op":"EQUAL","value":{"stringValue":"approved"}}}}}' 
W "other user GET pending profile"                 denied "$T_SPEC_B" GET "$DATA/specialists/specP"
W "owner GET own pending profile"                  allowed "$T_SPEC_P" GET "$DATA/specialists/specP"
W "owner UPDATE own CV field"                      allowed "$T_SPEC_B" PATCH "$DATA/specialists/specB?updateMask.fieldPaths=fullName" '{"fields":{"fullName":{"stringValue":"Khaled S"}}}'
W "owner cannot change status client-side"         denied "$T_SPEC_B" PATCH "$DATA/specialists/specB?updateMask.fieldPaths=status" '{"fields":{"status":{"stringValue":"pending"}}}'
W "cross-user profile update"                      denied "$T_EVIL" PATCH "$DATA/specialists/specB?updateMask.fieldPaths=fullName" '{"fields":{"fullName":{"stringValue":"hacked"}}}'
W "create a doc under someone else's uid"           denied "$T_EVIL" PATCH "$DATA/specialists/specZ" '{"fields":{"status":{"stringValue":"pending"},"fullName":{"stringValue":"squat"}}}'
W "self-approve an existing account via update"     denied "$T_SPEC_P" PATCH "$DATA/specialists/specP?updateMask.fieldPaths=status" '{"fields":{"status":{"stringValue":"approved"}}}'
W "client cannot self-approve on create"            denied "$T_SPEC_Q" PATCH "$DATA/specialists/specQ" '{"fields":{"status":{"stringValue":"approved"},"fullName":{"stringValue":"Squat"},"nationalId":{"stringValue":"2090"},"email":{"stringValue":"s@example.com"},"phone":{"stringValue":"0500000000"},"license":{"stringValue":"ELESL-2023-1"},"createdAt":{"timestampValue":"2026-01-01T00:00:00Z"}}}'

echo
echo "=== messages: forgery + reads ==="
W "message injection via forged chatId"            denied "$T_SPEC_B" PATCH "$DATA/messages/inject1" \
  '{"fields":{"chatId":{"stringValue":"'"$CCD"'"},"participants":{"arrayValue":{"values":[{"stringValue":"orgC"},{"stringValue":"specB"}]}},"senderId":{"stringValue":"specB"},"text":{"stringValue":"injected"}}}'
W "consistent message create"                      allowed "$T_SPEC_B" PATCH "$DATA/messages/legit1" \
  '{"fields":{"chatId":{"stringValue":"'"$CAB"'"},"participants":{"arrayValue":{"values":[{"stringValue":"orgA"},{"stringValue":"specB"}]}},"senderId":{"stringValue":"specB"},"text":{"stringValue":"hello"}}}'
  W "pending counterpart cannot create a message"     denied "$T_SPEC_P" PATCH "$DATA/messages/pending-message" \
    '{"fields":{"chatId":{"stringValue":"chat_orgA_specP"},"participants":{"arrayValue":{"values":[{"stringValue":"orgA"},{"stringValue":"specP"}]}},"senderId":{"stringValue":"specP"},"text":{"stringValue":"blocked"}}}'
W "sender must be the author"                      denied "$T_SPEC_B" PATCH "$DATA/messages/legit2" \
  '{"fields":{"chatId":{"stringValue":"'"$CAB"'"},"participants":{"arrayValue":{"values":[{"stringValue":"orgA"},{"stringValue":"specB"}]}},"senderId":{"stringValue":"orgA"},"text":{"stringValue":"spoofed sender"}}}'
W "non-participant GET message doc"                denied "$T_SPEC_B" GET "$DATA/messages/other1"
W "participant GET message doc"                    allowed "$T_SPEC_B" GET "$DATA/messages/new1"
W "legacy message (no participants) needs backfill" denied "$T_SPEC_B" GET "$DATA/messages/legacy1"

echo
echo "=== conversations + applications ==="
W "outsider rewrites a conversation doc"            denied "$T_EVIL" PATCH "$DATA/chats/$CCD" \
  '{"fields":{"participants":{"arrayValue":{"values":[{"stringValue":"orgC"},{"stringValue":"specD"}]}},"lastMessage":{"stringValue":"injected"}}}'
W "participant merges own conversation metadata"     allowed "$T_ORG_C" PATCH "$DATA/chats/$CCD" \
  '{"fields":{"participants":{"arrayValue":{"values":[{"stringValue":"orgC"},{"stringValue":"specD"}]}},"lastMessage":{"stringValue":"legit"}}}'
W "chat id must match participant order"             denied "$T_EVIL" PATCH "$DATA/chats/chat_evil_orgC" \
  '{"fields":{"participants":{"arrayValue":{"values":[{"stringValue":"orgC"},{"stringValue":"evil"}]}},"lastMessage":{"stringValue":"spoof"}}}'
W "application create (approved pair)"             allowed "$T_SPEC_B" PATCH "$DATA/applications/app2" \
  '{"fields":{"specialistId":{"stringValue":"specB"},"organizationId":{"stringValue":"orgC"},"organizationName":{"stringValue":"Org C"},"status":{"stringValue":"submitted"},"chatId":{"stringValue":"chat_orgC_specB"}}}'
W "application with unrelated chatId"                denied "$T_EVIL" PATCH "$DATA/applications/app3" \
  '{"fields":{"specialistId":{"stringValue":"evil"},"organizationId":{"stringValue":"orgC"},"status":{"stringValue":"submitted"},"chatId":{"stringValue":"'"$CCD"'"}}}'
W "application self-approval blocked"                denied "$T_SPEC_B" PATCH "$DATA/applications/app4" \
  '{"fields":{"specialistId":{"stringValue":"specB"},"organizationId":{"stringValue":"orgC"},"status":{"stringValue":"approved"},"chatId":{"stringValue":"chat_orgC_specB"}}}'
q "own application history"                          allowed "app1,app2" "$T_SPEC_B" '{"structuredQuery":{"from":[{"collectionId":"applications"}],"where":{"fieldFilter":{"field":{"fieldPath":"specialistId"},"op":"EQUAL","value":{"stringValue":"specB"}}}}}'
q "other user's application history"                 denied "$T_SPEC_B" '{"structuredQuery":{"from":[{"collectionId":"applications"}],"where":{"fieldFilter":{"field":{"fieldPath":"specialistId"},"op":"EQUAL","value":{"stringValue":"specD"}}}}}'

echo
echo "=== contracts ==="
T_ORG_A="$(token orgA)"
W "organization opens a pending contract"            allowed "$T_ORG_A" PATCH "$DATA/messages/pending1" \
  '{"fields":{"chatId":{"stringValue":"'"$CAB"'"},"participants":{"arrayValue":{"values":[{"stringValue":"orgA"},{"stringValue":"specB"}]}},"senderId":{"stringValue":"orgA"},"text":{"stringValue":"عقد جديد"},"isContract":{"booleanValue":true},"contractData":{"mapValue":{"fields":{"title":{"stringValue":"t"},"value":{"stringValue":"1"},"duration":{"stringValue":"1"},"orgSig":{"stringValue":"Org A"},"specSig":{"nullValue":null},"status":{"stringValue":"pending"}}}}}}'
W "specialist signs the pending contract"            allowed "$T_SPEC_B" PATCH "$DATA/messages/pending1?updateMask.fieldPaths=contractData" \
  '{"fields":{"contractData":{"mapValue":{"fields":{"title":{"stringValue":"t"},"value":{"stringValue":"1"},"duration":{"stringValue":"1"},"orgSig":{"stringValue":"Org A"},"specSig":{"stringValue":"specB"},"status":{"stringValue":"signed"}}}}}}'
W "specialist cannot sign twice"                     denied "$T_SPEC_B" PATCH "$DATA/messages/pending1?updateMask.fieldPaths=contractData" \
  '{"fields":{"contractData":{"mapValue":{"fields":{"title":{"stringValue":"t"},"value":{"stringValue":"1"},"duration":{"stringValue":"1"},"orgSig":{"stringValue":"Org A"},"specSig":{"stringValue":"specB"},"status":{"stringValue":"signed"}}}}}}'
W "organization cannot sign its own contract"        denied "$T_ORG_A" PATCH "$DATA/messages/pending1?updateMask.fieldPaths=contractData" \
  '{"fields":{"contractData":{"mapValue":{"fields":{"title":{"stringValue":"t"},"value":{"stringValue":"1"},"duration":{"stringValue":"1"},"orgSig":{"stringValue":"Org A"},"specSig":{"stringValue":"orgA"},"status":{"stringValue":"signed"}}}}}}'

echo
echo "=== summary ==="
printf 'passed: %d   failed: %d\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1



