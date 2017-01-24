---
layout: page
permalink: /wom/
title: Way of Mastery
source: Way of Mastery
surl: /wom/
publish: true
---

<div class="introduction">
  Hello, this is the home page for the Way of Mastery teachings.
  <hr>

  <div class="toc">
    <h2>These are the books that comprise the {{ page.title }}</h2>
    <ol class="post">
    {% for book in site.data.wom.contents.books %}
      <li class="post-title">
        <a href="{{ site.baseurl }}{{ book.url }}">
          {{ book.title }}
        </a>
      </li>
    {% endfor %}
    </ol>
  </div>
</div>





