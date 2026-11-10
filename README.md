# nailed-it.org

Strona firmowa NailedIT. Czysty HTML, jeden `style.css` i jeden `main.js`, bez builda i bez frameworka.
Hosting: GitHub Pages z gałęzi `main`, domena z pliku `CNAME`.

## Co gdzie jest

- `index.html`, `polityka-prywatnosci.html`, `dziekuje.html`, `404.html`: pisane ręcznie.
- `wylaczenia-pradu/`: **generowane** przez `tools/build_site.py` w repozytorium `prad_alert`. Nie edytuj tych plików tutaj, zmiany rób u źródła.
- `style.css`: wspólny dla wszystkich stron, także generowanych.
- `main.js`: ładowany tylko na stronie głównej.

## O czym pamiętać przy zmianach

- Nagłówek i stopka są skopiowane do każdego pliku HTML (cztery tutaj plus szablon w `prad_alert`). Zmiana menu, danych firmy albo roku w „© 2026” wymaga poprawki we wszystkich.
- Kotwice `#problem`, `#przyklady`, `#uslugi`, `#o-mnie`, `#kontakt` są linkowane z podstron. Nie zmieniaj ich nazw.
- Teksty używają twardych spacji (U+00A0) po jednoliterowych słowach, przy liczbach i w zapisach typu „art. 6 ust. 1”. Edytor zwykle ich nie pokazuje, więc wyszukiwanie zwykłą spacją może nie trafić.
- Szarości i kolory są zmiennymi na górze `style.css`. Tekst na ciemnym tle ma mieć kontrast co najmniej 4,5:1, ramki pól 3:1.
- `404.html` używa ścieżek od `/`, żeby działał z każdego poziomu katalogów.
- Formularz idzie przez Web3Forms. Z JavaScriptem wysyłka odbywa się w tle (`main.js`), bez niego formularz wysyła się zwykłym POST-em i Web3Forms przekierowuje na `dziekuje.html`.
- Polityka prywatności opisuje faktycznych odbiorców danych. Zmiana dostawcy formularza, poczty albo hostingu oznacza też zmianę polityki.

## Podgląd lokalny

Dowolny serwer plików statycznych uruchomiony w katalogu repozytorium, na przykład `python -m http.server`.
