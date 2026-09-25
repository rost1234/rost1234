#!/usr/bin/env bash
# FeynmanMind - one-time AI setup (Supabase + Gemini) for macOS / Linux.
# Run from the feynmanmind folder:   bash setup-ai.sh
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "[X] Install Node.js from https://nodejs.org first."; exit 1; }
[ -d supabase/functions/feynman-evaluate ] || { echo "[X] Run this from the feynmanmind folder."; exit 1; }

echo "Supabase Reference ID: Project Settings > General"
read -rp "Supabase Reference ID: " REF
read -rsp "Gemini API key (hidden): " GEMINI; echo
[ -n "$REF" ] && [ -n "$GEMINI" ] || { echo "[X] Both values are required."; exit 1; }

SB="npx --yes supabase@latest"
echo "[1/4] Logging in to Supabase..."
$SB login
echo "[2/4] Saving the Gemini key on your server..."
$SB secrets set --project-ref "$REF" LLM_PROVIDER=gemini "GEMINI_API_KEY=$GEMINI"
echo "[3/4] Deploying the AI functions..."
for f in feynman-evaluate generate-flashcards generate-course generate-lesson; do
  echo "  - $f"
  $SB functions deploy "$f" --project-ref "$REF" --use-api --no-verify-jwt
done
echo
echo "[4/4] Done! In the app: Settings > AI connection"
echo "  Server URL:       https://$REF.supabase.co"
echo "  Publishable key:  (the sb_publishable_... key below)"
$SB projects api-keys --project-ref "$REF"
