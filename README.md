# Nyx

**Assistente de Desktop Híbrido: O poder da nuvem com a privacidade do local.**

O Nyx é um assistente de IA moderno que une modelos de IA locais (**Ollama**) e em nuvem (**Gemini**) em uma interface nativa fluida. Construído com a stack **Electron + React + Rust**, ele oferece baixa latência no processamento de áudio e uma experiência de overlay que não interrompe seu fluxo de trabalho.

## Demo

![Demo Nyx AI Assistant - Assistente de Reunião em Tempo Real e Transcrição](assets/nyx-meeting-assistant-demo.gif)

Este exemplo mostra o app de verdade, transcrevendo áudio em tempo real:

- Transcrição em tempo real enquanto a conversa acontece
- Entendimento contínuo do contexto, mesmo com vários participantes falando
- Análise de prints dos slides compartilhados
- Sugestões imediatas do que dizer em seguida
- Perguntas de acompanhamento e respostas diretas e objetivas
- Tudo ao vivo, sem precisar gravar ou fazer qualquer processamento depois

### Download Nyx

_The privacy-first AI assistant for meetings._

[![Download for Windows](https://img.shields.io/badge/Download_for-Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/GabrielSantos23/nyx/releases/latest)

## Como funciona?

- **IA Híbrida**: Escolha entre privacidade total com **Llama 3/Mistral** via Ollama ou raciocínio com **Google Gemini**.
- **Transcrição de Áudio em Rust e em tempo real** : Captura de áudio de alta performance via módulo nativo (`nyx-audio`) para garantir que o sistema não trave.
- **Overlay UI**: Pressione um atalho e acesse a janela flutuante (`/overlay`) instantaneamente sobre qualquer app.
- **Arquitetura separada**: Backend Node.js isolado para gerenciar WebSockets e chaves de API, mantendo o processo do Electron leve e seguro.

## Transcrição em Tempo Real (Speech-to-Text)

O sistema de transcrição foi feito para ter **baixa latência** e **máxima segurança**. Diferente de implementações simples que rodam no frontend, esse app usa uma arquitetura de três camadas:

1.  **Captura Nativa (Rust)**: O módulo `nyx-audio` acessa diretamente o driver de áudio do sistema (WASAPI no Windows) para capturar o som do microfone sem gargalos de performance.
2.  **Streaming de audio**: O áudio é enviado via WebSocket para um **Backend Local (Node.js)** isolado.
3.  **Processamento Nuvem**: O backend gerencia as credenciais do **Google Cloud Speech-to-Text** e realiza o streaming para obter a transcrição em tempo real.

para que as **chaves de API nunca sejam expostas** no frontend e que o processamento pesado de áudio não trave a interface do usuário.

## Stack

- **Frontend**: React (Vite), TailwindCSS, Framer Motion.
- **Shell**: Electron (IPC para comunicação).
- **Core Nativo**: Rust (captura de áudio).
- **Database**: SQLite (`better-sqlite3`) para banco de dados local.

---

## Atalhos de Teclado (Keybindings)

O app tem como ser controlado por atalhos de teclado.

### Gerais

| Ação                      |   Atalho (Win/Linux)    |  Atalho (Mac)   |
| :------------------------ | :---------------------: | :-------------: |
| **Alternar Visibilidade** |       `Ctrl + B`        |     `⌘ + B`     |
| **Mostrar/Centralizar**   | `Ctrl + Shift + Espaço` | `⌘ + ⇧ + Space` |
| **Processar Screenshot**  |     `Ctrl + Enter`      |   `⌘ + Enter`   |
| **Resetar / Cancelar**    |       `Ctrl + R`        |     `⌘ + R`     |
| **Tirar Screenshot**      |       `Ctrl + H`        |     `⌘ + H`     |
| **Screenshot Seletivo**   |   `Ctrl + Shift + H`    |   `⌘ + ⇧ + H`   |

### Movimentação da Janela

| Ação                    |   Atalho   |
| :---------------------- | :--------: |
| **Mover para Cima**     | `Ctrl + ↑` |
| **Mover para Baixo**    | `Ctrl + ↓` |
| **Mover para Esquerda** | `Ctrl + ←` |
| **Mover para Direita**  | `Ctrl + →` |

---

## Começando

### Pré-requisitos

- **Node.js** v20+
- **Rust/Cargo** (para o módulo nativo)
- **Ollama** rodando localmente (opcional, para modelos locais)
- **Google Cloud SDK** (credenciais para Speech-to-Text)

### Instalação rápida

1. **Clone e instale as dependências base:**

```bash
git clone https://github.com/GabrielSantos23/nyx.git
cd nyx && npm install

```

2. **Configure o Backend (Serviços de API):**

```bash
cd backend && npm install

```

3. **Compile o módulo de áudio (Rust):**

```bash
cd ../native-module
cargo build --release

```

### Configuração de Credenciais

O app usa o padrão do Google Cloud para voz.

1. Pegue o JSON de Service Account no Google Cloud Console.
2. Salve na pasta `/backend` com o nome seguindo o mesmo padrão `gen-lang-client-*.json`.
3. O `server.js` identifica o arquivo automaticamente na próxima inicialização.

---

## 💻 Desenvolvimento

Para subir o ambiente completo (Vite + Electron + Backend Server):

```bash
npm run app:dev

```

### Estrutura de Pastas

- `/electron`: janelas e funcoes do aplicativo.
- `/src`: UI em React e estilo.
- `/backend`: Proxy para APIs externas e WebSockets.
- `/native-module`: Rust para captura de audio.

## 📦 Build

Para gerar o .exe de produção:

```bash
npm run app:build

```

---
