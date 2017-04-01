#!/bin/bash

# load all wom into dynamodb
for i in yaa grad 2002; do
  cd $i
  ./prep.sh > ../${i}prep.log
  cd ..
done
