#!/bin/bash

./prep_all.sh >> load_all.log

for i in woh wot wok; do
cat ${i}.txt | xargs ./load -t wom >> load_all.log
done
