(() => {
  if (!['http:', 'https:'].includes(location.protocol)) return;
  let pending;

  async function navigate(url, push) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    try {
      const response = await fetch(url.href, { signal: controller.signal });
      if (!response.ok) throw new Error('Page unavailable');
      const next = new DOMParser().parseFromString(await response.text(), 'text/html');
      const main = next.querySelector('main');
      const title = next.querySelector('.hero-title');
      const nav = next.querySelector('.site-nav');
      if (!main || !title || !nav) throw new Error('Unexpected page');

      // Resolve paths against the destination before inserting its content.
      for (const element of next.querySelectorAll('[href], [src]')) {
        for (const attribute of ['href', 'src']) {
          const value = element.getAttribute(attribute);
          if (value && !value.startsWith('#')) {
            element.setAttribute(attribute, new URL(value, response.url).href);
          }
        }
      }
      if (controller.signal.aborted) return;
      if (push) history.pushState(null, '', url.href);
      document.title = next.title;
      document.body.className = next.body.className;
      document.body.classList.add('navigated-page');
      document.querySelector('main').replaceWith(main);
      document.querySelector('.hero-title').replaceChildren(...title.childNodes);
      document.querySelector('.site-nav').replaceChildren(...nav.childNodes);
      const footer = next.querySelector('.site-footer');
      if (footer) document.querySelector('.site-footer').replaceWith(footer);
      document.querySelector('meta[name="description"]')?.setAttribute('content',
        next.querySelector('meta[name="description"]')?.content || '');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      if (error.name !== 'AbortError') location.assign(url.href);
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !url.pathname.endsWith('.html') ||
        (url.pathname === location.pathname && url.search === location.search)) return;
    event.preventDefault();
    navigate(url, true);
  });
  window.addEventListener('popstate', () => navigate(new URL(location.href), false));
})();
