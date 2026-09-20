---
name: ado-work-items
description: "Use when you need to create, load, or report a fixed Azure DevOps backlog with Features and User Stories through whatever Azure DevOps MCP tools are available in the current environment."
argument-hint: "Confirm the fixed backlog to load or describe the Azure DevOps backlog work to execute."
---

# ado-work-items

Load and create a fixed Azure DevOps backlog using the available Azure DevOps MCP tools.

## Workflow

1. List the available Azure DevOps MCP tools first and map which ones fit the current environment.
2. Show the proposed plan to the user and wait for approval before creating anything.
3. Create Features first.
4. Create User Stories as children of the corresponding Feature.
5. Do not delete or close any work items.
6. At the end, report the created work item IDs in a table with columns for ID, title, type, and parent.
7. If a tool cannot be found or the available MCP surface differs, stop and explain the mismatch before proceeding.

## Backlog

### Feature 1 - Análisis de mensajes de texto
- Como usuario quiero ingresar un mensaje de texto para analizarlo y conocer si presenta indicios de fraude o engaño.
- Como usuario quiero ejecutar el análisis del mensaje.
- Como usuario quiero ver un resumen del análisis realizado.

### Feature 2 - Nivel de riesgo e indicadores
- Como usuario quiero conocer el nivel de riesgo o sospecha del mensaje.
- Como usuario quiero conocer los indicadores detectados en el mensaje.
- Como usuario quiero entender por qué el mensaje recibió ese nivel de riesgo.
- Como usuario quiero diferenciar entre indicios y hechos comprobados.

## Rules
- Never hardcode Azure DevOps MCP tool names; always list the available tools and use the ones that fit.
- Do not create, update, delete, or close work items without explicit user approval on the proposed plan.
- Keep the hierarchy strict: Features first, then child User Stories.
- Preserve the backlog wording and scope unless the user asks to change it.
- Return a final table with work item IDs, titles, and parent relationships.
- Use the fixed backlog exactly as written unless the user explicitly asks for changes.
