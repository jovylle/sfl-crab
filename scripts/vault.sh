#!/usr/bin/env bash
# Encrypt or decrypt the analysis notes in docs/vault/.
#   docs/vault/plain/*.md    decrypted notes (gitignored)
#   docs/vault/enc/*.md.enc  encrypted notes (committed)
# Usage: scripts/vault.sh encrypt | decrypt | list
# The passphrase is VAULT_PASSPHRASE, read from the environment or from .env
# (this checkout's, or the main checkout's when run from a git worktree).
# It is passed to openssl through the environment, never on the command line.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAIN="$ROOT/docs/vault/plain"
ENC="$ROOT/docs/vault/enc"

# macOS ships LibreSSL, which lacks -pbkdf2. Prefer Homebrew OpenSSL.
OPENSSL=openssl
[ -x /opt/homebrew/opt/openssl/bin/openssl ] && OPENSSL=/opt/homebrew/opt/openssl/bin/openssl

find_env_file() {
  [ -f "$ROOT/.env" ] && { echo "$ROOT/.env"; return; }
  local common main
  common="$(git -C "$ROOT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  main="${common%/.git}"
  [ -n "$main" ] && [ -f "$main/.env" ] && echo "$main/.env"
  return 0
}

if [ -z "${VAULT_PASSPHRASE:-}" ]; then
  env_file="$(find_env_file)"
  if [ -n "$env_file" ]; then
    VAULT_PASSPHRASE="$(grep -E '^VAULT_PASSPHRASE=' "$env_file" | head -1 | cut -d= -f2- || true)"
    export VAULT_PASSPHRASE
  fi
fi
if [ -z "${VAULT_PASSPHRASE:-}" ]; then
  echo "VAULT_PASSPHRASE is not set. Add it to .env first." >&2
  exit 1
fi

mkdir -p "$PLAIN" "$ENC"

case "${1:-}" in
  encrypt)
    count=0
    for f in "$PLAIN"/*.md; do
      [ -e "$f" ] || continue
      "$OPENSSL" enc -aes-256-cbc -pbkdf2 -iter 600000 -salt \
        -pass env:VAULT_PASSPHRASE -in "$f" -out "$ENC/$(basename "$f").enc"
      count=$((count + 1))
    done
    echo "Encrypted $count file(s) into docs/vault/enc/"
    ;;
  decrypt)
    count=0
    for f in "$ENC"/*.md.enc; do
      [ -e "$f" ] || continue
      "$OPENSSL" enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
        -pass env:VAULT_PASSPHRASE -in "$f" -out "$PLAIN/$(basename "${f%.enc}")"
      count=$((count + 1))
    done
    echo "Decrypted $count file(s) into docs/vault/plain/"
    ;;
  list)
    ls -1 "$ENC"
    ;;
  *)
    echo "Usage: $0 encrypt | decrypt | list" >&2
    exit 2
    ;;
esac
