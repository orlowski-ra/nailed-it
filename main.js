(function () {
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in w;

  /* 0. Opowieść (sekcje od „Problem” do „O mnie” w przypiętym kadrze) działa tylko z ruchem i sticky.
        Klasę dajemy od razu, żeby reszta skryptu wiedziała, które elementy obsługuje opowieść. */
  var story = d.querySelector('.story');
  var canSticky = w.CSS && CSS.supports && (CSS.supports('position', 'sticky') || CSS.supports('position', '-webkit-sticky'));
  var live = !!(story && !reduce && canSticky && w.requestAnimationFrame);
  if (live) story.classList.add('is-live');
  var inStory = function (el) { return live && story.contains(el); };

  /* 1. Treść wjeżdża przy przewijaniu (tylko to, czego jeszcze nie widać; w opowieści robi to sam krok) */
  if (hasIO && !reduce) {
    var sel = [
      '.section .eyebrow', '.section h2', '.cta .lead', '.note',
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
      if (inStory(el) || el.parentElement.closest('.reveal')) return;
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
        Zerujemy je dopiero w chwili startu: bez animacji w HTML zostaje prawdziwa liczba, nie „0”. */
  var countUp = function (el) {
    if (el.getAttribute('data-done')) return;
    el.setAttribute('data-done', '1');
    var to = +el.getAttribute('data-count'), t0 = null, dur = 1100;
    el.textContent = '0';
    setTimeout(function () {
      w.requestAnimationFrame(function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) w.requestAnimationFrame(step);
      });
    }, 250);
  };
  if (hasIO && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        countUp(e.target);
      });
    }, { threshold: 0.6 });
    [].forEach.call(d.querySelectorAll('[data-count]'), function (el) { if (!inStory(el)) cio.observe(el); });
  }

  /* 3. Aktywny link w menu (w opowieści ustawia go aktywny krok) */
  var links = d.querySelectorAll('.nav a[href^="#"]');
  var byId = {};
  [].forEach.call(links, function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var setActive = function (a) {
    [].forEach.call(links, function (l) { l.classList.toggle('active', l === a); });
  };
  if (hasIO && links.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('hero')) setActive(null);
        else if (e.target === story && live) story.dispatchEvent(new Event('navsync'));
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

  /* Kropki w tle (wspólne dla opowieści i sekcji pod nią): każdy układ ma swój kształt,
     a między układami kropki płynnie przechodzą z jednego w drugi.
     0 fale (start), 1 chaos (problem), 2 płynące linie (automatyzacja), 3 siatka (efekt),
     4 słupki 16/3/20 h (przykłady), 5 trzy kręgi (usługi), 6 schody 4 kroków (współpraca), 7 tarcza (o mnie) */
  var makeDots = function (canvas) {
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, dots = [], N = 108, LANES = 5;
    var R = { x0: 0, x1: 0, y0: 0, y1: 0 };
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var narrow = false, cols = 12, rows = 9;
    var size = function (ww, hh, wide) {
      if (!ctx) return;
      dpr = Math.min(w.devicePixelRatio || 1, 2);
      W = ww; H = hh;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      narrow = !wide && W < 821;
      cols = narrow ? 9 : 12; rows = narrow ? 12 : 9;
      R = narrow ? { x0: W * 0.08, x1: W * 0.92, y0: H * 0.12, y1: H * 0.86 } : { x0: W * 0.54, x1: W * 0.93, y0: H * 0.15, y1: H * 0.82 };
      seed = 7; dots = [];
      for (var i = 0; i < N; i++) {
        dots.push({ ax: rnd(), ay: rnd(), ph: rnd() * 6.28, u: rnd(), sp: 0.6 + rnd() * 0.8, lit: rnd() < 0.42 });
      }
    };
    /* słupki i schody: kropki układane kolumnami od dołu */
    var stack = function (i, counts) {
      var acc = 0, k = 0;
      while (k < counts.length - 1 && i >= acc + counts[k]) { acc += counts[k]; k++; }
      var j = i - acc, perRow = 3, gap = (R.x1 - R.x0) / counts.length;
      var col = j % perRow, row = Math.floor(j / perRow);
      var cell = Math.min(gap / 5, (R.y1 - R.y0) / 26);
      var x = R.x0 + gap * (k + 0.5) + (col - 1) * cell;
      return [x, R.y1 - row * cell];
    };
    var BARS = [44, 8, 56];           /* 16 h, 3 h, 20 h → proporcje 108 kropek */
    var STAIRS = [11, 22, 32, 43];    /* 4 schodki rosnące */
    var pos = function (L, i, o, t) {
      var Rw = R.x1 - R.x0, Rh = R.y1 - R.y0, cxm = (R.x0 + R.x1) / 2, cym = (R.y0 + R.y1) / 2, m = Math.min(Rw, Rh);
      switch (L) {
        case 0: { var lane = i % 3, u = Math.floor(i / 3) / (N / 3 - 1);
          return [R.x0 + u * Rw, cym + (lane - 1) * Rh * 0.12 + Math.sin(u * 9.4 + t * 0.0009 + lane * 0.7) * Rh * 0.12]; }
        case 1: return [o.ax * W + Math.sin(t * 0.0005 + o.ph) * 18, o.ay * H + Math.cos(t * 0.0004 + o.ph * 1.3) * 18];
        case 2: { var lx0 = narrow ? 0 : W * 0.45, fx = (o.u + t * 0.00005 * o.sp) % 1;
          return [lx0 + fx * (W - lx0), H * (0.2 + 0.6 * (i % LANES) / (LANES - 1))]; }
        case 3: { var c = i % cols, r = Math.floor(i / cols);
          return [R.x0 + Rw * c / (cols - 1), R.y0 + Rh * r / (rows - 1)]; }
        case 4: return stack(i, BARS);
        case 5: { var k = i % 3, a = Math.floor(i / 3) / (N / 3) * 6.2832 + t * 0.00025 * (k % 2 ? -1 : 1);
          var cx = R.x0 + Rw * (0.2 + 0.3 * k), cy = R.y0 + Rh * (narrow ? 0.25 + 0.25 * k : 0.3 + 0.2 * k), rr = m * (narrow ? 0.16 : 0.17);
          return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }
        case 6: return stack(i, STAIRS);
        default: { var ring = i % 3, b = Math.floor(i / 3) / (N / 3) * 6.2832 + t * 0.0002 * (ring + 1);
          var rr2 = m * (0.13 + ring * 0.13);
          return [cxm + Math.cos(b) * rr2, cym + Math.sin(b) * rr2]; }
      }
    };
    /* wygląd kropki w danym układzie: [przezroczystość, czy limonkowa (0–1), promień] */
    var look = function (L, i, o, t) {
      switch (L) {
        case 0: return i % 3 === 0 ? [0.8, 1, 1.6] : [0.35, 0, 1.3];
        case 1: return [0.5, 0, 1.3];
        case 2: { var fx = (o.u + t * 0.00005 * o.sp) % 1, edge = Math.min(1, fx * 8, (1 - fx) * 8);
          return [0.85 * (0.4 + 0.6 * edge), 1, 1.7]; }
        case 3: return o.lit ? [0.95, 1, 2.4] : [0.22, 0, 1.5];
        case 4: return [0.8, 1, 2];
        case 5: return i % 3 === 1 ? [0.9, 1, 1.8] : [0.5, 0, 1.6];
        case 6: return [0.85, 1, 1.9];
        default: return i % 3 === 0 ? [0.9, 1, 1.9] : [0.4, 0, 1.5];
      }
    };
    var ease = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    /* rysuje przejście z układu A do B; f = postęp 0–1 */
    var render = function (t, A, B, f) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      f = ease(Math.min(1, Math.max(0, f)));
      /* linie pod układem 2 */
      var laneA = (A === 2 ? 1 - f : 0) + (B === 2 && A !== 2 ? f : 0);
      if (laneA > 0.01) {
        var lx0 = narrow ? 0 : W * 0.45;
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
        var p1 = pos(A, i, o, t), p2 = A === B ? p1 : pos(B, i, o, t);
        var s1 = look(A, i, o, t), s2 = A === B ? s1 : look(B, i, o, t);
        var x = p1[0] + (p2[0] - p1[0]) * f, y = p1[1] + (p2[1] - p1[1]) * f;
        var a = s1[0] + (s2[0] - s1[0]) * f, lime = s1[1] + (s2[1] - s1[1]) * f, rad = s1[2] + (s2[2] - s1[2]) * f;
        ctx.fillStyle = lime > 0.5 ? 'rgba(200,255,61,' + a.toFixed(3) + ')' : 'rgba(255,255,255,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
      }
    };
    return { size: size, render: render, ok: !!ctx };
  };

  /* 6. Opowieść: kadr przypięty na czas przewijania, kroki przechodzą płynnie jeden w drugi.
        Krok dłuższy niż ekran przesuwa się w kadrze razem z przewijaniem, a dopiero potem ustępuje następnemu.
        W tle kropki: chaos (problem) → płynące linie (automatyzacja) → równa siatka (efekt i dalej).
        Bez JS albo przy ograniczonym ruchu kroki zostają zwykłymi sekcjami jedna pod drugą. */
  if (live) {
    var pin = story.querySelector('.story-pin');
    var stage = story.querySelector('.story-stage');
    var stepsEl = [].slice.call(story.querySelectorAll('.story-step'));
    var inners = stepsEl.map(function (el) { return el.querySelector('.story-inner'); });
    var navA = story.querySelectorAll('.story-nav a');
    var bar = story.querySelector('.story-bar i');
    var field = makeDots(story.querySelector('.story-canvas'));
    var n = stepsEl.length, cur = -1, morph = 0, morphTo = 0, inView = false, raf = 0, last = 0;
    var seg = [], total = 1, frameH = 0;
    /* krok → link w menu u góry (Współpraca nie ma własnego) */
    var menuFor = { problem: 'problem', 'krok-2': 'problem', 'krok-3': 'problem', przyklady: 'przyklady', uslugi: 'uslugi', 'o-mnie': 'o-mnie' };
    /* Tempo jednakowe dla wszystkich kroków (Rafał: +50%, potem jeszcze +30%):
       SPEED = ile px przesuwa się treść na 1 px przewinięcia, HOLD = postój kroku jako część wysokości kadru. */
    var SPEED = 1.95, HOLD = 0.8 / SPEED;

    var layout = function () {
      frameH = stage.clientHeight;
      var pad = Math.min(56, Math.max(28, frameH * 0.06)), acc = 0;
      /* telefon: pasek menu nad logo zasłania górę kadru, dopóki nie odjedzie przy przewijaniu */
      var hdr = d.querySelector('.site-header');
      var overlap = hdr ? Math.max(0, hdr.offsetHeight - (parseFloat(getComputedStyle(pin).top) || 0)) : 0;
      seg = inners.map(function (inner, i) {
        var h = inner.offsetHeight + (i === 0 ? overlap : 0);
        var travel = Math.max(0, Math.ceil(h + pad * 2 - frameH));
        var top = (travel ? pad : Math.round((frameH - h) / 2)) + (i === 0 ? overlap : 0);
        var hold = frameH * HOLD;
        var s = { start: acc, travel: travel, top: top, lead: hold * 0.3, len: travel / SPEED + hold };
        s.edge = Math.min(s.lead, s.len * 0.15); /* na brzegach kroku kropki przechodzą w sąsiedni układ */
        acc += s.len;
        return s;
      });
      total = acc;
      story.style.height = Math.round(pin.offsetHeight + total) + 'px';
    };
    var startY = function () {
      var top = parseFloat(getComputedStyle(pin).top) || 0;
      return story.getBoundingClientRect().top + w.pageYOffset - top;
    };
    var placeInner = function (i, t) {
      var s = seg[i];
      var y = s.top - Math.min(s.travel, Math.max(0, (t - s.lead) * SPEED));
      inners[i].style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    };

    var setStep = function (i) {
      if (i === cur) return;
      cur = i;
      stepsEl.forEach(function (el, k) {
        el.classList.toggle('is-active', k === i);
        el.classList.toggle('is-past', k < i);
      });
      [].forEach.call(navA, function (a, k) {
        a.classList.toggle('is-active', k === i);
        if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      });
      story.classList.toggle('is-dense', i >= 4);
      /* to, co poza opowieścią robi się przy wjeździe w ekran, tu startuje razem z krokiem */
      [].forEach.call(stepsEl[i].querySelectorAll('[data-count]'), countUp);
      [].forEach.call(stepsEl[i].querySelectorAll('.steps li'), function (li) { li.classList.add('in'); });
      syncMenu();
    };
    var syncMenu = function () {
      var r = story.getBoundingClientRect();
      var mid = w.innerHeight / 2;
      if (r.top < mid && r.bottom > mid && cur >= 0) setActive(byId[menuFor[stepsEl[cur].id]] || null);
    };
    story.addEventListener('navsync', syncMenu);

    var onScroll = function () {
      var y = Math.min(total, Math.max(0, w.pageYOffset - startY()));
      var i = 0;
      while (i < n - 1 && y >= seg[i + 1].start) i++;
      var t = y - seg[i].start;
      for (var k = 0; k < n; k++) placeInner(k, k < i ? 1e9 : (k > i ? 0 : t));
      setStep(i);
      var e = seg[i].edge;
      morphTo = t < e ? i - 0.5 + 0.5 * t / e : (t > seg[i].len - e ? i + 0.5 * (t - seg[i].len + e) / e : i);
      morphTo = Math.min(n - 1, Math.max(0, morphTo));
      if (bar) bar.style.transform = 'scaleX(' + (y / total).toFixed(4) + ')';
      story.classList.toggle('is-moved', y > 40);
      kick();
    };

    /* przewinięcie do kroku (i ewentualnie do miejsca w długim kroku) */
    var goTo = function (i, within, smooth) {
      var top = Math.round(startY() + seg[i].start + (within || 0)) + 2;
      w.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'instant' }); /* 'instant', bo CSS ma scroll-behavior: smooth */
    };
    var stepOf = function (el) {
      for (var i = 0; i < n; i++) if (stepsEl[i] === el || stepsEl[i].contains(el)) return i;
      return -1;
    };
    [].forEach.call(navA, function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); goTo(i, seg[i].edge, true); });
    });
    /* linki z menu i z treści do sekcji, które są teraz krokami */
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.closest('.story-nav')) return;
      var id = a.getAttribute('href').slice(1);
      var target = id && d.getElementById(id);
      if (!target || !story.contains(target)) return;
      e.preventDefault();
      var i = target === story ? 0 : stepOf(target);
      if (i < 0) return;
      goTo(i, seg[i].edge, true);
      if (history.pushState) history.pushState(null, '', '#' + id);
    });
    /* klawiatura i czytniki ekranu: fokus w ukrytym kroku albo poza kadrem przewija do niego */
    stepsEl.forEach(function (el, i) {
      el.addEventListener('focusin', function (e) {
        /* po własnym przewinięciu przeglądarki do fokusu */
        setTimeout(function () { focusStep(i, e.target); }, 30);
      });
    });
    var focusStep = function (i, el) {
      if (d.activeElement !== el) return;
      var er = el.getBoundingClientRect(), fr = stage.getBoundingClientRect();
      if (i === cur && er.top >= fr.top && er.bottom <= fr.bottom) return;
      var rel = er.top - inners[i].getBoundingClientRect().top;
      var within = seg[i].travel ? seg[i].lead + Math.min(seg[i].travel, Math.max(0, rel - frameH / 2)) / SPEED : 0;
      goTo(i, within, false);
    };

    var draw = function (t) {
      raf = 0;
      if (!inView) return;
      var dt = last ? Math.min(t - last, 50) : 16; last = t;
      morph += (morphTo - morph) * Math.min(1, dt / 160);
      var A = Math.floor(morph);
      field.render(t, A, Math.min(n - 1, A + 1), morph - A);
      kick();
    };
    var build = function () { field.size(pin.clientWidth, pin.clientHeight); };
    var kick = function () { if (!raf && inView && field.ok) raf = w.requestAnimationFrame(draw); };

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) { last = 0; kick(); }
      }).observe(story);
    } else { inView = true; }

    var relayout = function () { layout(); build(); onScroll(); };
    var rt = null;
    w.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(relayout, 120);
    });
    w.addEventListener('scroll', onScroll, { passive: true });
    relayout(); morph = morphTo;
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(relayout);
    w.addEventListener('load', relayout);

    /* adres typu /#uslugi: przy wejściu na stronę i przy „Wstecz/Dalej” */
    var fromHash = function () {
      var h = location.hash.slice(1), ht = h && d.getElementById(h);
      if (!ht || !story.contains(ht) || ht === story) return;
      var hi = stepOf(ht);
      if (hi >= 0) goTo(hi, seg[hi].edge, false);
    };
    setTimeout(fromHash, 0);
    w.addEventListener('hashchange', fromHash);
  }
  /* 7. Sekcje pod opowieścią: kropki w tle w tym samym stylu. Przy wjeździe sekcji w ekran
        rozsypane kropki układają się w kształt sekcji (słupki, kręgi, schody, tarcza).
        Na telefonie bez kropek (tekst ma pierwszeństwo), przy ograniczonym ruchu od razu gotowy kształt. */
  var secCanvases = d.querySelectorAll('.sec-dots');
  if (secCanvases.length && w.requestAnimationFrame && w.matchMedia('(min-width: 821px)').matches) {
    [].forEach.call(secCanvases, function (c) {
      var host = c.parentElement, L = +c.getAttribute('data-layout') || 3;
      var f = makeDots(c);
      if (!f.ok) return;
      var t0 = null, vis = false, raf2 = 0;
      var size = function () { f.size(host.clientWidth, host.clientHeight, true); };
      var frame = function (t) {
        raf2 = 0;
        if (reduce) { f.render(t, L, L, 1); return; }
        if (!vis) return;
        if (t0 === null) t0 = t;
        f.render(t, 1, L, (t - t0) / 1400);
        raf2 = w.requestAnimationFrame(frame);
      };
      size();
      if (hasIO) {
        new IntersectionObserver(function (es) {
          vis = es[0].isIntersecting;
          if (vis && !raf2) raf2 = w.requestAnimationFrame(frame);
        }, { threshold: 0.2 }).observe(host);
      } else { vis = true; raf2 = w.requestAnimationFrame(frame); }
      var rt2 = null;
      w.addEventListener('resize', function () {
        clearTimeout(rt2);
        rt2 = setTimeout(function () { size(); if (reduce || !vis) w.requestAnimationFrame(function (t) { f.render(t, L, L, 1); }); }, 150);
      });
    });
  }
})();
