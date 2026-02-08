-- =====================================================
-- SCRIPT SQL: Sistema de Hierarquia de Usuários
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela de organizações
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Empresa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Adicionar campo organization_id na tabela profiles (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Habilitar RLS nas tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança para organizations
-- Usuários só podem ver sua própria organização
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (
  id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  OR owner_id = auth.uid()
);

-- Apenas o owner pode atualizar a organização
CREATE POLICY "Owner can update organization"
ON organizations FOR UPDATE
USING (owner_id = auth.uid());

-- Apenas usuários autenticados podem inserir (ao criar conta)
CREATE POLICY "Authenticated users can create organization"
ON organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Atualizar política de profiles para filtrar por organização
-- Primeiro, remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- Criar nova política: usuários veem apenas profiles da mesma organização
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  OR id = auth.uid()
);

-- 6. Criar função para auto-criar organização ao registrar
CREATE OR REPLACE FUNCTION handle_new_user_organization()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Criar organização para o novo usuário
  INSERT INTO organizations (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Empresa'),
    NEW.id
  )
  RETURNING id INTO new_org_id;
  
  -- Atualizar profile com organization_id e role admin
  UPDATE profiles 
  SET organization_id = new_org_id, role = 'admin'
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger para novos usuários (se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created_organization ON auth.users;
CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_organization();

-- =====================================================
-- ATENÇÃO: Execute também para usuários existentes
-- =====================================================
-- Para cada usuário existente sem organização, criar uma:
DO $$
DECLARE
  profile_record RECORD;
  new_org_id UUID;
BEGIN
  FOR profile_record IN 
    SELECT p.id, p.full_name, p.organization_id, u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.organization_id IS NULL
  LOOP
    -- Criar organização
    INSERT INTO organizations (name, owner_id)
    VALUES (
      COALESCE(profile_record.full_name, 'Minha Empresa'),
      profile_record.id
    )
    RETURNING id INTO new_org_id;
    
    -- Atualizar profile
    UPDATE profiles 
    SET organization_id = new_org_id, role = 'admin'
    WHERE id = profile_record.id;
    
    RAISE NOTICE 'Created organization % for user %', new_org_id, profile_record.email;
  END LOOP;
END $$;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
