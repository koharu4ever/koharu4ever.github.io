/* global hexo */

'use strict';

const ROUTE_FAVICONS = new Map([
  ['index.html', '/img/favicons/koharu3.webp'],
  ['notes/index.html', '/img/favicons/koharu2.webp'],
  ['resume/index.html', '/img/favicons/koharu5.webp'],
]);

hexo.extend.helper.register('favicon_tag', function (defaultPath) {
  const route = String(this.path || '').replace(/^\/+/, '');
  const favicon = this.is_post()
    ? '/img/favicons/koharu4.webp'
    : ROUTE_FAVICONS.get(route) || defaultPath;

  return `<link class="js-pjax" rel="icon" type="image/webp" href="${this.url_for(favicon)}">`;
});
