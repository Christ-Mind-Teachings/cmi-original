---
layout: custom
load-custom: true
load-fa: true
title: Introduction
source: Way of Mastery
surl: /wom/intro/wom/
book: Questions
burl: /wom/intro/questions/
nav: nav/np-data.html
contents: nav/contents.html
bid: "questions"
tabs: true
fa: true
---

  <div class="custom-side-image">
    {% include ui/side-image.html %}
  </div>

  <div class="question-tabs">
    <ul class="accordion-tabs">
      <li class="tab-header-and-content">
        <a href="javascript:void(0)" class="is-active tab-link">The Early
        Years</a>
        <div class="tab-content">
          {% include ui/description-list.html class="cmi-questions"
          ref=site.data.wom.questions data=site.data.wom.qearly source="questions" %}
        </div>
      </li>
      <li class="tab-header-and-content">
        <a href="javascript:void(0)" class="tab-link">Way of the Heart</a>
        <div class="tab-content">
          {% include ui/description-list.html class="cmi-questions"
          ref=site.data.wom.questions data=site.data.wom.qwoh source="questions" %}
        </div>
      </li>
      <li class="tab-header-and-content">
        <a href="javascript:void(0)" class="tab-link">Way of Transformation</a>
        <div class="tab-content">
          {% include ui/description-list.html class="cmi-questions"
          ref=site.data.wom.questions data=site.data.wom.qwot source="questions" %}
        </div>
      </li>
      <li class="tab-header-and-content">
        <a href="javascript:void(0)" class="tab-link">Way of Knowing</a>
        <div class="tab-content">
          {% include ui/description-list.html class="cmi-questions"
          ref=site.data.wom.questions data=site.data.wom.qwok source="questions" %}
        </div>
      </li>
    </ul>
  </div>


