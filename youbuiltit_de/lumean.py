"""Lumean TTS client for the German voiceover (template: ElevenLabs, voice Lennard, fast, de).

The API key is read from the LUMEAN_API_KEY environment variable — never write it into a file in this repo.

  python lumean.py preview <script.txt>             # free: shows how the text is split into chunks
  python lumean.py order   <script.txt> <out_dir>   # paid: voices the text, waits, downloads mp3 + alignment
  python lumean.py resume  <out_dir>                # free: re-poll/download an order already placed (order_id file)
  python lumean.py template                         # free: create the Lennard template on YOUR Lumean account, prints its id
  python lumean.py voice <voice_id> <lang> <speed> <name>   # free: template for any ElevenLabs voice (e.g. Korean: ko), prints its id
  python lumean.py search <text> [provider]          # free: find voices in the library (e.g. search Taemin)
                                                    #       -> then export LUMEAN_TEMPLATE=<id> (the default id only exists on Nastya's account)
"""
import json, os, sys, time, urllib.request, urllib.error

BASE = "https://api.lumean.app/api/public"
TEMPLATE_ID = os.environ.get("LUMEAN_TEMPLATE", "01a19cd5-d1f0-72c5-b74f-09412a0f7369")   # "DE Wie es gebaut wird – Lennard schnell" (speed 1.15)

def key():
    k = os.environ.get("LUMEAN_API_KEY", "").strip()
    if not k: sys.exit("LUMEAN_API_KEY is not set (add it to the cloud environment's secrets / env vars)")
    return k

def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"X-API-KEY": key(), "Content-Type": "application/json", "Accept": "application/json"})
    for i in range(6):                       # the proxy sometimes resets the connection: retry
        try:
            with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read().decode())
        except (urllib.error.URLError, ConnectionError) as e:
            if i == 5: raise
            print("retry", e); time.sleep(2 ** i)

# Voice of the channel: ElevenLabs "Lennard - Warm & Trustworthy" (de, male), sped up to 1.15
LENNARD = {"tts_settings": {"model_id": "eleven_multilingual_v2", "voice_id": "HNYELfQMgCeL9N0RGyxo", "mode": "mode_v1",
           "voice_settings": {"use_speaker_boost": True, "speed": 1.15, "stability": 0.45, "similarity_boost": 0.8, "style": 0.2},
           "language_code": "de", "advanced_voice_settings": True, "prev_next_text": True},
           "output_settings": {"audio_format": "mp3", "audio_quality": "high", "sample_rate": 44100}}

def make_template():
    r = call("POST", "/templates", {"service_key": "elevenlabs", "name": "DE Wie es gebaut wird – Lennard schnell", "config": LENNARD})
    print("template id:", r["data"]["id"], "\n-> export LUMEAN_TEMPLATE=" + r["data"]["id"])

def make_voice_template(voice_id, lang, speed, name):
    cfg = json.loads(json.dumps(LENNARD)); ts = cfg["tts_settings"]
    ts["voice_id"] = voice_id; ts["language_code"] = lang; ts["voice_settings"]["speed"] = float(speed)
    r = call("POST", "/templates", {"service_key": "elevenlabs", "name": name, "config": cfg})
    print("template id:", r["data"]["id"], "\n-> export LUMEAN_TEMPLATE=" + r["data"]["id"])

def search(text, provider="elevenlabs"):
    import urllib.parse
    r = call("GET", "/voices?provider=" + provider + "&search=" + urllib.parse.quote(text))
    for v in r["data"].get("items", []): print(v["voice_id"], "|", v["name"], "|", v.get("language"), "|", (v.get("description") or "")[:90])

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

def order(p, out, oid=None):
    os.makedirs(out, exist_ok=True)
    if oid is None:
        name = os.path.basename(os.path.dirname(os.path.abspath(p)))
        o = call("POST", "/orders", {"template_id": TEMPLATE_ID, "input_text": read_script(p), "name": name})["data"]
        oid = o["id"]; open(f"{out}/order_id", "w").write(oid)
    print("order", oid)
    while True:
        d = call("GET", f"/orders/{oid}")["data"]; st = d["status"]; print("status", st)
        if st in ("completed", "partially_completed"): break
        if st in ("failed", "cancelled", "canceled"): sys.exit(json.dumps(d, ensure_ascii=False)[:2000])
        time.sleep(10)
    res = d["result"]
    for _ in range(24):        # subtitles/alignment can show up a few seconds after 'completed'
        if res.get("service_files"): break
        time.sleep(5); res = call("GET", f"/orders/{oid}")["data"]["result"]
    for path in res.get("files", []) + res.get("service_files", []):
        fn = path.rsplit("/", 1)[-1]; download(path, f"{out}/{fn}"); print("saved", fn)
    if st == "partially_completed": print("WARNING: some chunks failed — regenerate them (docs/lumean_api.md §7.11)")

if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "preview": preview(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == "order": order(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 3 and sys.argv[1] == "resume": order(None, sys.argv[2], open(f"{sys.argv[2]}/order_id").read().strip())
    elif len(sys.argv) >= 2 and sys.argv[1] == "template": make_template()
    elif len(sys.argv) >= 6 and sys.argv[1] == "voice": make_voice_template(*sys.argv[2:6])
    elif len(sys.argv) >= 3 and sys.argv[1] == "search": search(*sys.argv[2:4])
    else: print(__doc__)
