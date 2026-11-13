#!/bin/bash
# photo-news: splice an intro variant (out/<n>/in<V>, 0 → story 1) onto the main frames (out/<n>/scene) + the hand-over fix frames (out/<n>/fix), add the mix, encode 60 fps.
# Usage (from earthstop/): bash tools/plug_assemble.sh <name> <V>   (V = A|B map intros get the transparent overlay out/<n>/inO on top)
set -e; N=$1; V=$2; D=out/$N; I=$(ls $D/in$V | wc -l); F=$(ls $D/fix | wc -l)
rm -rf $D/fin; mkdir -p $D/fin; k=0
for f in $(ls $D/in$V | sort); do ln -s ../in$V/$f $D/fin/i_$(printf %05d $k).${f##*.}; k=$((k+1)); done
k=$I; for f in $(ls $D/fix | sort); do ln -s ../fix/$f $D/fin/m_$(printf %05d $k).jpg; k=$((k+1)); done
TOT=$(ls $D/scene | wc -l); for ((j=I+F; j<TOT; j++)); do ln -s ../scene/f_$(printf %05d $j).jpg $D/fin/m_$(printf %05d $j).jpg; done
EXT=$(ls $D/in$V | head -1); EXT=${EXT##*.}
if [ $V = A ] || [ $V = B ]; then
  ffmpeg -v error -y -framerate 60 -i $D/fin/i_%05d.$EXT -framerate 60 -i $D/inO/f_%05d.png -filter_complex "[0][1]overlay=format=auto,format=yuv420p" -c:v libx264 -crf 14 -preset fast $D/intro_$V.mp4
else ffmpeg -v error -y -framerate 60 -i $D/fin/i_%05d.$EXT -vf format=yuv420p -c:v libx264 -crf 14 -preset fast $D/intro_$V.mp4; fi
[ -f $D/main_tmp.mp4 ] || ffmpeg -v error -y -framerate 60 -start_number $I -i $D/fin/m_%05d.jpg -vf format=yuv420p -c:v libx264 -crf 14 -preset fast $D/main_tmp.mp4   # same for every intro (rm it after a re-render)
ffmpeg -v error -y -i $D/intro_$V.mp4 -i $D/main_tmp.mp4 -i $D/mix.wav -filter_complex "[0:v][1:v]concat=n=2:v=1[v]" -map "[v]" -map 2:a -c:v libx264 -preset slow -b:v 5000k -maxrate 7000k -bufsize 10000k -pix_fmt yuv420p -r 60 -c:a aac -b:a 160k -shortest -movflags +faststart $D/${N}_$V.mp4
echo "done $D/${N}_$V.mp4"; ffprobe -v error -show_entries format=duration,size -of csv=p=0 $D/${N}_$V.mp4
