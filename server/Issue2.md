## Contexto

O MVP será em memória. Precisamos de um store para salas e participantes.

## O que fazer

- Implementar `RoomStore` com:
  - criar sala
  - buscar sala por roomCode
  - adicionar/remover participante
- Tipos:
  - `Room`
  - `Participant`
- Helper para gerar `roomCode` (curto) e validar entradas

## Critérios de aceite

- É possível criar e consultar uma sala via funções do store
- Estrutura pronta para receber chat/board depois

## Checklist

- [ ] Tipos `Room` e `Participant`
- [ ] `createRoom()` gera roomCode
- [ ] `getRoom(roomCode)` funciona
- [ ] `addParticipant/removeParticipant` funciona
