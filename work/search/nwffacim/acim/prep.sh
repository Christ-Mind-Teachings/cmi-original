rm *.json

for i in `cat contents`; do
book=${i:0:4}
unit=${i:5}
#echo "i=$i, book=$book, unit=$unit"
prep -s nwffacim -b $book $unit
done
