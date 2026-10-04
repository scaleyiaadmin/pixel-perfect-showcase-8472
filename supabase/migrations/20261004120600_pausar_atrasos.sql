-- Enquanto a integração e a equipe não registram as saídas, toda partida vencida viraria
-- "atrasada" no painel público. A marcação automática fica desligada até os dados chegarem;
-- para religar: select cron.schedule('atualizar-atrasos', '*/5 * * * *', $$select public.atualizar_atrasos()$$);
select cron.unschedule(jobid) from cron.job where jobname = 'atualizar-atrasos';

update public.viagens set status = 'prevista' where status = 'atrasada';
