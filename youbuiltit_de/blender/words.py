# Word timings for a video, with the same T('Wort', n) meaning as the three.js engine:
# the start of the n-th word that begins with Wort.
#
# Until the voice is ordered there is no words.json, so the timings are estimated from
# script_de.txt at a fixed pace. The scene code does not change when the real file arrives:
# T() keeps its meaning, only the numbers get exact. estimated() says which mode we are in.
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
RATE = 3.9                      # words per second, the pace of the original account


class Words:
    def __init__(self, folder, rate=RATE):
        self.folder = folder
        base = os.path.join(HERE, '..', folder)
        wj = os.path.join(base, 'words.json')
        if os.path.exists(wj):
            with open(wj, encoding='utf-8') as f:
                self.words = [tuple(x) for x in json.load(f)]
            self._estimated = False
        else:
            txt = open(os.path.join(base, 'script_de.txt'), encoding='utf-8').read()
            self.words = [(w, i / rate, (i + 1) / rate) for i, w in enumerate(txt.split())]
            self._estimated = True

    def estimated(self):
        return self._estimated

    @staticmethod
    def _clean(w):
        return re.sub(r'[.,!?:;]', '', w)

    def T(self, word, n=1):
        k = 0
        for w, s, _e in self.words:
            if self._clean(w).startswith(word):
                k += 1
                if k == n:
                    return s
        raise KeyError('word not found: %s #%d' % (word, n))

    def count(self, word):
        return sum(1 for w, _s, _e in self.words if self._clean(w).startswith(word))

    def end(self):
        return self.words[-1][2] + 0.7
