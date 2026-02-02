# 🚀 Antigravity n8n Integration Guide

> Guia completo para criação e gerenciamento de fluxos de trabalho n8n no projeto Nexus Prospect

---

## 📋 Visão Geral

Este documento serve como referência central para a criação de workflows n8n de alta qualidade, integrando:

| Ferramenta | Descrição | Repositório |
|------------|-----------|-------------|
| **n8n MCP Server** | Servidor MCP para controle direto do n8n | [czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp) |
| **n8n Skills** | 7 skills especializadas para automação | [czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills) |

### Recursos Disponíveis via MCP

- 📚 **1,084 n8n nodes** - 537 core nodes + 547 community nodes
- 🔧 **99% coverage** de propriedades com schemas detalhados
- 📄 **87% coverage** de documentação oficial
- 🤖 **265 AI-capable tools** detectados com documentação completa
- 💡 **2,646 exemplos** de configurações reais
- 🎯 **2,709 templates** de workflow com 100% metadata coverage

---

## 🔧 Configuração do MCP Server

### Pré-requisitos

1. n8n instalado e rodando (local ou produção)
2. Node.js instalado

### Instalação (✅ Concluída)

```bash
# Instalado localmente no projeto
npm install n8n-mcp --save-dev
```

### Configuração no Antigravity (macOS) (✅ Concluída)

Arquivo `~/.gemini/antigravity/mcp_config.json` já configurado:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "node",
      "args": [
        "/usr/local/lib/node_modules/n8n-mcp/dist/mcp/index.js"
      ],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "http://localhost:5678",
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": ""
      }
    }
  }
}
```

> ⚠️ **AÇÃO NECESSÁRIA**: Adicione sua API Key do n8n no campo `N8N_API_KEY`
> 
> Para obter a API Key:
> 1. Acesse seu n8n → Settings → API
> 2. Clique em "Create API Key"
> 3. Copie e cole no arquivo de configuração acima

---

## 📡 Ferramentas MCP Disponíveis

### Core Tools (7 ferramentas)

| Tool | Descrição |
|------|-----------|
| `tools_documentation` | Documentação de qualquer ferramenta MCP (COMECE AQUI!) |
| `search_nodes` | Busca full-text em todos os nodes |
| `get_node` | Informações unificadas de nodes (modes: info, docs, search_properties, versions) |
| `validate_node` | Validação de configuração (modes: minimal, full) |
| `validate_workflow` | Validação completa de workflows incluindo AI Agents |
| `search_templates` | Busca de templates (modes: keyword, by_nodes, by_task, by_metadata) |
| `get_template` | Obter workflow JSON completo |

### n8n Management Tools (13 ferramentas)

> ⚠️ Requer `N8N_API_URL` e `N8N_API_KEY` configurados

#### Workflow Management
| Tool | Descrição |
|------|-----------|
| `n8n_create_workflow` | Criar novos workflows |
| `n8n_get_workflow` | Obter workflow (modes: full, details, structure, minimal) |
| `n8n_update_full_workflow` | Atualizar workflow completo |
| `n8n_update_partial_workflow` | Atualizar via diff operations |
| `n8n_delete_workflow` | Deletar workflows |
| `n8n_list_workflows` | Listar workflows com filtros |
| `n8n_validate_workflow` | Validar workflow por ID |
| `n8n_autofix_workflow` | Auto-corrigir erros comuns |
| `n8n_workflow_versions` | Gerenciar versões e rollback |
| `n8n_deploy_template` | Deploy de templates do n8n.io |

#### Execution Management
| Tool | Descrição |
|------|-----------|
| `n8n_test_workflow` | Testar/triggerar execução |
| `n8n_executions` | Gerenciar execuções (list, get, delete) |
| `n8n_health_check` | Verificar conectividade da API |

---

## 🎓 n8n Skills (7 Skills)

### 1. n8n Expression Syntax
- Variáveis core: `$json`, `$node`, `$now`, `$env`
- ⚠️ **Crítico**: Webhook data está em `$json.body`
- Catálogo de erros comuns com soluções

### 2. n8n MCP Tools Expert (PRIORIDADE MÁXIMA)
- Guia de seleção de ferramentas
- Diferenças de formato nodeType
- Perfis de validação: minimal/runtime/ai-friendly/strict

### 3. n8n Workflow Patterns
- 5 padrões comprovados:
  - Webhook processing
  - HTTP API
  - Database
  - AI
  - Scheduled

### 4. n8n Validation Expert
- Loop de validação
- Catálogo de erros reais
- Guia de falsos positivos

### 5. n8n Node Configuration
- Regras de dependência de propriedades
- 8 tipos de conexão AI para workflows AI Agent

### 6. n8n Code JavaScript
- Padrões de acesso a dados: `$input.all()`, `$input.first()`, `$input.item`
- Formato correto de retorno: `[{json: {...}}]`
- Top 5 padrões de erro (62%+ das falhas)

### 7. n8n Code Python
- ⚠️ Use JavaScript para 95% dos casos
- Sem bibliotecas externas (requests, pandas, numpy)
- Workarounds para bibliotecas faltantes

---

## 🏗️ Estrutura do Projeto

```plaintext
nexusprospect/
├── Antigravity.md              # Este arquivo - Guia principal
├── AGENTS.md                   # Instruções especiais para n8n
├── n8n_workflow.json           # Workflow atual de disparo WhatsApp
├── .agent/
│   ├── workflows/              # Comandos slash existentes
│   └── skills/                 # Skills do Antigravity Kit
└── n8n/                        # (Futuro) Workflows organizados
    ├── templates/              # Templates reutilizáveis
    ├── integrations/           # Integrações específicas
    └── docs/                   # Documentação de cada workflow
