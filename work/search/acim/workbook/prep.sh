rm *.json

for i in `cat contents`; do
  prep -s acim -b workbook $i
done
