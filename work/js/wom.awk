#
# if we find the regex then we keep the one line paragraph
# - indicated this by returning 0
#
# return 1 if we want to discard the paragraph
#
function discardParagraph(p) {
  if (n = match(p,/^[Aa]men/) > 0) {
    return 1
  }
  if (n = match(p,/[Nn]ow.*we.*begin\.$/) > 0) {
    return 1
  }
  if (n = match(p,/^no$/) > 0) {
    return 1
  }
  if (n = match(p,/[Aa]udience/) > 0) {
    return 1
  }
  if (n = match(p,/how.*you.*doing/) > 0) {
    return 1
  }
  # one line paragraph contain the word 'laughter'
  if ((n = match(p,/[Ll]aughter/)) > 0) {
    return 1
  }

  return 0
}
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
    case "early":
      bid = 6
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
    case "ble":
      uid =1
      break
    case "c2s":
      uid =2
      break
    case "com":
      uid =3
      break
    case "dbc":
      uid =4
      break
    case "dth":
      uid =5
      break
    case "fem":
      uid =6
      break
    case "gar":
      uid =7
      break
    case "hea":
      uid =8
      break
    case "hoe":
      uid =9
      break
    case "hoi":
      uid =10
      break
    case "hsp":
      uid =11
      break
    case "ign":
      uid =12
      break
    case "joy1":
      uid =13
      break
    case "joy2":
      uid =14
      break
    case "moa":
      uid =15
      break
    case "mot":
      uid =16
      break
    case "wak":
      uid =17
      break
    case "wlk":
      uid =18
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
    discard = 0
    if (len == 1) {
      #found = discardParagraph(lines[0])
      #if (found > 0) {
      #  discard = 1
      #}

      # don't index one line paragraphs - most are banter
      # discardParagraph determines if a one liner is kept
      discard = discardParagraph(lines[0])
    }
    printf "  %s{\n", needComma == "y" ? "," : ""
    printf "    \"discard\": %u,\n", discard
    printf "    \"source\": \"%s\",\n", source
    printf "    \"book\": \"%s\",\n", book
    printf "    \"bid\": %s,\n", bookId(book)
    printf "    \"unit\": \"%s\",\n", unit
    printf "    \"uid\": %s,\n", unitId(unit)
    printf "    \"pid\": %s,\n", p
    for (line in lines) {
      raw = lines[line]
      # remove html elements
      gsub(/\&hellip;/, "", raw)
      gsub(/ \&ndash; /, "", raw)
      gsub(/\&ndash;/, " ", raw)
      gsub(/ \&mdash; /, "", raw)
      gsub(/\&mdash;/, " ", raw)
      gsub(/\&ldquo;/, "", raw)
      gsub(/\&rdquo;/, "", raw)
      gsub(/\&lsquo;/, "", raw)
      gsub(/\&rsquo;/, "", raw)
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
    # remove \%u200a
    gsub(/ /, "", text)
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

