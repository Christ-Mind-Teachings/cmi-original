---
layout: page
permalink: /nwffacim/acim/
title: ACIM Study Group
source: Northwest Foundation for ACIM
surl: /nwffacim/
publish: false
---

This is the {{page.title}} page.

<ul class="accordion">
  {% for y in (2002..2015) %}
    {% assign year = site.nwffacim | where: "year", y %}
    <li>
    <a href="javascript:void(0)" class="js-accordion-trigger">{{y}}</a>
      <ul class="submenu">
        <section>
        {% for item in year %}
          <li>
            <header>
              <a href="{{item.url}}">{{item.title}}</a>
            </header>
            <section>
              <p>
              {% if item.ref %}{{item.ref}}{% else %}&nbsp;{% endif %}
              </p>
            </section>
          </li>
        {% endfor %}
        </section>
      </ul>
    </li>
  {% endfor %}
</ul>

<script
  src="https://code.jquery.com/jquery-3.1.1.min.js"
  integrity="sha256-hVVnYaiADRTO2PzUGmuLJr8BLUSjGIZsDYGmIJLv2b8="
  crossorigin="anonymous">
</script>

<script>
$('.js-accordion-trigger').bind('click', function(e){
  jQuery(this).parent().find('.submenu').slideToggle('fast');
  jQuery(this).parent().toggleClass('is-expanded');
  e.preventDefault();
});
</script>
