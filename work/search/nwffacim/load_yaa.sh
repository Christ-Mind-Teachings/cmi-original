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

date > yaa.log

for i in `cat yaa.txt`; do
# cat ${i}.txt | xargs ./load -t nwffacim -e $db > ${i}.log
echo $i
echo $i >> yaa.log
echo "------------" >> yaa.log
./load -t nwffacim -e $db $i >> yaa.log 2>&1
sleep 1
done

