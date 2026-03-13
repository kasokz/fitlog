#!/usr/bin/env bash
# verify-s06-submission.sh — Pre-submission validation for App Store & Google Play
#
# Checks 20+ automatable prerequisites before store submission.
# Exit 0 = all pass, Exit 1 = at least one failure.
#
# Usage: bash apps/mobile/scripts/verify-s06-submission.sh

set -euo pipefail

# ── Paths ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$MOBILE_ROOT/../.." && pwd)"

IOS_META="$MOBILE_ROOT/fastlane/metadata/ios"
ANDROID_META="$MOBILE_ROOT/fastlane/metadata/android"
FASTLANE_DIR="$MOBILE_ROOT/fastlane"
SCREENSHOTS_DIR="$FASTLANE_DIR/screenshots"
IOS_APP_DIR="$MOBILE_ROOT/ios/App/App"
PURCHASE_PLUGIN="$MOBILE_ROOT/src/lib/services/purchase-plugin.ts"

# ── Counters ──
PASS=0
FAIL=0
TOTAL=0

pass() {
  TOTAL=$((TOTAL + 1))
  PASS=$((PASS + 1))
  printf "  \033[32mPASS\033[0m  %s\n" "$1"
}

fail() {
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  printf "  \033[31mFAIL\033[0m  %s\n" "$1"
}

section() {
  echo ""
  printf "\033[1m── %s ──\033[0m\n" "$1"
}

# =============================================================================
section "Metadata completeness"
# =============================================================================

# Check 1: iOS metadata file count >= 20
ios_count=$(find "$IOS_META" -type f | wc -l | tr -d ' ')
if [ "$ios_count" -ge 20 ]; then
  pass "iOS metadata files: $ios_count (>= 20)"
else
  fail "iOS metadata files: $ios_count (expected >= 20)"
fi

# Check 2: Android metadata file count >= 8 (excluding .gitkeep)
android_count=$(find "$ANDROID_META" -type f ! -name '.gitkeep' | wc -l | tr -d ' ')
if [ "$android_count" -ge 8 ]; then
  pass "Android metadata files: $android_count (>= 8)"
else
  fail "Android metadata files: $android_count (expected >= 8)"
fi

# Check 3: review_information directory with required files
review_files=("demo_password.txt" "demo_user.txt" "email_address.txt" "first_name.txt" "last_name.txt" "notes.txt" "phone_number.txt")
review_ok=true
for f in "${review_files[@]}"; do
  if [ ! -f "$IOS_META/review_information/$f" ]; then
    review_ok=false
    break
  fi
done
if $review_ok; then
  pass "review_information: all 7 files present"
else
  fail "review_information: missing files in $IOS_META/review_information/"
fi

# =============================================================================
section "Character limits"
# =============================================================================

