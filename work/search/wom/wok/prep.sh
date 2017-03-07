rm *.json

for i in `cat contents`; do
  prep -s wom -b wok $i
done
