-- =====================================================
-- FIX: Corrigir erro "Database error saving new user"
-- Problema: Dois triggers separados (on_auth_user_created e 
-- on_auth_user_created_organization) causavam conflito na ordem
-- de execução, onde o trigger de organization tentava atualizar
-- um profile que podia não existir ainda.
-- Solução: Combinar ambos em um único trigger atômico.
-- =====================================================

-- 1. Remover triggers antigos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_organization ON auth.users;

-- 2. Criar função unificada que faz tudo em uma transação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Passo 1: Criar o profile do usuário
  INSERT INTO public.profiles (id, email, full_name, role, allowed_pages)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'user'),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'role')::text = 'admin' 
        THEN ARRAY['dashboard', 'admin', 'clients', 'reports', 'transmission', 'settings']
      ELSE ARRAY['dashboard', 'reports']
    END
  );

  -- Passo 2: Criar a organização para o novo usuário
  INSERT INTO public.organizations (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Empresa'),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- Passo 3: Atualizar o profile com o organization_id e role admin
  UPDATE public.profiles 
  SET organization_id = new_org_id, role = 'admin'
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar trigger único
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FIM DO FIX
-- =====================================================
