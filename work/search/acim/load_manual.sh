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
date > manual.log

# for i in text manual workbook; do
for i in `cat manual.txt`; do
# cat ${i}.txt | xargs ./load -t acim -e $db > ${i}.log
echo $i
echo $i >> manual.log
echo "------------" >> manual.log
./load -t acim -e $db $i >> manual.log 2>&1
sleep 1
done

