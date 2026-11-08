"""Find a portrait on Wikimedia Commons, print its license/author, download a 600 px version into assets/news/photos/<key>.jpg (git-ignored).
Usage: python3 tools/commons_photo.py <key> "<search words>" """
import sys, json, urllib.request, urllib.parse
key, q = sys.argv[1], sys.argv[2]; UA = {'User-Agent': 'earthstop-video-tool/1.0 (educational TikTok explainer)'}
import time
def get(url):
    for k in range(6):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(5 * 2 ** k)
    raise SystemExit('rate limited')
def api(**p): p.update(format='json'); time.sleep(1.5); return json.loads(get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(p)))
hits = api(action='query', list='search', srnamespace=6, srsearch=q, srlimit=6)['query']['search']
for h in hits:
    t = h['title']; ii = api(action='query', titles=t, prop='imageinfo', iiprop='url|extmetadata|mime', iiurlwidth=600)['query']['pages']; ii = list(ii.values())[0]['imageinfo'][0]
    if not ii['mime'].startswith('image/jpeg') and not ii['mime'].startswith('image/png'): continue
    m = ii['extmetadata']; lic = m.get('LicenseShortName', {}).get('value', '?'); art = m.get('Artist', {}).get('value', '?')
    print(t, '|', lic, '|', art[:120].replace('\n', ' '))
    urllib.request.urlretrieve if False else None
    open(f'assets/news/photos/{key}.jpg', 'wb').write(get(ii['thumburl'])); print('saved', key, ii['descriptionurl']); break