```

---

## 🔧 Integrações Atuais

### Evolution API (WhatsApp)

O projeto já possui integração com a Evolution API para envio de mensagens WhatsApp.

**Workflow Existente**: `n8n_workflow.json`
- **Nome**: Disparador WhatsApp - Nexus
- **Trigger**: Webhook POST `/nexus`
- **Funcionalidades**:
  - Busca contatos no Google Sheets por tag
  - Loop de contatos com batches
  - Envio de mídia (imagens) via Evolution API
  - Envio de texto com variáveis personalizadas
  - Delay entre mensagens

**Endpoints Utilizados**:
```
POST /message/sendMedia/{instance}  → Envio de mídia
POST /message/sendText/{instance}   → Envio de texto
```

---

## 📚 Templates de Workflow

### Template Base para Webhook

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook-path",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "name": "Webhook Trigger"
    }
  ]
}
```

### Template para Integração com Supabase

```json
{
  "parameters": {
    "operation": "getAll",
    "tableId": "nome_da_tabela",
    "returnAll": true
  },
  "type": "n8n-nodes-base.supabase",
  "name": "Supabase Get Data"
}
```

---

## 🎯 Melhores Práticas

### 1. Nomenclatura

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| Workflow | `[Sistema] - [Ação]` | `Nexus - Disparo WhatsApp` |
| Webhook Path | `kebab-case` | `/nexus-campaign` |
| Node Names | Descritivo em PT-BR | `Buscar Contatos`, `Enviar Mensagem` |

### 2. Ordem de Desenvolvimento

```
1. Templates primeiro (2,709 disponíveis)
2. Discovery de nodes (se não houver template)
3. Configuração completa (NUNCA confiar em defaults)
4. Validação multi-nível
5. Deploy e teste
```

### 3. Validação Multi-Nível

| Nível | Comando | Quando Usar |
|-------|---------|-------------|
| 1 | `validate_node({mode: 'minimal'})` | Antes de construir |
| 2 | `validate_node({mode: 'full', profile: 'runtime'})` | Antes de construir |
| 3 | `validate_workflow(workflow)` | Após construir |
| 4 | `n8n_validate_workflow({id})` | Após deploy |

### 4. Tratamento de Erros

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.stopAndError",
      "parameters": {
        "errorMessage": "Descrição clara do erro"
      },
      "name": "Erro - [Descrição]"
    }
  ]
}
```

### 5. Batch Operations

✅ **CORRETO** - Múltiplas operações em uma chamada:
```json
n8n_update_partial_workflow({
  id: "wf-123",
  operations: [
    {type: "updateNode", nodeId: "slack-1", changes: {...}},
    {type: "updateNode", nodeId: "http-1", changes: {...}},
    {type: "cleanStaleConnections"}
  ]
})
```

❌ **INCORRETO** - Chamadas separadas:
```json
n8n_update_partial_workflow({id: "wf-123", operations: [{...}]})
n8n_update_partial_workflow({id: "wf-123", operations: [{...}]})
```

---

## ⚠️ Avisos Críticos

### NUNCA Confie em Defaults

❌ **FALHA em runtime**:
```json
{resource: "message", operation: "post", text: "Hello"}
```

✅ **FUNCIONA** - Todos os parâmetros explícitos:
```json
{resource: "message", operation: "post", select: "channel", channelId: "C123", text: "Hello"}
```

### IF Node Multi-Output Routing

Use o parâmetro `branch` para rotear corretamente:

```json
// Rota para branch TRUE
{type: "addConnection", source: "If Node", target: "True Handler", 
 sourcePort: "main", targetPort: "main", branch: "true"}

// Rota para branch FALSE
{type: "addConnection", source: "If Node", target: "False Handler", 
 sourcePort: "main", targetPort: "main", branch: "false"}
