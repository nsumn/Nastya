"""Face boxes for the photo-news auto-framing → assets/news/big/faces.json  {key: {w, h, faces: [[x, y, fw, fh], …]}} (pixels, biggest first).
Haar frontal face (OpenCV, bundled) + profile fallback. Run after tools/plug_photo.py:  python3 tools/plug_faces.py [keys…]   (no keys = every photo)"""
import sys, os, json, glob, cv2
D = 'assets/news/big'; out = json.load(open(f'{D}/faces.json')) if os.path.exists(f'{D}/faces.json') else {}
keys = sys.argv[1:] or [os.path.basename(f)[:-4] for f in sorted(glob.glob(f'{D}/*.jpg'))]
fr = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'); pr = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
for k in keys:
    im = cv2.imread(f'{D}/{k}.jpg'); h, w = im.shape[:2]; g = cv2.equalizeHist(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)); mn = int(min(w, h) * 0.08)
    f = list(fr.detectMultiScale(g, 1.08, 6, minSize=(mn, mn))) or list(pr.detectMultiScale(g, 1.08, 5, minSize=(mn, mn))) or [[w - x - fw, y, fw, fh] for x, y, fw, fh in pr.detectMultiScale(cv2.flip(g, 1), 1.08, 5, minSize=(mn, mn))]
    f = sorted([[int(v) for v in b] for b in f], key=lambda b: -b[2] * b[3])
    f = [b for b in f if b[2] * b[3] >= 0.25 * f[0][2] * f[0][3]][:3] if f else []   # drop tiny false hits
    out[k] = {'w': w, 'h': h, 'faces': f}; print(k, w, h, f)
json.dump(out, open(f'{D}/faces.json', 'w'))
