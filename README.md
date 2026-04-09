# Classroom Live (MVP) — Node.js + Vue 3 (Composition API) + WebSockets + WebRTC
**Current date:** 2026-04-09 20:19:04  
**Goal:** Projeto de portfólio (1 mês) de uma sala de aula ao vivo com **presença + chat + lousa em tempo real + transmissão de vídeo**.

Este README define:
- Estrutura do **monorepo** (`/server` e `/front`)
- **Regras de negócio** do MVP
- Contratos de **eventos WebSocket**
- Modelo de dados (em memória)
- Critérios de aceite + roadmap

> Nota: o MVP é pensado para ser executado localmente e deploy simples, sem banco de dados.

---

## 1) Escopo do MVP (o que precisa existir)

### Papéis (roles)
- **TEACHER** (professor): cria sala, controla lousa, transmite vídeo.
- **STUDENT** (aluno): entra para assistir, chat e ver lousa/vídeo.

### Funcionalidades obrigatórias
1) **Sala + Presença**
- Criar sala (teacher) e entrar na sala (teacher/student) via `roomCode`
- Lista de participantes online
- Eventos “entrou/saiu”
- Bloquear 2º professor na mesma sala (MVP)

2) **Chat em tempo real**
- Enviar/receber mensagens com autor, role e timestamp
- Buffer de histórico (últimas 50) para quem entrar depois
- Rate limit simples anti-spam

3) **Lousa em tempo real (teacher-only no MVP)**
- Professor desenha no canvas (strokes)
- Alunos apenas recebem e renderizam
- Sincronização do estado para quem entra depois (`board:sync`)
- Ações: adicionar stroke, limpar lousa, trocar página

4) **Vídeo ao vivo (teacher -> alunos)**
- Professor transmite áudio/vídeo via WebRTC
- Alunos assistem
- Sinalização (offer/answer/ICE) via WebSocket

### Fora do escopo do MVP (para caber em 1 mês)
- Autenticação real (OAuth, senha)
- Banco de dados (persistência)
- TURN server (produção real)
- SFU (mediasoup/janus) para escalar muitas pessoas
- Lousa colaborativa total (alunos desenhando livremente)

---

## 2) Estrutura do monorepo

```
/
  README.md
  package.json
  /server
    package.json
    tsconfig.json
    .env.example
    src/
      index.ts                     # bootstrap do HTTP + socket.io
      config.ts
      rooms/
        roomStore.ts               # estado em memória + operações
        roomTypes.ts
        roomRules.ts               # validações e regras
      socket/
        socketServer.ts            # cria io, CORS, middlewares
        socketEvents.ts            # nomes de eventos (const)
        socketHandlers.ts          # handlers principais
      chat/
        chatTypes.ts
        chatRules.ts
        chatHandlers.ts
      board/
        boardTypes.ts
        boardRules.ts
        boardHandlers.ts
      rtc/
        rtcTypes.ts
        rtcHandlers.ts
      utils/
        id.ts
        time.ts
        rateLimit.ts
        validate.ts
  /front
    package.json
    vite.config.ts
    .env.example
    src/
      main.ts
      router/
        index.ts
      pages/
        LandingPage.vue             # criar/entrar na sala
        RoomPage.vue                # sala principal
      components/
        RoomHeader.vue
        ParticipantsList.vue
        ChatPanel.vue
        BoardCanvas.vue
        VideoTeacher.vue            # teacher captura e envia
        VideoStudent.vue            # student recebe e mostra
      composables/
        useSocket.ts
        useRoom.ts
        useChat.ts
        useBoard.ts
        useRtc.ts
      types/
        events.ts                   # espelho dos eventos do server
        models.ts
      styles/
        base.css
```

> Dica: Depois, você pode criar um pacote `/shared` para tipos. No MVP, mantenha os tipos alinhados copiando.

---

## 3) Stack recomendada (MVP)

### Server
- Node.js + TypeScript
- WebSocket: **socket.io** (recomendado para rooms/reconnect)
- HTTP: express (ou fastify)
- Estado: em memória (RoomStore)
- CORS: liberando o front local

### Front
- Vue 3 + Composition API + Vite
- WebRTC nativo (RTCPeerConnection)
- UI simples (CSS) ou Tailwind (opcional)

---

## 4) Regras de negócio (MVP) — detalhadas

### 4.1 Rooms (sala) e presença
**Conceitos**
- `roomCode`: código curto (ex.: `AB12CD`)
- `teacherId`: `socket.id` do professor atual
- `participants`: lista de participantes online da sala

