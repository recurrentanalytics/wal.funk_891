/* Presentation only: scroll progress in the menu bar and soft reveal of blocks as they scroll into view. */
(function () {
  const toc = document.querySelector('.toc');
  const prog = () => { const h = document.documentElement; toc.style.setProperty('--p', Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)).toFixed(4)); };
  addEventListener('scroll', prog, { passive: true }); prog();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  const vh = innerHeight;
  document.querySelectorAll('.part .wrap > *').forEach((el) => {
    if (el.getBoundingClientRect().top < vh) return;          // already on screen: leave as is
    el.classList.add('rv'); io.observe(el);
  });
  setTimeout(() => document.querySelectorAll('.rv:not(.in)').forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); }), 1500);
})();
