#!/bin/bash

# load all wom into dynamodb
for i in woh wot wok; do
  cd $i
  ./prep.sh
  cd ..
done
