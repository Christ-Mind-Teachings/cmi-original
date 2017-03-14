#!/bin/bash

./prep_all.sh

for i in woh wot wok; do
cat ${i}.txt | xargs ./load -t wom > ${i}.log
done
