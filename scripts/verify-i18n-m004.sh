#!/usr/bin/env bash
# verify-i18n-m004.sh — M004 i18n verification gauntlet
# Checks key equality, drift, M004 key presence, parameter consistency,
# German Umlaut correctness, and no hardcoded strings in M004 .svelte files.
# Exit 0 = all pass; non-zero = structured error output.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DE="$REPO_ROOT/apps/mobile/messages/de.json"
EN="$REPO_ROOT/apps/mobile/messages/en.json"

PASS=0
FAIL=0
FAILURES=()

pass() {
  echo "✓ PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "✗ FAIL: $1" >&2
  FAILURES+=("$1: $2")
  FAIL=$((FAIL + 1))
}

# ── Check 1: Key count equality ──────────────────────────────────────────────
de_count=$(jq 'keys | length' "$DE")
en_count=$(jq 'keys | length' "$EN")

if [[ "$de_count" == "$en_count" ]]; then
  pass "Key count equality ($de_count keys in both files)"
else
  fail "Key count equality" "de.json has $de_count keys, en.json has $en_count keys"
fi

# ── Check 2: Zero key drift ──────────────────────────────────────────────────
de_keys=$(jq -r 'keys[]' "$DE" | sort)
en_keys=$(jq -r 'keys[]' "$EN" | sort)
drift=$(diff <(echo "$de_keys") <(echo "$en_keys") || true)

if [[ -z "$drift" ]]; then
  pass "Zero key drift (sorted key diff is empty)"
else
  fail "Zero key drift" "Drift found: $drift"
fi

# ── Check 3: All 45 M004 keys present in both files ─────────────────────────
M004_KEYS=(
  # Auth (28)
  auth_email_label
  auth_email_placeholder
  auth_password_label
  auth_password_placeholder
  auth_confirm_password_label
  auth_confirm_password_placeholder
  auth_signin_title
  auth_signin_button
  auth_signin_submitting
  auth_signin_success
  auth_signin_error
  auth_signin_link
  auth_no_account
  auth_has_account
  auth_signup_title
  auth_signup_button
  auth_signup_submitting
  auth_signup_success
  auth_signup_error
  auth_signup_link
  auth_signout_button
  auth_signout_error
  auth_signout_success
  auth_settings_section
  auth_settings_signed_in
  auth_validation_email_invalid
  auth_validation_password_min
  auth_validation_passwords_must_match
  # Sync Status (11)
  sync_status_section
  sync_status_synced
  sync_status_syncing
  sync_status_error
  sync_status_never
  sync_status_just_now
  sync_status_last_synced
  sync_status_sync_now
  sync_status_error_title
  sync_status_error_description
  sync_status_retry
  # Export (6)
  export_section_label
  export_csv_button
  export_json_button
  export_success
  export_error
  export_in_progress
)

missing_de=()
missing_en=()
for key in "${M004_KEYS[@]}"; do
  if ! jq -e --arg k "$key" 'has($k)' "$DE" > /dev/null 2>&1; then
    missing_de+=("$key")
  fi
  if ! jq -e --arg k "$key" 'has($k)' "$EN" > /dev/null 2>&1; then
    missing_en+=("$key")
  fi
done