**Regras**
1. Criar sala
- Só `role=TEACHER` pode criar
- Cria `roomCode` e define `teacherId`
- Inicializa chat buffer e board state

2. Entrar na sala
- `roomCode` precisa existir
- `displayName`: obrigatório, 2..32 chars
- Se tentar entrar como TEACHER em sala já com teacher: negar com erro `ROOM_ALREADY_HAS_TEACHER`

3. Presença / eventos
- Ao entrar: broadcast `participant:joined`
- Ao sair / disconnect: broadcast `participant:left`
- Sempre que mudar: emitir `room:participants` com lista completa

4. Reconexão
- MVP: desconectou, saiu (sem reattach)
- (v2) reattach com token temporário

---

### 4.2 Chat
**Regras**
1. Só participantes da sala podem mandar mensagens
2. Rate limit (exemplo): máximo **5 mensagens / 3 segundos / socket**
3. Mensagem:
- mínimo 1 char, máximo 500 chars
- sanitizar (escape) no front e validar no server
4. Buffer:
- manter as últimas 50 mensagens por sala
- no `join`, enviar `chat:sync` com histórico

---

### 4.3 Board (lousa) — teacher-only no MVP
**Estado por sala**
- `currentPage: number`
- `pages: Map<number, { strokes: Stroke[] }>`
- `version: number` (incrementa a cada update)

**Stroke (traço)**
- `id: string`
- `color: string`
- `size: number`
- `tool: "pen"` (MVP; eraser pode ser v2)
- `points: Array<{ x: number, y: number, t?: number }>`
- `createdAt: string`
- `createdBy: string` (participantId)

**Regras**
1. Só TEACHER pode:
- `board:stroke:add`
- `board:clear`
- `board:page:set`

2. STUDENT
- recebe eventos e renderiza
- tentativa de desenhar deve falhar (erro e não broadcast)

3. Coordenadas normalizadas
- sempre enviar `x` e `y` em 0..1 (relativo ao canvas)
- o client converte para pixels ao renderizar

4. Sync de estado
- ao entrar na sala: server envia `board:sync` (página atual + strokes)
- quando mudar algo: incrementa `version` e emite update

5. Limites (performance)
- max `points` por stroke: 2000 (ou cortar)
- max strokes por página: 5000 (ou FIFO)
- rate limit de strokes por segundo

---

### 4.4 Vídeo (WebRTC) — teacher -> alunos
**Objetivo do MVP**
- Cada aluno estabelece uma conexão WebRTC com o professor
- Server só faz **sinalização** via WebSocket

**Regras**
1. Só TEACHER publica mídia
2. STUDENT só recebe
3. Fluxo (recomendado)
- student entra na sala
- student envia `rtc:watch:request`
- server encaminha para teacher (`rtc:watch:requested`)
- teacher cria RTCPeerConnection e envia `rtc:offer`
- student responde `rtc:answer`
- ambos trocam `rtc:ice` até conectar
4. Controle de mídia do teacher
- `micOn`, `camOn` (estado local)
- notificar sala via `rtc:teacher:media:state` para UI

**Limites**
- mesh teacher->many é limitado; documentar que SFU é “próximo passo”

---

## 5) Contratos de eventos (WebSocket / socket.io)

### 5.1 Client -> Server

#### Room
- `room:create`
  - payload: `{ displayName: string }`
- `room:join`
  - payload: `{ roomCode: string, displayName: string, role: "TEACHER" | "STUDENT" }`
- `room:leave`
  - payload: `{}`

#### Chat
- `chat:send`
  - payload: `{ roomCode: string, message: string }`

#### Board (teacher-only)
- `board:stroke:add`
  - payload: `{ roomCode: string, page: number, stroke: Stroke }`
- `board:clear`
  - payload: `{ roomCode: string, page: number }`
- `board:page:set`
  - payload: `{ roomCode: string, page: number }`

#### RTC (sinalização)
- `rtc:watch:request`
  - payload: `{ roomCode: string }`
- `rtc:offer`
  - payload: `{ roomCode: string, targetParticipantId: string, sdp: any }`
- `rtc:answer`
  - payload: `{ roomCode: string, targetParticipantId: string, sdp: any }`
- `rtc:ice`
  - payload: `{ roomCode: string, targetParticipantId: string, candidate: any }`

---

### 5.2 Server -> Client

#### Room / Presence
- `room:created`
  - payload: `{ roomCode: string }`
- `room:joined`
  - payload: `{ roomCode: string, self: Participant, room: RoomSummary }`
