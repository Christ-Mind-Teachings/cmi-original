#
# if we find the regex then we keep the one line paragraph
# - indicated this by returning 0
#
# return 1 if we want to discard the paragraph
#
function discardParagraph(p) {
  if (n = match(p,/[Yy]es/) > 0) {
    return 1
  }
  if (n = match(p,/^[Aa]men/) > 0) {
    return 1
  }
  if (n = match(p,/[Nn]ow.*we.*begin\.$/) > 0) {
    return 1
  }
  if (n = match(p,/^[Nn]o$/) > 0) {
    return 1
  }
  if (n = match(p,/[Mm]m/) > 0) {
    return 1
  }
  if (n = match(p,/[Th]ank you/) > 0) {
    return 1
  }
  if (n = match(p,/[Ii]ndeed/) > 0) {
    return 1
  }
  if (n = match(p,/[Nn]o.*questions/) > 0) {
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
  if ((n = match(p,/[Yy]es it does/)) > 0) {
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
    case "questions":
      bid = 7
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
      uid = 1
      break
    case "c2s":
      uid = 2
      break
    case "com":
      uid = 3
      break
    case "dbc":
      uid = 4
      break
    case "dth":
      uid = 5
      break
    case "fem":
      uid = 6
      break
    case "gar":
      uid = 7
      break
    case "hea":
      uid = 8
      break
    case "hoe":
      uid = 9
      break
    case "hoi":
      uid = 10
      break
    case "hsp":
      uid = 11
      break
    case "ign":
      uid = 12
      break
    case "joy1":
      uid = 13
      break
    case "joy2":
      uid = 14
      break
    case "moa":
      uid = 15
      break
    case "mot":
      uid = 16
      break
    case "wak":
      uid = 17
      break
    case "wlk":
      uid = 18
      break
    default:
      if (length(unit) > 3) {
        uid = u[unit]
      }
      else {
        uid = 0;
      }
  }

  return uid
}

BEGIN {
  # unit's for questions
  u["bleq1"] = 1; u["bleq2"] = 2; u["bleq3"] = 3; u["bleq4"] = 4; u["c2sq1"] = 5;
  u["c2sq2"] = 6; u["c2sq3"] = 7; u["c2sq4"] = 8; u["c2sq5"] = 9; u["comq1"] = 10;
  u["dthq1"] = 11; u["dthq10"] = 12; u["dthq2"] = 13; u["dthq3"] = 14; u["dthq4"] = 15;
  u["dthq5"] = 16; u["dthq6"] = 17; u["dthq7"] = 18; u["dthq8"] = 19; u["dthq9"] = 20;
  u["h01q1"] = 21; u["h01q2"] = 22; u["h01q3"] = 23; u["h02q1"] = 24; u["h02q2"] = 25;
  u["h06q1"] = 26; u["h06q2"] = 27; u["h06q3"] = 28; u["h07q1"] = 29; u["h07q2"] = 30;
  u["h07q3"] = 31; u["h07q4"] = 32; u["h07q5"] = 33; u["h08q1"] = 34; u["h08q2"] = 35;
  u["h09q1"] = 36; u["h10q1"] = 37; u["h10q2"] = 38; u["h10q3"] = 39; u["h11q1"] = 40;
  u["h11q2"] = 41; u["h11q3"] = 42; u["h12q1"] = 43; u["h12q2"] = 44; u["h12q3"] = 45;
  u["hoeq1"] = 46; u["hoeq2"] = 47; u["hoeq3"] = 48; u["hoeq4"] = 49; u["k02q1"] = 50;
  u["k02q2"] = 51; u["k03q1"] = 52; u["k03q2"] = 53; u["k04q1"] = 54; u["k04q2"] = 55;
  u["k06q1"] = 56; u["k06q2"] = 57; u["k10q1"] = 58; u["k10q2"] = 59; u["t01q1"] = 60;
  u["t01q2"] = 61; u["t06q1"] = 62; u["t06q2"] = 63; u["t07q1"] = 64; u["t09q1"] = 65;
  u["t09q2"] = 66; u["t09q3"] = 67; u["t09q4"] = 68; u["t11q1"] = 69; u["t11q2"] = 70;
  u["t11q3"] = 71
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
      # remove <br/> 
      gsub(/<br\/>/,"",raw)
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

