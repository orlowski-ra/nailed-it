(function () {
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in w;

  /* 1. Treść wjeżdża przy przewijaniu (tylko to, czego jeszcze nie widać) */
  if (hasIO && !reduce) {
    var sel = [
      'main > .section .eyebrow', 'main > .section h2', '.cta .lead', '.note',
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

  /* 6. Opowieść: ekran przypięty na czas przewijania, trzy kroki przechodzą płynnie jeden w drugi,
        a w tle kropki układają się od chaosu (problem), przez płynące linie (automatyzacja), do równej siatki (efekt).
        Bez JS albo przy ograniczonym ruchu kroki zostają zwykłymi sekcjami jedna pod drugą. */
  var story = d.querySelector('.story');
  var canSticky = w.CSS && CSS.supports && (CSS.supports('position', 'sticky') || CSS.supports('position', '-webkit-sticky'));
  if (story && !reduce && canSticky && w.requestAnimationFrame) {
    story.classList.add('is-live');
    var pin = story.querySelector('.story-pin');
    var stepsEl = story.querySelectorAll('.story-step');
    var navA = story.querySelectorAll('.story-nav a');
    var bar = story.querySelector('.story-bar i');
    var canvas = story.querySelector('.story-canvas');
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    var n = stepsEl.length, cur = -1, morph = 0, morphTo = 0, inView = false, raf = 0, last = 0;
    var W = 0, H = 0, dpr = 1, dots = [], LANES = 5;

    var metrics = function () {
      var top = parseFloat(getComputedStyle(pin).top) || 0;
      var r = story.getBoundingClientRect();
      var dist = Math.max(1, story.offsetHeight - pin.offsetHeight);
      return { top: top, dist: dist, start: r.top + w.pageYOffset - top };
    };

    var setStep = function (i) {
      if (i === cur) return;
      cur = i;
      [].forEach.call(stepsEl, function (el, k) {
        el.classList.toggle('is-active', k === i);
        el.classList.toggle('is-past', k < i);
      });
      [].forEach.call(navA, function (a, k) {
        a.classList.toggle('is-active', k === i);
        if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      });
    };

    var onScroll = function () {
      var m = metrics();
      var p = Math.min(1, Math.max(0, (w.pageYOffset - m.start) / m.dist));
      setStep(Math.min(n - 1, Math.floor(p * n)));
      morphTo = Math.min(n - 1, Math.max(0, p * n - 0.5));
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      story.classList.toggle('is-done', p > 0.97);
      kick();
    };

    [].forEach.call(navA, function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var m = metrics();
        w.scrollTo({ top: Math.round(m.start + m.dist * (i + 0.3) / n), behavior: 'smooth' });
      });
    });

    /* kropki w tle */
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var build = function () {
      if (!ctx) return;
      dpr = Math.min(w.devicePixelRatio || 1, 2);
      W = pin.clientWidth; H = pin.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var narrow = W < 821;
      var cols = narrow ? 9 : 12, rows = narrow ? 12 : 9;
      var gx0 = narrow ? 0.1 : 0.54, gx1 = narrow ? 0.9 : 0.92, gy0 = 0.16, gy1 = 0.8;
      var count = cols * rows;
      seed = 7; dots = [];
      for (var i = 0; i < count; i++) {
        var c = i % cols, r = Math.floor(i / cols);
        dots.push({
          ax: rnd(), ay: rnd(), ph: rnd() * 6.28,
          lane: i % LANES, u: rnd(), sp: 0.6 + rnd() * 0.8,
          gx: gx0 + (gx1 - gx0) * c / (cols - 1), gy: gy0 + (gy1 - gy0) * r / (rows - 1),
          lit: rnd() < 0.42
        });
      }
    };
    var ease = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var draw = function (t) {
      raf = 0;
      if (!ctx || !inView) return;
      var dt = last ? Math.min(t - last, 50) : 16; last = t;
      morph += (morphTo - morph) * Math.min(1, dt / 160);
      ctx.clearRect(0, 0, W, H);
      var k1 = ease(Math.min(1, morph)), k2 = ease(Math.max(0, morph - 1));
      var narrow = W < 821, lx0 = narrow ? 0 : W * 0.45;
      /* linie, po których płyną dane (widoczne w kroku 2) */
      var laneA = k1 * (1 - k2);
      if (laneA > 0.01) {
        ctx.lineWidth = 1;
        for (var l = 0; l < LANES; l++) {
          var ly = H * (0.2 + 0.6 * l / (LANES - 1));
          var g = ctx.createLinearGradient(lx0, 0, W, 0);
          g.addColorStop(0, 'rgba(200,255,61,0)'); g.addColorStop(1, 'rgba(200,255,61,' + (0.22 * laneA) + ')');
          ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(W, ly); ctx.stroke();
        }
      }
      for (var i = 0; i < dots.length; i++) {
        var o = dots[i];
        var ax = o.ax * W + Math.sin(t * 0.0005 + o.ph) * 18, ay = o.ay * H + Math.cos(t * 0.0004 + o.ph * 1.3) * 18;
        var fx = (o.u + t * 0.00005 * o.sp) % 1;
        var bx = lx0 + fx * (W - lx0), by = H * (0.2 + 0.6 * o.lane / (LANES - 1));
        var cx = o.gx * W, cy = o.gy * H;
        var x = ax + (bx - ax) * k1, y = ay + (by - ay) * k1;
        x += (cx - x) * k2; y += (cy - y) * k2;
        var edge = Math.min(1, fx * 8, (1 - fx) * 8);
        var aChaos = 0.5, aFlow = 0.85 * (0.4 + 0.6 * edge), aGrid = o.lit ? 0.95 : 0.22;
        var a = aChaos + (aFlow - aChaos) * k1; a += (aGrid - a) * k2;
        var lime = Math.max(k1 * (1 - k2), o.lit ? k2 : 0);
        var rad = 1.3 + (o.lit ? 1.1 : 0.2) * k2 + 0.4 * k1 * (1 - k2);
        ctx.fillStyle = lime > 0.5 ? 'rgba(200,255,61,' + a + ')' : 'rgba(255,255,255,' + a + ')';
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
      }
      kick();
    };
    var kick = function () { if (!raf && inView && ctx) raf = w.requestAnimationFrame(draw); };

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) { last = 0; kick(); }
      }).observe(story);
    } else { inView = true; }

    var rt = null;
    w.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { build(); onScroll(); }, 120);
    });
    w.addEventListener('scroll', onScroll, { passive: true });
    build(); onScroll(); morph = morphTo;
  }
})();
