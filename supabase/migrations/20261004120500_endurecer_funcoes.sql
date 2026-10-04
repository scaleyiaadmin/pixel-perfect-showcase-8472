-- Funções de gatilho não precisam ser chamadas pela API; auditoria só para quem está logado.
-- As funções auxiliares de RLS (papel_atual, e_equipe, tem_papel, empresa_atual) continuam
-- executáveis por anon porque as policies de leitura são avaliadas também para visitantes.
alter function public.tocar_atualizado_em() set search_path = public;

revoke execute on function public.criar_perfil() from public, anon, authenticated;
revoke execute on function public.pagamentos_atualizar_taxa() from public, anon, authenticated;
revoke execute on function public.proteger_ultimo_administrador() from public, anon, authenticated;
revoke execute on function public.registrar_auditoria(text, text, text) from public, anon;
grant execute on function public.registrar_auditoria(text, text, text) to authenticated;