total_m004=${#M004_KEYS[@]}
if [[ ${#missing_de[@]} -eq 0 && ${#missing_en[@]} -eq 0 ]]; then
  pass "All $total_m004 M004 keys present in both files"
else
  details=""
  if [[ ${#missing_de[@]} -gt 0 ]]; then
    details+="Missing in de.json: ${missing_de[*]}. "
  fi
  if [[ ${#missing_en[@]} -gt 0 ]]; then
    details+="Missing in en.json: ${missing_en[*]}."
  fi
  fail "M004 keys presence ($total_m004 expected)" "$details"
fi

# ── Check 4: Parameter consistency across locales ────────────────────────────
# Extract {param} patterns from each key in both locales and compare
param_mismatches=()
while IFS= read -r key; do
  de_params=$(jq -r --arg k "$key" '.[$k]' "$DE" | grep -oE '\{[^}]+\}' | sort || true)
  en_params=$(jq -r --arg k "$key" '.[$k]' "$EN" | grep -oE '\{[^}]+\}' | sort || true)
  if [[ "$de_params" != "$en_params" ]]; then
    param_mismatches+=("$key (de: [$de_params] vs en: [$en_params])")
  fi
done < <(jq -r 'keys[]' "$DE")

if [[ ${#param_mismatches[@]} -eq 0 ]]; then
  pass "Parameter consistency across all keys"
else
  fail "Parameter consistency" "Mismatches: ${param_mismatches[*]}"
fi

# ── Check 5: German Umlaute correctness ──────────────────────────────────────
# Check for "ae", "oe", "ue" that should be ä, ö, ü in German text
# We check all values in de.json for common false-positives excluded
umlaut_violations=()
while IFS=$'\t' read -r key value; do
  # Skip keys where ae/oe/ue are legitimate English loanwords or technical terms
  # Check for patterns like "ae" "oe" "ue" that suggest missing Umlaute
  # Common false positive exclusions: "true", "blue", "clue", "due", "queue", "venue"
  if echo "$value" | grep -qiE '(^|[^a-z])(ae|oe|ue)([^a-z]|$)'; then
    # Filter out known false positives
    cleaned=$(echo "$value" | sed -E 's/(true|blue|clue|due|queue|venue|issue|continue|value|ague|ague|roue|sue|cue|hue|flue|glue|rue|shoe|toe|doe|foe|hoe|joe|roe|woe|aloe|canoe|oboe)//gi')
    if echo "$cleaned" | grep -qiE '(^|[^a-z])(ae|oe|ue)([^a-z]|$)'; then
      umlaut_violations+=("$key: $value")
    fi
  fi
done < <(jq -r 'to_entries[] | "\(.key)\t\(.value)"' "$DE")

if [[ ${#umlaut_violations[@]} -eq 0 ]]; then
  pass "German Umlaute correctness (no ae/oe/ue violations)"
else
  fail "German Umlaute correctness" "Violations: ${umlaut_violations[*]}"
fi

# ── Check 6: No hardcoded user-facing strings in M004 .svelte files ─────────
# Scan M004-related .svelte files for hardcoded strings
M004_SVELTE_FILES=(
  "apps/mobile/src/routes/auth/sign-in/+page.svelte"
  "apps/mobile/src/routes/auth/sign-in/SignInForm.svelte"
  "apps/mobile/src/routes/auth/sign-up/+page.svelte"
  "apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte"
  "apps/mobile/src/lib/components/settings/SyncStatusSection.svelte"
)

hardcoded=()
for file in "${M004_SVELTE_FILES[@]}"; do
  filepath="$REPO_ROOT/$file"
  if [[ ! -f "$filepath" ]]; then
    hardcoded+=("$file: FILE NOT FOUND")
    continue
  fi
  # Look for text content between HTML tags that isn't an m.* call, {variable}, or HTML entity
  # Focus on content inside the template section (after </script>)
  # Use grep to find lines with literal text in HTML-like context
  # Exclude: comments, script blocks, imports, class attributes, data attributes, type attributes
  while IFS= read -r line; do
    lineno=$(echo "$line" | cut -d: -f1)
    content=$(echo "$line" | cut -d: -f2-)
    # Skip lines that are purely code, comments, attributes, or slot content
    # Skip lines inside {#if dev} blocks (dev-only)
    # Skip lines that only contain HTML tags, attributes, or Svelte logic
    if echo "$content" | grep -qE '^\s*(//|/\*|\*|import |export |let |const |var |function |async |await |if |else|{#|{:|{/|<script|</script|<style|</style)'; then
      continue
    fi
    # Look for bare English/German words between > and < that aren't wrapped in {m. or {$
    if echo "$content" | grep -qE '>[[:space:]]*[A-Za-zÀ-ÿ]{3,}[[:space:]]*<'; then
      # Check it's not inside an m.* call or Svelte expression
      if ! echo "$content" | grep -qE '\{m\.|{m\.|{\$'; then
        hardcoded+=("$file:$lineno: $content")
      fi
    fi
  done < <(grep -n '.' "$filepath")
done

if [[ ${#hardcoded[@]} -eq 0 ]]; then
  pass "No hardcoded strings in M004 .svelte files (${#M004_SVELTE_FILES[@]} files checked)"
else
  fail "No hardcoded strings in M004 .svelte files" "Found: ${hardcoded[*]}"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  M004 i18n Verification: $PASS passed, $FAIL failed"
echo "════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  echo "" >&2
  echo "FAILURES:" >&2
  for f in "${FAILURES[@]}"; do
    echo "  - $f" >&2
  done
  exit 1
fi

exit 0
