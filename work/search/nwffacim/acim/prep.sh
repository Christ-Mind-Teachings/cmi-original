
list="contents"

if [ "$1" != "" ]; then
  list=$1
else
  rm *.json
fi

for i in `cat $list`; do
book=${i:0:4}
unit=${i:5}
#echo "list=$list, i=$i, book=$book, unit=$unit"
prep -s nwffacim -b $book $unit
done

