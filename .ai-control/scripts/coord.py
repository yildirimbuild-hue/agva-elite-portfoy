#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, hashlib, os, sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]

def now():
    return datetime.now(timezone.utc).isoformat()

def read_json(name, default):
    p = ROOT / name
    if not p.exists():
        return default
    return json.loads(p.read_text(encoding="utf-8"))

def write_json(name, data):
    p = ROOT / name
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, p)

def append_jsonl(path, obj):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def event(kind, agent=None, workstream=None, payload=None):
    e = {
        "eventId": "EVT-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"),
        "timestamp": now(), "type": kind, "agentId": agent,
        "workstreamId": workstream, "payload": payload or {}
    }
    append_jsonl("EVENT-LOG.jsonl", e)
    state = read_json("CONTROL-STATE.json", {})
    state["lastEventId"] = e["eventId"]
    state["updatedAt"] = e["timestamp"]
    write_json("CONTROL-STATE.json", state)
    return e

def ensure_agent(agent):
    reg = read_json("AGENT-REGISTRY.json", {"schemaVersion":1,"agents":[]})
    if not any(a["agentId"] == agent for a in reg["agents"]):
        raise SystemExit(f"Agent kayıtlı değil: {agent}")

def cmd_validate(args):
    required = [
        "CONTROL-STATE.json","AGENT-REGISTRY.json","WORKSTREAMS.json",
        "FILE-OWNERSHIP.json","RELEASE-STATE.json","EVENT-LOG.jsonl",
        "MESSAGE-QUEUE.jsonl"
    ]
    missing = [x for x in required if not (ROOT/x).exists()]
    errors = []
    for x in required:
        p = ROOT/x
        if p.exists() and p.suffix == ".json":
            try: json.loads(p.read_text(encoding="utf-8"))
            except Exception as exc: errors.append(f"{x}: {exc}")
    if missing or errors:
        print(json.dumps({"status":"FAIL","missing":missing,"errors":errors}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({"status":"PASS","root":str(ROOT)}, ensure_ascii=False, indent=2))
    return 0

def cmd_register(args):
    reg = read_json("AGENT-REGISTRY.json", {"schemaVersion":1,"agents":[]})
    if any(a["agentId"] == args.agent for a in reg["agents"]):
        raise SystemExit("Agent zaten kayıtlı")
    record = {
        "agentId":args.agent,"role":args.role,"status":"IDLE",
        "registeredAt":now(),"heartbeatAt":now(),"activeWorkstreamId":None
    }
    reg["agents"].append(record); write_json("AGENT-REGISTRY.json", reg)
    ad = ROOT/"agents"/args.agent; ad.mkdir(parents=True, exist_ok=True)
    write_json(f"agents/{args.agent}/STATUS.json", record)
    (ad/"WORKLOG.md").write_text("# Ajan Çalışma Günlüğü\n\n", encoding="utf-8")
    (ad/"INBOX.jsonl").write_text("", encoding="utf-8")
    (ad/"OUTBOX.jsonl").write_text("", encoding="utf-8")
    event("AGENT_REGISTERED", args.agent, payload={"role":args.role})
    print(json.dumps(record, ensure_ascii=False, indent=2))

def cmd_create_workstream(args):
    ws = read_json("WORKSTREAMS.json", {"schemaVersion":1,"workstreams":[]})
    if any(w["workstreamId"] == args.id for w in ws["workstreams"]):
        raise SystemExit("Workstream zaten var")
    record = {
        "workstreamId":args.id,"title":args.title,"state":"READY",
        "ownerAgentId":args.owner,"reviewerAgentId":args.reviewer,
        "baseVersion":args.base_version,"baseSha256":args.base_sha,
        "allowedPaths":[p for p in args.paths.split(",") if p],
        "blockers":[],"updatedAt":now()
    }
    ws["workstreams"].append(record); write_json("WORKSTREAMS.json", ws)
    wd = ROOT/"workstreams"/args.id; wd.mkdir(parents=True, exist_ok=True)
    write_json(f"workstreams/{args.id}/STATE.json", record)
    (wd/"CHARTER.md").write_text(f"# {args.id} — {args.title}\n\nOWNER: {args.owner}\nBASE: {args.base_version} / {args.base_sha}\n", encoding="utf-8")
    (wd/"CHANGE-REPORT.md").write_text("# Değişiklik Raporu\n\n", encoding="utf-8")
    (wd/"TEST-REPORT.md").write_text("# Test Raporu\n\n", encoding="utf-8")
    write_json(f"workstreams/{args.id}/PATCH-MANIFEST.json", {
        "schemaVersion":1,"workstreamId":args.id,"baseSha256":args.base_sha,
        "changedFiles":[],"addedFiles":[],"deletedFiles":[],"tests":[],"openRisks":[]
    })
    event("WORKSTREAM_CREATED", args.owner, args.id, {"title":args.title})
    print(json.dumps(record, ensure_ascii=False, indent=2))

def find_ws(wsid):
    data = read_json("WORKSTREAMS.json", {"schemaVersion":1,"workstreams":[]})
    for w in data["workstreams"]:
        if w["workstreamId"] == wsid:
            return data, w
    raise SystemExit(f"Workstream yok: {wsid}")

def save_ws(data, record):
    record["updatedAt"] = now()
    write_json("WORKSTREAMS.json", data)
    write_json(f"workstreams/{record['workstreamId']}/STATE.json", record)

def cmd_claim(args):
    ensure_agent(args.agent)
    data, w = find_ws(args.id)
    if w["state"] not in ("READY","PLANNED","ON_HOLD"):
        raise SystemExit(f"Claim edilemez durum: {w['state']}")
    if w.get("ownerAgentId") not in (None, args.agent):
        raise SystemExit(f"Sahibi farklı: {w.get('ownerAgentId')}")
    w["ownerAgentId"] = args.agent; w["state"] = "CLAIMED"; save_ws(data,w)
    event("WORKSTREAM_CLAIMED", args.agent, args.id)
    print(json.dumps(w, ensure_ascii=False, indent=2))

def lock_name(path):
    return hashlib.sha256(path.encode("utf-8")).hexdigest() + ".json"

def cmd_lock(args):
    ensure_agent(args.agent)
    p = ROOT/"locks"/lock_name(args.path); p.parent.mkdir(parents=True, exist_ok=True)
    payload = {"path":args.path,"agentId":args.agent,"workstreamId":args.workstream,
               "baseSha256":args.base_sha,"createdAt":now(),"heartbeatAt":now(),"status":"ACTIVE"}
    try:
        fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2); f.write("\n")
    except FileExistsError:
        existing = json.loads(p.read_text(encoding="utf-8"))
        raise SystemExit("Kilit mevcut: " + json.dumps(existing, ensure_ascii=False))
    event("FILE_LOCKED", args.agent, args.workstream, {"path":args.path})
    print(json.dumps(payload, ensure_ascii=False, indent=2))

