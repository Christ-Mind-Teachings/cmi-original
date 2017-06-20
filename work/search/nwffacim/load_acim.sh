#!/bin/bash

if [ "$1" == "" ]; then
  echo "enter endpoint, either 'local' or 'remote'"
  exit 1
fi

if [ "$1" == "remote" ]; then
  db="remote"
else
  db="local"
fi

# ./prep_all.sh

date > acim.log

for i in `cat acim.txt`; do
# cat ${i}.txt | xargs ./load -t nwffacim -e $db > ${i}.log
echo $i
echo $i >> acim.log
echo "------------" >> acim.log
./load -t nwffacim -e $db $i >> acim.log 2>&1
sleep 1
done

