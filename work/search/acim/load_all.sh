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

# for i in text manual workbook; do
for i in workbook; do
# cat ${i}.txt | xargs ./load -t acim -e $db > ${i}.log
echo $i
done

