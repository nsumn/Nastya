"""Big photo for the 'last 24 hours' photo-news format → assets/news/big/<key>.jpg (1280 px, git-ignored with assets/news).
Usage: python3 tools/plug_photo.py <key> <Wikipedia_Title | File:Commons_name.jpg>
Prints the Commons file name + license (US federal works = public domain; CC BY / BY-SA → credit line in the TikTok description)."""
import sys, json, io, os, re, urllib.request, urllib.parse
from PIL import Image
key, title = sys.argv[1], sys.argv[2]; UA = {'User-Agent': 'earthstop-video-tool/1.0 (educational news explainer)'}
import time
def get(u):
    for k in range(6):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 5: raise
            time.sleep(10 * (k + 1))
if title.startswith('File:'): fn = title[5:]
elif title.startswith('search:'):   # first JPEG of a Commons search
    r = json.loads(get('https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=20&srsearch=' + urllib.parse.quote(title[7:])))
    fn = next(x['title'][5:] for x in r['query']['search'] if x['title'].lower().endswith(('.jpg', '.jpeg')))
else: d = json.loads(get('https://en.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(title))); fn = urllib.parse.unquote(d['originalimage']['source'].split('?')[0].rsplit('/', 1)[1])
q = json.loads(get('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280&titles=' + urllib.parse.quote('File:' + fn)))
ii = list(q['query']['pages'].values())[0]['imageinfo'][0]; md = ii.get('extmetadata', {})
lic = md.get('LicenseShortName', {}).get('value', '?'); art = re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', '?'))[:80]
url = ii.get('thumburl') or ii['url']; os.makedirs('assets/news/big', exist_ok=True)
im = Image.open(io.BytesIO(get(url))).convert('RGB'); im.save(f'assets/news/big/{key}.jpg', quality=90)
print(f'{key}\t{im.width}x{im.height}\t{lic}\t{art}\t{fn}')