```

### Webhook Data Location

⚠️ **Dados de webhook estão em `$json.body`**, não em `$json` diretamente!

---

## 🌟 Top 20 Nodes Mais Populares

| # | Node | Uso |
|---|------|-----|
| 1 | `n8n-nodes-base.code` | JavaScript/Python scripting |
| 2 | `n8n-nodes-base.httpRequest` | HTTP API calls |
| 3 | `n8n-nodes-base.webhook` | Event-driven triggers |
| 4 | `n8n-nodes-base.set` | Data transformation |
| 5 | `n8n-nodes-base.if` | Conditional routing |
| 6 | `n8n-nodes-base.manualTrigger` | Manual execution |
| 7 | `n8n-nodes-base.respondToWebhook` | Webhook responses |
| 8 | `n8n-nodes-base.scheduleTrigger` | Time-based triggers |
| 9 | `@n8n/n8n-nodes-langchain.agent` | AI agents |
| 10 | `n8n-nodes-base.googleSheets` | Spreadsheet integration |
| 11 | `n8n-nodes-base.merge` | Data merging |
| 12 | `n8n-nodes-base.switch` | Multi-branch routing |
| 13 | `n8n-nodes-base.telegram` | Telegram bot |
| 14 | `@n8n/n8n-nodes-langchain.lmChatOpenAi` | OpenAI chat models |
| 15 | `n8n-nodes-base.splitInBatches` | Batch processing |
| 16 | `n8n-nodes-base.openAi` | OpenAI legacy |
| 17 | `n8n-nodes-base.gmail` | Email automation |
| 18 | `n8n-nodes-base.function` | Custom functions |
| 19 | `n8n-nodes-base.stickyNote` | Workflow documentation |
| 20 | `n8n-nodes-base.executeWorkflowTrigger` | Sub-workflow calls |

> **Nota**: LangChain nodes usam prefixo `@n8n/n8n-nodes-langchain.`, core nodes usam `n8n-nodes-base.`

---

## 🔗 Integrações Planejadas

| Integração | Status | Descrição |
|------------|--------|-----------|
| **Google Sheets** | ✅ Ativo | Sincronização de contatos |
| **Evolution API** | ✅ Ativo | WhatsApp messaging |
| **Supabase** | 🔄 Planejado | CRUD de dados |
| **Email (SMTP)** | 🔄 Planejado | Notificações |
| **Google Calendar** | 🔄 Planejado | Agendamentos |

---

## 📊 Workflows Documentados

| Workflow | Status | Descrição |
|----------|--------|-----------|
| Disparador WhatsApp | ✅ Ativo | Disparo de campanhas via webhook |
| Sync Contatos | 🔄 Planejado | Sincronização Google Sheets ↔ Supabase |
| Notificações | 🔄 Planejado | Alertas automáticos |
| Relatórios | 🔄 Planejado | Geração de reports |

---

## 🚦 Checklist de Qualidade

Antes de ativar um workflow, verificar:

- [ ] **Templates primeiro** - Verificou se existe template no n8n.io
- [ ] **Nomenclatura** - Nomes descritivos em português
- [ ] **Tratamento de Erros** - Nodes de erro configurados
- [ ] **Credenciais** - Usando credenciais do n8n (não hardcoded)
- [ ] **Parâmetros explícitos** - Todos os parâmetros configurados
- [ ] **Validação minimal** - `validate_node({mode: 'minimal'})`
- [ ] **Validação full** - `validate_node({mode: 'full'})`
- [ ] **Validação workflow** - `validate_workflow()`
- [ ] **Rate Limiting** - Delays entre requisições
- [ ] **Documentação** - Workflow documentado neste arquivo
- [ ] **Testes** - Testado com dados de exemplo

---

## 📝 Notas de Implementação

### Variáveis Suportadas no Disparo WhatsApp

| Variável | Descrição |
|----------|-----------|
| `{{nome}}` | Nome do contato |
| `{{empresa}}` | Nome da empresa |
| `{{telefone}}` | Telefone do contato |

### Colunas Esperadas no Google Sheets

| Coluna | Obrigatória | Descrição |
|--------|-------------|-----------|
| Nome | ✅ | Nome do contato |
| Telefone | ✅ | Número com DDD |
| Empresa | ❌ | Nome da empresa |
| Tags | ✅ | Tags separadas por vírgula |

---

## 🔮 Roadmap

### Fase 1 - Fundação (✅ Concluída)
- [x] Workflow básico de disparo WhatsApp
- [x] Documentação completa
- [x] Integração MCP Server (n8n-mcp instalado)
- [x] Skills n8n configuradas (7 skills em `.agent/skills/`)

### Fase 2 - Expansão
- [ ] Múltiplos canais (Email, SMS)
- [ ] Workflows de nurturing
- [ ] Automação de follow-up

### Fase 3 - Inteligência
- [ ] Segmentação automática com AI
- [ ] A/B Testing
- [ ] Analytics integrado

---

## 📞 Suporte

Para dúvidas sobre workflows n8n:
1. Consulte este documento
2. Use `tools_documentation()` para documentação de ferramentas
3. Verifique a documentação oficial: [docs.n8n.io](https://docs.n8n.io)
4. Use os comandos `/brainstorm` ou `/debug` do Antigravity Kit

---

*Última atualização: 02/02/2026*
