"""Lead photo of a Wikipedia article → assets/news/photos/<key>.jpg (600 px wide, git-ignored). Fallback when the Commons search API rate-limits.
Prints the Commons file name; check its license before posting (US federal portraits = public domain; CC BY / BY-SA need a credit line).
Usage: python3 tools/wiki_photo.py <key> <Wikipedia_Title>"""
import sys, json, io, urllib.request, urllib.parse
from PIL import Image
key, title = sys.argv[1], sys.argv[2]; UA = {'User-Agent': 'earthstop-video-tool/1.0 (educational TikTok explainer)'}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
d = json.loads(get('https://en.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(title)))
import re; th = d['thumbnail']['source'].split('?')[0]; src = re.sub(r'/\d+px-', '/500px-', th) if '/thumb/' in th else th   # standard thumbnail size (Wikimedia asks for these)
print(key, urllib.parse.unquote(d['originalimage']['source'].split('?')[0].rsplit('/', 1)[1]))
im = Image.open(io.BytesIO(get(src))).convert('RGB'); im.thumbnail((600, 900)) if im.width > 600 else None; im.save(f'assets/news/photos/{key}.jpg', quality=90)
