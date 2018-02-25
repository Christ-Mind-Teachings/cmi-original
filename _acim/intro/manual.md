---
layout: introduction
title: "Manual for Teachers"
source: "ACIM Sparkly Edition"
surl: /acim/intro/acim/
book: Manual for Teachers
burl: /acim/intro/manual/
nav: nav/np-data.html
contents: nav/contents.html
bid: manual
---

### Table of Contents

{% assign crossref = false %}
{% capture workspace %}
  {% for page in site.data.acim.manual.page %}
    {% if forloop.first %}
      {% continue %}
    {% else %}
      {% assign link = page.title | prepend: "[" | append: "](" | append: page.url | append: ")" %}
      {% if page.nwffacim %}
        {% assign crossref = true %}
        {% capture rajref %}{% endcapture %}
        {% for ref in page.nwffacim %}
          {% if forloop.last %}
  {% capture rajref %}{{rajref}}[{{ref.title}}]({{ref.url}}){% endcapture %}
          {% else %}
  {% capture rajref %}{{rajref}}[{{ref.title}}]({{ref.url}})<br/>{% endcapture %}
          {% endif %}
        {% endfor %}
        {% assign link = link | append: ' | ' | append: rajref %}
      {% endif %}
{% capture toc %}{{toc}}
  {{forloop.index | minus: 1}} | {{link}}{% endcapture %}
    {% endif %}
  {% endfor %}
  {% if crossref == true %}
  {% capture toc %}
<div id="manual-contents" markdown="1" class="acim-toc">
Ref | Section | Raj Study<br/>Group Reference
--- | --- {{toc}}{% endcapture %}
</div>
  {% else %}
  {% capture toc %}
<div id="manual-contents" markdown="1" class="acim-toc">
Ref | Title
--- | --- | :---: {{toc}}{% endcapture %}
</div>
  {% endif %}
{% endcapture %}

{{toc | markdownify }}