- `room:error`
  - payload: `{ code: string, message: string }`
- `room:participants`
  - payload: `{ roomCode: string, participants: Participant[] }`
- `participant:joined`
  - payload: `{ roomCode: string, participant: Participant }`
- `participant:left`
  - payload: `{ roomCode: string, participantId: string }`

#### Chat
- `chat:sync`
  - payload: `{ roomCode: string, messages: ChatMessage[] }`
- `chat:message`
  - payload: `{ roomCode: string, message: ChatMessage }`

#### Board
- `board:sync`
  - payload: `{ roomCode: string, currentPage: number, pages: Record<number, { strokes: Stroke[] }>, version: number }`
- `board:stroke:added`
  - payload: `{ roomCode: string, page: number, stroke: Stroke, version: number }`
- `board:cleared`
  - payload: `{ roomCode: string, page: number, version: number }`
- `board:page:changed`
  - payload: `{ roomCode: string, page: number, version: number }`

#### RTC
- `rtc:watch:requested`
  - payload: `{ roomCode: string, studentParticipantId: string }`   (server -> teacher)
- `rtc:offer`
  - payload: `{ roomCode: string, fromParticipantId: string, sdp: any }`
- `rtc:answer`
  - payload: `{ roomCode: string, fromParticipantId: string, sdp: any }`
- `rtc:ice`
  - payload: `{ roomCode: string, fromParticipantId: string, candidate: any }`
- `rtc:teacher:media:state`
  - payload: `{ roomCode: string, micOn: boolean, camOn: boolean, screenOn: boolean }`

---

## 6) Modelo de dados (server, em memória)

### Participant
- `id: string` (ex.: socket.id)
- `displayName: string`
- `role: "TEACHER" | "STUDENT"`
- `joinedAt: string` (ISO)

### ChatMessage
- `id: string`
- `roomCode: string`
- `authorId: string`
- `authorName: string`
- `authorRole: string`
- `text: string`
- `createdAt: string`

### Room
- `roomCode: string`
- `teacherId: string`
- `participants: Map<string, Participant>`
- `chatBuffer: ChatMessage[]` (max 50)
- `boardState: BoardState`

### BoardState
- `currentPage: number`
- `pages: Map<number, { strokes: Stroke[] }>`
- `version: number`

---

## 7) Critérios de aceite (Definition of Done)

### Sala
- [ ] Teacher cria sala e recebe `roomCode`
- [ ] Student entra com `roomCode` e aparece na lista
- [ ] Eventos de join/leave atualizam para todos
- [ ] Bloqueia 2º teacher na mesma sala

### Chat
- [ ] Mensagens chegam em tempo real
- [ ] Quem entra depois recebe `chat:sync` (últimas 50)
- [ ] Rate limit bloqueia flood

### Lousa (teacher-only)
- [ ] Teacher desenha e students veem em tempo real
- [ ] Quem entra depois recebe `board:sync`
- [ ] Clear e page change sincronizam
- [ ] Student não consegue enviar strokes (server valida)

### Vídeo (teacher -> students)
- [ ] Teacher inicia câmera/mic e student recebe stream
- [ ] Student entrando depois consegue assistir (request + signaling)
- [ ] Offer/answer/ice via WebSocket funcionam

---

## 8) UX sugerida (front)

### LandingPage
- Input: nome
- Ações:
  - “Criar sala (Professor)”
  - “Entrar (Aluno)” + input `roomCode`

### RoomPage
- Top: roomCode + botão copiar + status
- Left: participantes + controles do teacher
- Center: vídeo (principal)
- Right: chat
- Bottom/tab: lousa

---

## 9) Configuração (env) e execução (sugestão)

### server/.env.example
- `PORT=3001`
- `CORS_ORIGIN=http://localhost:5173`

### front/.env.example
- `VITE_SERVER_URL=http://localhost:3001`

---

## 10) Roadmap pós-MVP (v2)
- “Liberar caneta” para aluno X (colaboração controlada)
- Reattach em reconexão (token de sessão curto)
- Persistência (Redis/Postgres)
- TURN server + diagnósticos de rede
- SFU (mediasoup) para escala
- Exportar lousa para PNG/PDF

---

## 11) Ordem recomendada de implementação
1. Rooms/presença (server + front)
2. Chat (send/broadcast/sync)
3. Board (canvas local teacher + eventos + sync)
4. WebRTC signaling + vídeo teacher->student
5. Polimento (validações, rate limit, UI e deploy)