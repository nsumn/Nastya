"""Lumean TTS client for the German voiceover (template: ElevenLabs, voice Ole Carpenter, de).

The API key is read from the LUMEAN_API_KEY environment variable — never write it into a file in this repo.

  python lumean.py preview <script.txt>             # free: shows how the text is split into chunks
  python lumean.py order   <script.txt> <out_dir>   # paid: voices the text, waits, downloads mp3 + alignment
"""
import json, os, sys, time, urllib.request

BASE = "https://api.lumean.app/api/public"
TEMPLATE_ID = "01a17ece-0c35-72f4-97b3-ddf4b7288d29"   # "DE Beziehungspsychologie – Ole Carpenter"

def key():
    k = os.environ.get("LUMEAN_API_KEY", "").strip()
    if not k: sys.exit("LUMEAN_API_KEY is not set (add it to the cloud environment's secrets / env vars)")
    return k

def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"X-API-KEY": key(), "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read().decode())

def read_script(p):
    t = open(p, encoding="utf-8").read().strip()
    if any(q in t for q in "„“”\""): sys.exit("remove quotation marks from the script first — the voice mumbles on them")
    return t

def preview(p):
    r = call("POST", "/orders/chunks/preview", {"template_id": TEMPLATE_ID, "input_text": read_script(p)})
    print(json.dumps(r, ensure_ascii=False, indent=1)[:4000])

def download(path, dst):
    url = call("POST", "/storage/url", {"path": path})["data"]["url"]
    urllib.request.urlretrieve(url, dst)

def order(p, out):
    os.makedirs(out, exist_ok=True)
    name = os.path.basename(os.path.dirname(os.path.abspath(p)))
    o = call("POST", "/orders", {"template_id": TEMPLATE_ID, "input_text": read_script(p), "name": name})["data"]
    oid = o["id"]; open(f"{out}/order_id", "w").write(oid); print("order", oid)
    while True:
        d = call("GET", f"/orders/{oid}")["data"]; st = d["status"]; print("status", st)
        if st in ("completed", "partially_completed"): break
        if st in ("failed", "cancelled", "canceled"): sys.exit(json.dumps(d, ensure_ascii=False)[:2000])
        time.sleep(10)
    res = d["result"]
    for _ in range(12):        # subtitles/alignment can show up a few seconds after 'completed'
        if res.get("service_files"): break
        time.sleep(5); res = call("GET", f"/orders/{oid}")["data"]["result"]
    for path in res.get("files", []) + res.get("service_files", []):
        fn = path.rsplit("/", 1)[-1]; download(path, f"{out}/{fn}"); print("saved", fn)
    if st == "partially_completed": print("WARNING: some chunks failed — regenerate them (docs/lumean_api.md §7.11)")

if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "preview": preview(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == "order": order(sys.argv[2], sys.argv[3])
    else: print(__doc__)
