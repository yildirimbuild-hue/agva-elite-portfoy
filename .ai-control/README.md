# AI Koordinasyon Merkezi

Bu klasörü uygulama çalışma alanına `.ai-control` adıyla kopyalayın.

## Temel çalışma

- Her yapay zekâ `AGENT-REGISTRY.json` içinde benzersiz kimlikle kayıt olur.
- Her görev `WORKSTREAMS.json` içinde ayrı workstream olur.
- Ajan kendi `agents/<AGENT_ID>/WORKLOG.md` dosyasına append eder.
- Mesajlar `MESSAGE-QUEUE.jsonl`, INBOX ve OUTBOX üzerinden taşınır.
- Kod değişmeden önce dosya/dizin kilidi alınır.
- Geliştirici ZIP üretmez.
- Release yalnız kullanıcı bağımsız satırda `PAKETLE` dedikten sonra ve `release-check` başarılıysa yapılır.

## Komut aracı

```bash
python scripts/coord.py validate
python scripts/coord.py register --agent AI-DEV-01 --role DEVELOPER
python scripts/coord.py create-workstream --id WS-001 --title "Örnek iş" --owner AI-DEV-01
python scripts/coord.py claim --id WS-001 --agent AI-DEV-01
python scripts/coord.py lock --agent AI-DEV-01 --workstream WS-001 --path src/lib/example.ts
python scripts/coord.py log --agent AI-DEV-01 --workstream WS-001 --summary "İş kuralı eklendi" --files src/lib/example.ts --test "npm test: PASS"
python scripts/coord.py message --from-agent AI-DEV-01 --to AI-COORD-01 --type INFO --subject "Durum" --body "İlk aşama tamamlandı"
python scripts/coord.py status --id WS-001 --state REVIEW_READY --agent AI-DEV-01
python scripts/coord.py release-authorize --command PAKETLE
python scripts/coord.py release-check
```
