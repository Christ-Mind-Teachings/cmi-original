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

for i in woh wot wok tjl wos early que; do
cat ${i}.txt | xargs ./load -t wom -e $db > ${i}.log
done

