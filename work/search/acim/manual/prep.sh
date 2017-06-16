rm *.json

for i in `cat contents`; do
  prep -s acim -b manual $i
done
