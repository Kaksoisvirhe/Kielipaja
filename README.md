# Työpajan tulokset — asennusohje

Tämä on itsenäinen verkkosovellus (ei liity Claudeen millään tavalla ajon
aikana). Data tallennetaan omaan Supabase-tietokantaasi, ja sivusto
isännöidään Vercelissä. Kesto: n. 15-20 min, ei vaadi koodaustaitoa.

## 1. Luo Supabase-tietokanta (ilmainen)

1. Mene osoitteeseen https://supabase.com ja luo tili
2. Luo uusi projekti (valitse mikä tahansa nimi ja salasana, alue esim. "Central EU")
3. Kun projekti on valmis, mene vasemmalta **SQL Editor** ja liitä tähän tämä koodi, sitten paina **Run**:

```sql
create table workshop_rooms (
  room text primary key,
  poll jsonb not null default '{"question":"","options":[],"votes":{}}',
  comments jsonb not null default '[]',
  updated_at timestamptz default now()
);

alter table workshop_rooms enable row level security;

create policy "Kaikki voivat lukea"
  on workshop_rooms for select
  using (true);

create policy "Kaikki voivat kirjoittaa"
  on workshop_rooms for insert
  with check (true);

create policy "Kaikki voivat päivittää"
  on workshop_rooms for update
  using (true);

alter publication supabase_realtime add table workshop_rooms;
```

Tämä luo taulun ja sallii kaikkien (linkin saaneiden) lukea ja kirjoittaa —
sopii pienelle luotetulle ryhmälle. Jos haluat tiukempaa pääsynhallintaa,
kerro niin voin auttaa siinä.

4. Mene **Project Settings → API**. Kopioi talteen:
   - **Project URL**
   - **anon public** -avain (ei "service_role"-avainta, se on salainen)

## 2. Vie koodi GitHubiin

1. Luo tili osoitteessa https://github.com jos ei vielä ole
2. Luo uusi tyhjä repositorio (esim. nimeltä `tyopaja`)
3. Lataa tämä kansio GitHubiin — helpoin tapa on GitHubin verkkosivun
   "Add file → Upload files" -toiminto, vedä kaikki tiedostot sinne
   (paitsi `.env.example`-tiedoston voi jättää, ei tarvitse `.env`-tiedostoa)

## 3. Julkaise Vercelissä (ilmainen)

1. Mene osoitteeseen https://vercel.com ja kirjaudu GitHub-tililläsi
2. Paina **Add New → Project**, valitse juuri luomasi GitHub-repositorio
3. Vercel tunnistaa automaattisesti, että kyseessä on Vite-projekti
4. Ennen julkaisua, avaa **Environment Variables** ja lisää:
   - `VITE_SUPABASE_URL` = (Supabasesta kopioitu Project URL)
   - `VITE_SUPABASE_ANON_KEY` = (Supabasesta kopioitu anon public -avain)
5. Paina **Deploy**

Parin minuutin päästä saat linkin muotoa `tyopaja-jotain.vercel.app` —
tämä on sivustosi julkinen osoite.

(Jos haluat myöhemmin oman domainin, esim. `tyopaja.yhdistys.fi`, se
onnistuu Vercelin **Settings → Domains** -kohdasta.)

## 4. Upota WordPress-sivulle

Lisää sivulle/artikkeliin **Mukautettu HTML** -lohko (Custom HTML block)
ja liitä tähän Vercel-osoitteesi:

```html
<iframe
  src="https://tyopaja-jotain.vercel.app"
  width="100%"
  height="1000"
  style="border:none; max-width: 700px; display:block; margin:0 auto;"
  loading="lazy"
></iframe>
```

Säädä `height`-arvoa tarpeen mukaan (kommenttien lisääntyessä sivu pitenee).

Vaihtoehtoisesti voit jakaa pelkän linkin (`tyopaja-jotain.vercel.app`)
ilman upotusta, jos iframe ei sovi teidän sivupohjaanne.

## Useampi työpaja / eri ryhmät

Sovellus käyttää yhtä "huonetta" (`tyopaja-default`), eli kaikki samalle
osoitteelle tulevat näkevät saman äänestyksen ja keskustelun. Jos
tarvitset useamman erillisen työpajan:

- Avaa `src/supabaseClient.js`
- Vaihda `ROOM`-arvo uniikiksi jokaista työpajaa varten (esim. `"tyopaja-2026-03"`)
- Julkaise uudelleen (tai tee erillinen Vercel-projekti per työpaja)

## Huomioita

- Kuka tahansa linkin saanut voi äänestää, kommentoida ja muokata
  vaihtoehtoja — ei erillistä kirjautumista. Sopii pienelle luotetulle
  ryhmälle sellaisenaan.
- Data säilyy Supabase-tililläsi pysyvästi, kunnes poistat sen itse.
- Ilmaiset Supabase- ja Vercel-tasot riittävät pienen ryhmän käyttöön
  reilusti.
