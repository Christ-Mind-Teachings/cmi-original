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
date > text.log

# for i in text manual workbook; do
for i in `cat text.txt`; do
# cat ${i}.txt | xargs ./load -t acim -e $db > ${i}.log
echo $i
echo $i >> text.log
echo "------------" >> text.log
./load -t acim -e $db $i >> text.log 2>&1
sleep 1
done

