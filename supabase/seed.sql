-- Curated starting list of DFW-area clubs for the team-affiliation dropdown.
-- Parent-entered only; this is not scraped from any league site and is
-- expected to grow to a few hundred rows over time via admin tools.

insert into public.clubs (name, city, age_groups) values
  ('Solar Soccer Club', 'Dallas', array['U9','U10','U11','U12','U13','U14','U15','U16']),
  ('Dallas Texans', 'Dallas', array['U9','U10','U11','U12','U13','U14','U15','U16']),
  ('FC Dallas Youth', 'Frisco', array['U9','U10','U11','U12','U13','U14','U15','U16']),
  ('North Texas Soccer Association', 'Plano', array['U9','U10','U11','U12','U13','U14','U15','U16']),
  ('Solar Chelsea SC', 'McKinney', array['U9','U10','U11','U12','U13','U14','U15','U16']),
  ('Lonestar SC', 'Fort Worth', array['U9','U10','U11','U12','U13','U14','U15','U16']),
  ('Southlake Futbol Club', 'Southlake', array['U9','U10','U11','U12','U13','U14','U15','U16']),
  ('Arlington Soccer Association', 'Arlington', array['U9','U10','U11','U12','U13','U14','U15','U16']);
