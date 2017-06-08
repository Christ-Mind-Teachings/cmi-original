---
layout: introduction
title: "Workbook for Students"
source: "ACIM Sparkly Edition"
surl: /acim/intro/acim/
book: Workbook for Students
burl: /acim/intro/workbook/
nav: nav/np-data.html
contents: nav/contents.html
bid: workbook
---

### Table of Contents

{% capture workspace %}
  {% for page in site.data.acim.manual.page %}
    {% if forloop.first %}
      {% continue %}
    {% else %}
      {% assign link = page.title | prepend: "[" | append: "](" | append: page.url | append: ")" %}
{% capture toc %}{{toc}}
  {{forloop.index | minus: 1}} | {{link}}{% endcapture %}
    {% endif %}
  {% endfor %}
  {% capture toc %}
<div id="manual-contents" markdown="1" class="acim-toc">
Ref | Title
--- | --- {{toc}}{% endcapture %}
</div>
{% endcapture %}

{{toc | markdownify }}



