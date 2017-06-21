---
layout: introduction
title: "Sparkly Edition Text"
source: "ACIM Sparkly Edition"
surl: /acim/intro/acim/
book: Text
burl: /acim/intro/text/
nav: nav/np-data.html
contents: nav/contents.html
bid: atext
---

### {{site.data.acim.textcontents.title}}

{% for chapter in site.data.acim.textcontents.chapter %}
  {% assign base = chapter.base %}
  {% assign title = chapter.title %}
  {% assign crossref = false %}
{% capture workspace %}
  {% capture toc %}{% endcapture %}
  {% for section in chapter.section %}
    {% assign ref = section.ref | prepend: "[" | append: "](" | append: base | append: section.url | append: ")" %}
    {% assign row = ref | append: ' | ' | append: section.title %}
    {% if section.nwffacim %}
      {% assign crossref = true %}
      {% capture rajref %}{% endcapture %}
      {% for ref in section.nwffacim %}
        {% if forloop.last %}
{% capture rajref %}{{rajref}}[{{ref.title}}]({{ref.url}}){% endcapture %}
        {% else %}
{% capture rajref %}{{rajref}}[{{ref.title}}]({{ref.url}})<br/>{% endcapture %}
        {% endif %}
      {% endfor %}
      {% assign row = row | append: ' | ' | append: rajref %}
    {% endif %}
{% capture toc %}{{toc}}
{{row}}{% endcapture %}
  {% endfor %}
  {% if crossref == true %}
  {% capture toc %}
<div id="{{chapter.ref}}" markdown="1" class="acim-toc">
### <i class="fa fa-search"></i> Chapter {{chapter.id}}: {{title}}

Ref | Section | Raj Study<br/>Group Reference
--- | --- | :---: {{toc}}{% endcapture %}
</div>
{% else %}
  {% capture toc %}
<div id="{{chapter.ref}}" markdown="1" class="acim-toc">
### <i class="fa fa-search"></i> Chapter {{chapter.id}}: {{title}}

Ref | Section
--- | --- {{toc}}{% endcapture %}
</div>
{% endif %}
{% endcapture %}{% assign workspace = "" %}

{{toc | markdownify }}
{% endfor %}



