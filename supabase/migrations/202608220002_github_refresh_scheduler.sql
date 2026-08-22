do $$
declare
  existing_job bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for existing_job in select jobid from cron.job where jobname = 'daily-tax-deed-refresh'
    loop
      perform cron.unschedule(existing_job);
    end loop;
  end if;
end;
$$;

drop function if exists private.trigger_tax_deed_refresh();