# Check 4: iOS subtitle de-DE <= 30 chars
sub_de=$(tr -d '\n' < "$IOS_META/de-DE/subtitle.txt")
sub_de_len=${#sub_de}
if [ "$sub_de_len" -le 30 ]; then
  pass "iOS subtitle de-DE: $sub_de_len chars (<= 30)"
else
  fail "iOS subtitle de-DE: $sub_de_len chars (exceeds 30)"
fi

# Check 5: iOS subtitle en-US <= 30 chars
sub_en=$(tr -d '\n' < "$IOS_META/en-US/subtitle.txt")
sub_en_len=${#sub_en}
if [ "$sub_en_len" -le 30 ]; then
  pass "iOS subtitle en-US: $sub_en_len chars (<= 30)"
else
  fail "iOS subtitle en-US: $sub_en_len chars (exceeds 30)"
fi

# Check 6: iOS keywords de-DE <= 100 chars
kw_de=$(tr -d '\n' < "$IOS_META/de-DE/keywords.txt")
kw_de_len=${#kw_de}
if [ "$kw_de_len" -le 100 ]; then
  pass "iOS keywords de-DE: $kw_de_len chars (<= 100)"
else
  fail "iOS keywords de-DE: $kw_de_len chars (exceeds 100)"
fi

# Check 7: iOS keywords en-US <= 100 chars
kw_en=$(tr -d '\n' < "$IOS_META/en-US/keywords.txt")
kw_en_len=${#kw_en}
if [ "$kw_en_len" -le 100 ]; then
  pass "iOS keywords en-US: $kw_en_len chars (<= 100)"
else
  fail "iOS keywords en-US: $kw_en_len chars (exceeds 100)"
fi

# Check 8: Android title de-DE <= 30 chars
at_de=$(tr -d '\n' < "$ANDROID_META/de-DE/title.txt")
at_de_len=${#at_de}
if [ "$at_de_len" -le 30 ]; then
  pass "Android title de-DE: $at_de_len chars (<= 30)"
else
  fail "Android title de-DE: $at_de_len chars (exceeds 30)"
fi

# Check 9: Android title en-US <= 30 chars
at_en=$(tr -d '\n' < "$ANDROID_META/en-US/title.txt")
at_en_len=${#at_en}
if [ "$at_en_len" -le 30 ]; then
  pass "Android title en-US: $at_en_len chars (<= 30)"
else
  fail "Android title en-US: $at_en_len chars (exceeds 30)"
fi

# Check 10: Android short_description de-DE <= 80 chars
sd_de=$(tr -d '\n' < "$ANDROID_META/de-DE/short_description.txt")
sd_de_len=${#sd_de}
if [ "$sd_de_len" -le 80 ]; then
  pass "Android short_description de-DE: $sd_de_len chars (<= 80)"
else
  fail "Android short_description de-DE: $sd_de_len chars (exceeds 80)"
fi

# Check 11: Android short_description en-US <= 80 chars
sd_en=$(tr -d '\n' < "$ANDROID_META/en-US/short_description.txt")
sd_en_len=${#sd_en}
if [ "$sd_en_len" -le 80 ]; then
  pass "Android short_description en-US: $sd_en_len chars (<= 80)"
else
  fail "Android short_description en-US: $sd_en_len chars (exceeds 80)"
fi

# =============================================================================
section "Content rules"
# =============================================================================

# Check 12: No emojis in any metadata file
# Match common emoji Unicode ranges
emoji_found=false
while IFS= read -r file; do
  if grep -Pq '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE00}-\x{FE0F}\x{200D}\x{20E3}\x{E0020}-\x{E007F}]' "$file" 2>/dev/null; then
    emoji_found=true
    fail "No emojis: found emoji in $(basename "$(dirname "$file")")/$(basename "$file")"
    break
  fi
done < <(find "$IOS_META" "$ANDROID_META" -type f -name '*.txt' -o -name '*.json')

if ! $emoji_found; then
  pass "No emojis in metadata files"
fi

# Check 13: age_rating_declaration.json contains healthOrWellnessTopics: true
if grep -q '"healthOrWellnessTopics"[[:space:]]*:[[:space:]]*true' "$IOS_META/age_rating_declaration.json"; then
  pass "age_rating: healthOrWellnessTopics is true"
else
  fail "age_rating: healthOrWellnessTopics must be true"
fi

# =============================================================================
section "Product consistency"
# =============================================================================

# Check 14-16: All 3 PRODUCT_IDS from purchase-plugin.ts appear in Products.storekit
STOREKIT="$IOS_APP_DIR/Products.storekit"
product_ids=("com.fitlog.app.premium.annual" "com.fitlog.app.premium.monthly" "com.fitlog.app.templates.pack")

for pid in "${product_ids[@]}"; do
  if grep -q "\"$pid\"" "$STOREKIT"; then
    pass "StoreKit contains $pid"
  else
    fail "StoreKit missing $pid"
  fi
done

# Check 17: Same product IDs exist in purchase-plugin.ts source
for pid in "${product_ids[@]}"; do
  if grep -q "'$pid'" "$PURCHASE_PLUGIN"; then
    pass "purchase-plugin.ts contains $pid"
  else
    fail "purchase-plugin.ts missing $pid"
  fi
done

# =============================================================================
section "Entitlements"
# =============================================================================

# Check 18: App.entitlements contains IAP entitlement
if grep -q "com.apple.developer.in-app-purchases" "$IOS_APP_DIR/App.entitlements"; then
  pass "App.entitlements: IAP entitlement present"
else
  fail "App.entitlements: missing com.apple.developer.in-app-purchases"
fi

# =============================================================================
section "Fastlane config"
# =============================================================================

# Check 19: Required fastlane files exist
fastlane_files=("Fastfile" "Appfile" "Matchfile" "Pluginfile" ".env.example")
fl_ok=true
fl_missing=""
for f in "${fastlane_files[@]}"; do
  if [ ! -f "$FASTLANE_DIR/$f" ]; then
    fl_ok=false
    fl_missing="$fl_missing $f"
  fi
done
if $fl_ok; then
  pass "Fastlane config files: all 5 present"
else
  fail "Fastlane config files: missing$fl_missing"
fi

# Check 20: Appfile references com.fitlog.app
if grep -q 'com.fitlog.app' "$FASTLANE_DIR/Appfile"; then
  pass "Appfile references com.fitlog.app"
else
  fail "Appfile does not reference com.fitlog.app"
fi

# =============================================================================
section "Screenshot pipeline"
# =============================================================================

# Check 21: iOS Framefile.json exists
if [ -f "$SCREENSHOTS_DIR/Framefile.json" ]; then
  pass "iOS Framefile.json exists"
else
  fail "iOS Framefile.json missing"
fi

# Check 22: Android Framefile.json exists
if [ -f "$ANDROID_META/Framefile.json" ]; then
  pass "Android Framefile.json exists"
else
  fail "Android Framefile.json missing"
fi

# Check 23-26: de-DE and en-US each have keyword.strings and title.strings with 6 entries
for locale in de-DE en-US; do
  for sfile in keyword.strings title.strings; do
    filepath="$SCREENSHOTS_DIR/$locale/$sfile"
    if [ -f "$filepath" ]; then
      entry_count=$(grep -c '"0' "$filepath" || true)
      if [ "$entry_count" -eq 6 ]; then
        pass "$locale/$sfile: $entry_count entries"
      else
        fail "$locale/$sfile: $entry_count entries (expected 6)"
      fi
    else
      fail "$locale/$sfile: file missing"
    fi
  done
done

# =============================================================================
section "Build verification"
# =============================================================================

# Check 27: pnpm test passes
echo "  ...  Running pnpm test"
if (cd "$REPO_ROOT" && pnpm test) > /dev/null 2>&1; then
  pass "pnpm test passes"
else
  fail "pnpm test failed"
fi

# Check 28: pnpm run build succeeds
echo "  ...  Running pnpm run build"
if (cd "$REPO_ROOT" && pnpm run build) > /dev/null 2>&1; then
  pass "pnpm run build succeeds"
else
  fail "pnpm run build failed"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
printf "\033[1m═══════════════════════════════════════════\033[0m\n"
printf "\033[1m  Results: %d passed, %d failed, %d total\033[0m\n" "$PASS" "$FAIL" "$TOTAL"
printf "\033[1m═══════════════════════════════════════════\033[0m\n"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  printf "\033[31m  SUBMISSION NOT READY — fix %d issue(s) above\033[0m\n" "$FAIL"
  exit 1
else
  echo ""
  printf "\033[32m  ALL CHECKS PASSED — ready for submission\033[0m\n"
  exit 0
fi
