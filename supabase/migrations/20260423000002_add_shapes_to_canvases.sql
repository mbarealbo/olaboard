alter table canvases add column if not exists shapes jsonb default '[]';