def cmd_unlock(args):
    p = ROOT/"locks"/lock_name(args.path)
    if not p.exists(): raise SystemExit("Kilit yok")
    lock = json.loads(p.read_text(encoding="utf-8"))
    if lock["agentId"] != args.agent and not args.force:
        raise SystemExit("Kilit başka ajana ait")
    p.unlink()
    event("FILE_UNLOCKED", args.agent, lock.get("workstreamId"), {"path":args.path,"force":args.force})
    print("OK")

def cmd_status(args):
    ensure_agent(args.agent)
    allowed = {"PLANNED","READY","CLAIMED","IN_PROGRESS","BLOCKED","REVIEW_READY",
               "IN_REVIEW","CHANGES_REQUESTED","APPROVED","INTEGRATED","RELEASED",
               "ON_HOLD","CANCELLED","SUPERSEDED"}
    if args.state not in allowed: raise SystemExit("Geçersiz durum")
    data, w = find_ws(args.id)
    w["state"] = args.state; save_ws(data,w)
    event("WORKSTREAM_STATE_CHANGED", args.agent, args.id, {"state":args.state})
    print(json.dumps(w, ensure_ascii=False, indent=2))

def cmd_log(args):
    ensure_agent(args.agent)
    e = event("WORKLOG_CHECKPOINT", args.agent, args.workstream, {
        "summary":args.summary,"files":args.files,"test":args.test,
        "blocker":args.blocker,"next":args.next
    })
    p = ROOT/"agents"/args.agent/"WORKLOG.md"
    with p.open("a", encoding="utf-8") as f:
        f.write(f"\n## {e['timestamp']} — {e['eventId']}\n")
        f.write(f"WORKSTREAM: {args.workstream}\nDURUM: {args.state}\n")
        f.write(f"YAPILAN: {args.summary}\nDOSYALAR: {args.files or 'Yok'}\n")
        f.write(f"TEST: {args.test or 'Çalıştırılmadı'}\nBLOKER: {args.blocker or 'Yok'}\n")
        f.write(f"SONRAKI: {args.next or 'Belirtilmedi'}\n")
    print(json.dumps(e, ensure_ascii=False, indent=2))

