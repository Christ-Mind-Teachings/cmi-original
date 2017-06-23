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

date > fixlist.log

for i in `cat fixlist.txt`; do
# cat ${i}.txt | xargs ./load -t nwffacim -e $db > ${i}.log
echo $i
echo $i >> fixlist.log
echo "------------" >> fixlist.log
./load -t nwffacim -e $db $i >> fixlist.log 2>&1
sleep 1
done

