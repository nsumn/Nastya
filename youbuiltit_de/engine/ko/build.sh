#!/bin/bash
# ko/build.sh <name>: engine/ko/<name>.js (first line: const DIR = '...';) -> engine/<name>_main.js
cd "$(dirname "$0")"
(cat imports.js; head -1 $1.js; cat head.js people.js label.js; tail -n +2 $1.js; cat tail.js) > ../$1_main.js
[ -f ../index_$1.html ] || sed "s/pocha.js/$1.js/" ../index_pocha.html > ../index_$1.html
grep -qx "$1.js" ../.gitignore || echo "$1.js" >> ../.gitignore
