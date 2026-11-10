(function () {
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in w;

  /* 1. Treść wjeżdża przy przewijaniu (tylko to, czego jeszcze nie widać) */
  if (hasIO && !reduce) {
    var sel = [
      'main > section:not(.hero) .eyebrow', 'main > section:not(.hero) h2', '.cta .lead', '.note',
      '.card', '.case', '.cases-cta', '.service', '.price-note', '.tools', '.steps li', '.about-text', '.form-wrap'
    ];
    var stagger = '.card,.case,.service,.steps li';
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

  /* 2. Liczby w przykładach odliczają się od zera.
        Zerujemy je dopiero w chwili wjazdu w ekran: bez animacji w HTML zostaje prawdziwa liczba, nie „0”. */
  if (hasIO && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, to = +el.getAttribute('data-count'), t0 = null, dur = 1100;
        el.textContent = '0';
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
    [].forEach.call(d.querySelectorAll('[data-count]'), function (el) { cio.observe(el); });
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

  /* 4. Animowany przykład automatyzacji w nagłówku (odtwarza się raz) */
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
        } else {
          finish(); /* raz i zostaje na ostatniej klatce */
          timer = 'koniec';
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

  /* 5. Formularz: wysyłka w tle, komunikat po polsku przy błędzie, bez podwójnego wysłania.
        Bez JS (albo w starej przeglądarce) formularz wysyła się zwyczajnie,
        a Web3Forms sam przekierowuje na dziekuje.html. */
  var form = d.querySelector('form.contact');
  if (form) {
    var btn = form.querySelector('button[type=submit]');
    var msg = d.getElementById('form-msg');
    var label = btn ? btn.innerHTML : '';
    var busy = function (on) {
      if (!btn) return;
      btn.disabled = on;
      if (on) btn.textContent = 'Wysyłanie…'; else btn.innerHTML = label;
    };
    var canFetch = w.fetch && w.FormData && FormData.prototype['delete'];

    form.addEventListener('submit', function (e) {
      if (!canFetch) { busy(true); return; }
      e.preventDefault();
      if (msg) msg.textContent = '';
      busy(true);
      var data = new FormData(form);
      data['delete']('redirect'); /* w tle chcemy odpowiedź, nie przekierowanie */
      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) {
          /* Web3Forms odpowiada JSON-em {success: true|false}; gdyby odpowiedział czymś innym, decyduje status */
          return r.json().then(function (j) { return !!(j && j.success); }, function () { return r.ok; });
        })
        .then(function (ok) {
          if (!ok) throw new Error('web3forms');
          w.location.href = 'dziekuje.html';
        })
        ['catch'](function () {
          busy(false);
          if (msg) msg.textContent = 'Nie udało się wysłać wiadomości. Spróbuj jeszcze raz albo napisz na kontakt@nailed-it.org.';
        });
    });

    /* po powrocie przyciskiem „Wstecz” przycisk nie może zostać zablokowany */
    w.addEventListener('pageshow', function () { busy(false); });
  }
})();
