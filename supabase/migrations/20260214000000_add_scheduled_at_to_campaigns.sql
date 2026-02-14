-- Add scheduledAt column to dispatch campaigns table
ALTER TABLE public.campanhas_disparo 
ADD COLUMN agendado_para TIMESTAMP WITH TIME ZONE;

-- Add index for scheduling queries
CREATE INDEX idx_campanhas_disparo_agendado_para ON public.campanhas_disparo(agendado_para);
