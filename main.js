(function () {
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in w;

  /* 1. Treść wjeżdża przy przewijaniu (tylko to, czego jeszcze nie widać) */
  if (hasIO && !reduce) {
    var sel = [
      'main > section:not(.hero) .eyebrow', 'main > section:not(.hero) h2', '.cta .lead', '.note',
      '.card', '.case', '.service', '.tools', '.steps li', '.checklist li', '.about-text', '.form-wrap'
    ];
    var stagger = '.card,.case,.service,.steps li,.checklist li';
    var vh = w.innerHeight;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    [].forEach.call(d.querySelectorAll(sel.join(',')), function (el) {
      if (el.parentElement.closest('.reveal')) return;
      if (el.getBoundingClientRect().top < vh) { el.classList.add('in'); return; }
      if (el.matches(stagger)) {
        var i = [].indexOf.call(el.parentElement.children, el);
        el.style.transitionDelay = Math.min(i, 5) * 90 + 'ms';
      }
      el.classList.add('reveal');
      io.observe(el);
    });
  } else {
    [].forEach.call(d.querySelectorAll('.steps li'), function (el) { el.classList.add('in'); });
  }

  /* 2. Liczby w przykładach odliczają się od zera */
  if (hasIO && !reduce) {
    var counters = d.querySelectorAll('[data-count]');
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, to = +el.getAttribute('data-count'), t0 = null, dur = 1100;
        setTimeout(function () {
          w.requestAnimationFrame(function step(t) {
            if (t0 === null) t0 = t;
            var p = Math.min((t - t0) / dur, 1);
            el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) w.requestAnimationFrame(step);
          });
        }, 250);
      });
    }, { threshold: 0.6 });
    [].forEach.call(counters, function (el) { el.textContent = '0'; cio.observe(el); });
  }

  /* 3. Aktywny link w menu */
  var links = d.querySelectorAll('.nav a[href^="#"]');
  if (hasIO && links.length) {
    var byId = {};
    [].forEach.call(links, function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var setActive = function (a) {
      [].forEach.call(links, function (l) { l.classList.toggle('active', l === a); });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('hero')) setActive(null);
        else if (byId[e.target.id]) setActive(byId[e.target.id]);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    [].forEach.call(d.querySelectorAll('main > section'), function (s) { spy.observe(s); });
  }

  /* 4. Animowany przykład automatyzacji w nagłówku */
  var flow = d.querySelector('.flow');
  if (flow) {
    var steps = flow.querySelectorAll('.flow-steps li');
    var finish = function () {
      [].forEach.call(steps, function (s) { s.classList.remove('active'); s.classList.add('done'); });
      flow.classList.add('complete');
    };
    if (reduce) {
      finish();
    } else {
      var i = -1, visible = true, timer = null;
      var tick = function () {
        timer = null;
        if (!visible) return;
        i++;
        if (i < steps.length) {
          if (i > 0) { steps[i - 1].classList.remove('active'); steps[i - 1].classList.add('done'); }
          steps[i].classList.add('active');
          timer = setTimeout(tick, 1000);
        } else if (i === steps.length) {
          finish();
          timer = setTimeout(tick, 3200);
        } else {
          [].forEach.call(steps, function (s) { s.classList.remove('active', 'done'); });
          flow.classList.remove('complete');
          i = -1;
          timer = setTimeout(tick, 600);
        }
      };
      if (hasIO) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible && !timer) timer = setTimeout(tick, 400);
        }).observe(flow);
      }
      timer = setTimeout(tick, 1100);
    }
  }

  /* 5. Formularz: bez podwójnego wysłania */
  var form = d.querySelector('form.contact');
  if (form) {
    form.addEventListener('submit', function () {
      var b = form.querySelector('button[type=submit]');
      if (b) { b.disabled = true; b.textContent = 'Wysyłanie…'; }
    });
  }
})();
