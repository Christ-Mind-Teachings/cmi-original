rm *.json

for i in `cat contents`; do
  prep -s wom -b wos $i
done
