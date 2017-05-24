#
# if we find the regex then we keep the one line paragraph
# - indicated this by returning 0
# return 1 if we want to discard the paragraph
#
function discardParagraph(p) {
  return 0
}

function bookId(book) {
  switch(book) {
    case "text":
      bid = 1
      break
    default:
      bid = 0;
  }

  return bid
}

function unitId(book, unit) {
  switch(book) {
    case "text":
      chap = substr(unit, 1, 2)
      sec = substr(unit, 10, 2)
      uid = chap * 100 + sec
      break
    default:
      uid = -1
      break
  }

  return uid
}

BEGIN {
  i = 0
  p = 0
  l = -1
  fm = 0
  inp = false
  needComma = "n"

  if (debug == 0) {
    printf "{\n  \"source\": \"%s\",\n  \"book\": \"%s\",\n  \"unit\": \"%s\",\n", source, book, unit
    printf "  \"paragraph\": [\n"
  }
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
$1 ~ /##/ {
  # questions
  next
}
/^<div/ || /^<\/div/ {
  # found in acim study group transcripts
  next
}
/^\[\^/ {
  # a footnote reference
  next
}
/^$/ || /^>$/ || /^>\s*$/ {
  if (debug == 1) {
    for (line in lines) {
      text = sprintf("%s %s", text, lines[line])
    }
    printf "%s\n\n", tolower(text)
    l = -1
    text = ""
    delete lines
    p++
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
    printf "    \"uid\": %s,\n", unitId(book, unit)
    printf "    \"pid\": %s,\n", p
    for (line in lines) {
      raw = lines[line]
      # remove html elements
      gsub(/\&hellip;/, "", raw)
      gsub(/\&ldquo;/, "", raw)
      gsub(/\&rdquo;/, "", raw)
      gsub(/\&lsquo;/, "", raw)
      gsub(/\&rsquo;/, "", raw)
      # remove <br/>
      gsub(/<br\/>/,"",raw)
      # remove <p></p> 
      gsub(/<\/?p[^>]*>/,"",raw)
      # remove <span></span> 
      gsub(/<\/?span[^>]*>/,"",raw)
      # remove punctuation
      gsub(/[\[\])(*>.,!?;:‘’'"“”/\\]/,"",raw)
      #remove 0xa0
      gsub(/ /,"",raw)
      # convert dash to space 
      gsub(/[-—–]/," ",raw)
      # remove footnotes: [^1]
      gsub(/\^[[:digit:]]/, "", raw)
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
  if (debug == 0) {
    printf "]}\n"
  }
}

