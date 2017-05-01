function bookId(book) {
  switch(book) {
    case "woh":
      bid = 1
      break
    case "wot":
      bid = 2
      break
    case "wok":
      bid = 3
      break
    default:
      bid = 0;
  }

  return bid
}

function unitId(unit) {
  switch(unit) {
    case "l01":
      uid = 1
      break
    case "l02":
      uid = 2
      break
    case "l03":
      uid = 3
      break
    case "l04":
      uid = 4
      break
    case "l05":
      uid = 5
      break
    case "l06":
      uid = 6
      break
    case "l07":
      uid = 7
      break
    case "l08":
      uid = 8
      break
    case "l09":
      uid = 9
      break
    case "l10":
      uid = 10
      break
    case "l11":
      uid = 11
      break
    case "l12":
      uid = 12
      break
    default:
      uid = 0;
  }

  return uid
}

BEGIN {
  i = 0
  p = 0
  l = -1
  omit = 0
  fm = 0
  inp = false
  needComma = "n"

  printf "{\n  \"source\": \"%s\",\n  \"book\": \"%s\",\n  \"unit\": \"%s\",\n", source, book, unit
  printf "  \"paragraph\": [\n"
}
/---/ {
  if (fm == 0) {
    fm = 1
  }
  else if (fm == 1) {
    fm = 2
  }
  next
}
/Track/ {
  getline tmp
  next
}
$1 ~ /##/ {
  # questions
  next
}
# a markdown class designation
/^{:/ {
  omit = 1
  next
}
/^$/ || /^>$/ || /^>\s*$/ {

  # discard paragraphs when omit is true
  if (omit == 1) {
    l = -1
    text = ""
    delete lines
    p++
    omit = 0
    next
  }

  if (l > -1) {
    len = length(lines)
    printf "  %s{\n", needComma == "y" ? "," : ""
    printf "    \"source\": \"%s\",\n", source
    printf "    \"book\": \"%s\",\n", book
    printf "    \"bid\": %s,\n", bookId(book)
    printf "    \"unit\": \"%s\",\n", unit
    printf "    \"uid\": %s,\n", unitId(unit)
    printf "    \"pid\": %s,\n", p
    for (line in lines) {
      raw = lines[line]
      # remove <p></p> 
      gsub(/<\/?p[^>]*>/,"",raw)
      # remove <span></span> 
      gsub(/<\/?span[^>]*>/,"",raw)
      # remove punctuation
      gsub(/[\[\])(*>.,!?;:’'"“”/\\]/,"",raw)
      #remove 0xa0
      gsub(/ /,"",raw)
      # convert dash to space 
      gsub(/[-—]/," ",raw)
      text = sprintf("%s %s", text, raw)
    }
    # remove leading space
    gsub(/^ */, "", text)
    # collapse two spaces into one
    gsub(/  */," ",text)
    # remove underscores - text bracketed by __xxx__ are bolded by markdown
    gsub(/__/,"",text)
    printf "    \"text\": \"%s\"\n  }\n", tolower(text)
    l = -1
    text = ""
    delete lines
    needComma = "y"
    p++
  }
  next
}
{
  # only interested in lines after front matter (fm) removed
  # - that's when fm=2
  if (fm == 2) {
    l++
    lines[l] = $0
  }
}
END {
  printf "]}\n"
}

