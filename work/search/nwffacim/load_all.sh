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

for i in 2002 yaa grad; do
cat ${i}.txt | xargs ./load -t nwffacim -e $db > ${i}.log
done
