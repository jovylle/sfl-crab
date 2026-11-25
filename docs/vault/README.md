# Analysis vault

Encrypted working notes: product, ops and community scans. They stay encrypted because they may describe issues that are not fixed yet.

- `enc/*.md.enc` is committed. It is AES-256-CBC with PBKDF2, made by `scripts/vault.sh`.
- `plain/` holds the decrypted copies. It is gitignored. Never commit it.
- The passphrase is `VAULT_PASSPHRASE` in your local `.env`. It is not in Netlify or CI. Lose it and the notes are gone.

```bash
scripts/vault.sh decrypt   # enc/ -> plain/
scripts/vault.sh encrypt   # plain/ -> enc/ (re-encrypt after editing)
scripts/vault.sh list
```

Do not put player land IDs or secrets in the notes.
