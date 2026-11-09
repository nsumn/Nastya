import json, sys, time, urllib.request
vid, out = sys.argv[1], sys.argv[2]
allc, cur = [], 0
for page in range(80):
    url = f"https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id={vid}&count=50&cursor={cur}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    d = json.load(urllib.request.urlopen(req, timeout=30))
    cs = d.get("comments") or []
    for c in cs:
        u = c.get("user") or {}
        imgs = []
        for im in (c.get("image_list") or []):
            for key in ("origin_url", "crop_url", "thumb_url"):
                v = (im.get(key) or {}).get("url_list") or []
                if v: imgs.append(v[0]); break
        allc.append({"cid": c.get("cid"), "nick": u.get("nickname"), "uid": u.get("unique_id"), "text": c.get("text"), "likes": c.get("digg_count"), "replies": c.get("reply_comment_total"), "images": imgs})
    print(page, len(cs), len(allc), d.get("has_more"), file=sys.stderr)
    if not d.get("has_more") or not cs: break
    cur = d.get("cursor", cur + len(cs)); time.sleep(1.0)
json.dump(allc, open(out, "w"), ensure_ascii=False, indent=0)
