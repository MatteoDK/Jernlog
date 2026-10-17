-- Brugerdefinerede programmer: hver bruger kan selv lave, omdøbe og slette programmer.
-- NULL = standard (Program 1 + Program 2), så ingen eksisterende bruger ændres.
alter table profiles add column if not exists programs jsonb;
