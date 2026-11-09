import json, sys, time, urllib.request
vid = sys.argv[1]; c = json.load(open('comments.json')); out = []
for x in c:
    if not x.get('replies'): continue
    cur = 0
    for page in range(40):
        url = f"https://www.tiktok.com/api/comment/list/reply/?aid=1988&item_id={vid}&comment_id={x['cid']}&count=50&cursor={cur}"
        d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30))
        cs = d.get("comments") or []
        for r in cs:
            u = r.get("user") or {}; imgs = []
            for im in (r.get("image_list") or []):
                for key in ("origin_url", "crop_url", "thumb_url"):
                    v = (im.get(key) or {}).get("url_list") or []
                    if v: imgs.append(v[0]); break
            out.append({"cid": r.get("cid"), "parent": x['cid'], "nick": u.get("nickname"), "uid": u.get("unique_id"), "text": r.get("text"), "likes": r.get("digg_count"), "images": imgs})
        if not d.get("has_more") or not cs: break
        cur = d.get("cursor", cur + len(cs)); time.sleep(.6)
    time.sleep(.4)
json.dump(out, open('replies.json', 'w'), ensure_ascii=False, indent=0)
print('replies fetched', len(out), 'with images', sum(1 for r in out if r['images']))
