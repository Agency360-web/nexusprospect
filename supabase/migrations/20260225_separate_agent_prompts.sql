-- ============================================================
-- Migration: Separar prompts por tipo de agente em colunas
-- Colunas: prompt_dispatch, prompt_support, prompt_followup
-- ============================================================

-- 1. Adicionar colunas de prompt separadas
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS prompt_dispatch TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS prompt_support TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS prompt_followup TEXT DEFAULT '';

-- 2. Migrar dados existentes: 
-- Copiar o prompt antigo para a coluna correspondente ao agent_type
UPDATE public.ai_agent_settings 
SET prompt_dispatch = COALESCE(prompt, '')
WHERE agent_type = 'dispatch' OR agent_type IS NULL;

UPDATE public.ai_agent_settings 
SET prompt_support = COALESCE(prompt, '')
WHERE agent_type = 'support';

UPDATE public.ai_agent_settings 
SET prompt_followup = COALESCE(prompt, '')
WHERE agent_type = 'followup';

-- 3. Para registros duplicados (múltiplas linhas por org com agent_types diferentes),
-- consolidar em uma única linha por organização
-- Primeiro, vamos unir os prompts dos diferentes agent_types na linha principal (dispatch)
DO $$
DECLARE
    org RECORD;
    dispatch_prompt TEXT;
    support_prompt TEXT;
    followup_prompt TEXT;
    main_id UUID;
BEGIN
    FOR org IN 
        SELECT organization_id 
        FROM public.ai_agent_settings 
        GROUP BY organization_id 
        HAVING COUNT(*) > 1
    LOOP
        -- Pegar prompts de cada tipo
        SELECT COALESCE(prompt, '') INTO dispatch_prompt 
        FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id AND agent_type = 'dispatch' 
        LIMIT 1;
        
        SELECT COALESCE(prompt, '') INTO support_prompt 
        FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id AND agent_type = 'support' 
        LIMIT 1;
        
        SELECT COALESCE(prompt, '') INTO followup_prompt 
        FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id AND agent_type = 'followup' 
        LIMIT 1;

        -- Pegar o ID da linha principal (dispatch ou a primeira)
        SELECT id INTO main_id 
        FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id 
        ORDER BY CASE WHEN agent_type = 'dispatch' THEN 0 ELSE 1 END 
        LIMIT 1;

        -- Atualizar a linha principal com todos os prompts
        UPDATE public.ai_agent_settings 
        SET prompt_dispatch = COALESCE(dispatch_prompt, ''),
            prompt_support = COALESCE(support_prompt, ''),
            prompt_followup = COALESCE(followup_prompt, ''),
            agent_type = 'dispatch'
        WHERE id = main_id;

        -- Deletar as linhas duplicadas
        DELETE FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id AND id != main_id;
    END LOOP;
END $$;

-- 4. Restaurar constraint UNIQUE por organization_id (1 linha por org)
ALTER TABLE public.ai_agent_settings 
DROP CONSTRAINT IF EXISTS ai_agent_settings_org_type_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_agent_settings_organization_id_key'
  ) THEN
    ALTER TABLE public.ai_agent_settings 
    ADD CONSTRAINT ai_agent_settings_organization_id_key 
    UNIQUE (organization_id);
  END IF;
END $$;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