def cmd_message(args):
    ensure_agent(args.from_agent)
    msg = {
        "messageId":"MSG-"+datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"),
        "timestamp":now(),"from":args.from_agent,"to":args.to.split(","),
        "workstreamId":args.workstream,"type":args.type,"subject":args.subject,
        "body":args.body,"requiresResponse":args.requires_response,"status":"OPEN"
    }
    append_jsonl("MESSAGE-QUEUE.jsonl", msg)
    append_jsonl(f"agents/{args.from_agent}/OUTBOX.jsonl", msg)
    for target in msg["to"]:
        ensure_agent(target)
        append_jsonl(f"agents/{target}/INBOX.jsonl", msg)
    event("MESSAGE_SENT", args.from_agent, args.workstream, {"messageId":msg["messageId"],"to":msg["to"]})
    print(json.dumps(msg, ensure_ascii=False, indent=2))

def cmd_release_authorize(args):
    if args.command.strip().upper() != "PAKETLE":
        raise SystemExit("Yetki komutu geçersiz; bağımsız komut PAKETLE olmalı")
    state = read_json("RELEASE-STATE.json", {})
    state["authorized"] = True
    state["authorizationCommand"] = "PAKETLE"
    state["authorizedAt"] = now()
    state["authorizedBy"] = "USER"
    write_json("RELEASE-STATE.json", state)
    event("RELEASE_AUTHORIZED", "USER", payload={"command":"PAKETLE"})
    print(json.dumps(state, ensure_ascii=False, indent=2))

def cmd_release_check(args):
    state = read_json("RELEASE-STATE.json", {})
    ws = read_json("WORKSTREAMS.json", {"workstreams":[]})["workstreams"]
    locks = list((ROOT/"locks").glob("*.json")) if (ROOT/"locks").exists() else []
    open_states = [w["workstreamId"] for w in ws if w["state"] not in ("INTEGRATED","RELEASED","CANCELLED","SUPERSEDED","ON_HOLD")]
    gates = state.get("gates", {})
    computed = {
        "authorized": bool(state.get("authorized")),
        "openWorkstreams": open_states,
        "activeLocks": [str(p.name) for p in locks],
        "manualGates": gates
    }
    pass_all = computed["authorized"] and not open_states and not locks and all(bool(v) for v in gates.values())
    computed["status"] = "PASS" if pass_all else "FAIL"
    print(json.dumps(computed, ensure_ascii=False, indent=2))
    return 0 if pass_all else 2

def build_parser():
    p=argparse.ArgumentParser(description="YGİS V1.2 çoklu AI koordinasyon aracı")
    sp=p.add_subparsers(dest="cmd", required=True)
    s=sp.add_parser("validate"); s.set_defaults(func=cmd_validate)
    s=sp.add_parser("register"); s.add_argument("--agent",required=True); s.add_argument("--role",required=True); s.set_defaults(func=cmd_register)
    s=sp.add_parser("create-workstream"); s.add_argument("--id",required=True); s.add_argument("--title",required=True); s.add_argument("--owner",required=True); s.add_argument("--reviewer"); s.add_argument("--base-version",default="UNVERIFIED"); s.add_argument("--base-sha",default="UNVERIFIED"); s.add_argument("--paths",default=""); s.set_defaults(func=cmd_create_workstream)
    s=sp.add_parser("claim"); s.add_argument("--id",required=True); s.add_argument("--agent",required=True); s.set_defaults(func=cmd_claim)
    s=sp.add_parser("lock"); s.add_argument("--agent",required=True); s.add_argument("--workstream",required=True); s.add_argument("--path",required=True); s.add_argument("--base-sha",default="UNVERIFIED"); s.set_defaults(func=cmd_lock)
    s=sp.add_parser("unlock"); s.add_argument("--agent",required=True); s.add_argument("--path",required=True); s.add_argument("--force",action="store_true"); s.set_defaults(func=cmd_unlock)
    s=sp.add_parser("status"); s.add_argument("--id",required=True); s.add_argument("--state",required=True); s.add_argument("--agent",required=True); s.set_defaults(func=cmd_status)
    s=sp.add_parser("log"); s.add_argument("--agent",required=True); s.add_argument("--workstream",required=True); s.add_argument("--state",default="IN_PROGRESS"); s.add_argument("--summary",required=True); s.add_argument("--files",default=""); s.add_argument("--test",default=""); s.add_argument("--blocker",default=""); s.add_argument("--next",default=""); s.set_defaults(func=cmd_log)
    s=sp.add_parser("message"); s.add_argument("--from-agent",required=True); s.add_argument("--to",required=True); s.add_argument("--type",required=True); s.add_argument("--subject",required=True); s.add_argument("--body",required=True); s.add_argument("--workstream"); s.add_argument("--requires-response",action="store_true"); s.set_defaults(func=cmd_message)
    s=sp.add_parser("release-authorize"); s.add_argument("--command",required=True); s.set_defaults(func=cmd_release_authorize)
    s=sp.add_parser("release-check"); s.set_defaults(func=cmd_release_check)
    return p

if __name__=="__main__":
    args=build_parser().parse_args()
    rc=args.func(args)
    sys.exit(rc if isinstance(rc,int) else 0)
