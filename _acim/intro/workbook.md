---
layout: introduction
title: "Workbook for Students"
source: "ACIM Sparkly Edition"
surl: /acim/intro/acim/
book: Workbook for Students
burl: /acim/intro/workbook/
nav: nav/np-data.html
contents: nav/workbook.html
bid: workbook
---

### {{site.data.acim.wbcontents.title}}

{% for part in site.data.acim.wbcontents.part %}
  {% for section in part.section %}
    {% assign title = section.title %}
    {% assign base = section.base %}
    {% assign row = "" %}
    {% capture toc %}{% endcapture %}
    {% for page in section.page %}
      {% assign lesson = "" %}
      {% assign link = page.title | prepend: "[" | append: "](" | append: base | append: page.url | append: ")" %}
      {% if page.lesson %}
        {% assign lesson = "Lesson " | append: page.lesson %}
      {% endif %}
      {% assign row = lesson | append: " | " | append: link %}
{% capture toc %}{{toc}}
{{row}}{% endcapture %}
    {% endfor %}
  {% capture table %}
<div id="{{section.ref}}" markdown="1" class="acim-toc">
### <i class="fa fa-search"></i> {{title}}

Lesson | Title
--- | --- {{toc}}

</div>
{% endcapture %}

{{table | markdownify }}

  {% endfor %}

{% endfor %}

