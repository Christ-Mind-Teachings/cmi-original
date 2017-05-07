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

cat que.txt | xargs ./load -t wom -e $db > que.log

