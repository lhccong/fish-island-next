import type { Page, WebSocketRoute } from '@playwright/test';
import { loadEnv } from 'vite';
export async function landlordsFixture(page: Page) {
  const base =
    loadEnv('development', process.cwd(), 'VITE_').VITE_API_BASE_URL?.trim() ||
    'https://api.yucoder.cn';
  await page.addInitScript(
    (base) =>
      sessionStorage.setItem(
        `fish-island-next.session:${encodeURIComponent(base.replace(/\/+$/, ''))}`,
        JSON.stringify({ name: 'test-session', value: 'synthetic-value' }),
      ),
    base,
  );
  await page.route('**/api/**', (r) => r.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/**', (r) =>
    r.fulfill({
      json: {
        code: 0,
        data: {
          id: '123',
          userName: '合成玩家',
          userRole: 'user',
          saTokenInfo: { tokenName: 'test-session', tokenValue: 'synthetic-value' },
        },
      },
    }),
  );
  const players = ['123', '456', '789'].map((userId, i) => ({
    userId,
    userName: `合成牌友${i + 1}`,
    role: i === 0 ? 'OWNER' : 'PLAYER',
    ready: false,
    online: true,
    robotControlled: false,
    cardCount: 17,
    currentPlayedCards: [] as string[],
  }));
  const hand = [
    '♠3',
    '♥3',
    '♣4',
    '♦4',
    '♠5',
    '♥5',
    '♣6',
    '♦6',
    '♠7',
    '♥8',
    '♣9',
    '♦10',
    '♠J',
    '♥Q',
    '♣K',
    '♦A',
    '♠2',
    's',
    'x',
    '♥A',
  ];
  const state = {
    fail: false,
    chatFail: false,
    connections: 0,
    commands: [] as string[],
    phase: 'waiting',
    hand,
    rooms: false,
    rankings: 0,
  };
  let socket: WebSocketRoute;
  let holdRooms = true;
  let pendingRooms: (() => void) | undefined;
  const emit = (type: string, data: unknown) => socket.send(JSON.stringify({ type, data }));
  const snapshot = () => ({
    roomId: 'synthetic-table',
    gameType: 'LANDLORDS_CLASSIC',
    ownerId: '123',
    phase: state.phase,
    players,
    handCards: state.phase === 'waiting' ? [] : state.hand,
    bottomCards: state.phase === 'playing' ? ['♠3', '♥3', '♣4'] : [],
  });
  const turn = (action: string) =>
    emit('gameTurnNotify', {
      phase: action === 'ROB' ? 'robbing' : 'playing',
      currentPlayerId: '123',
      action,
      canPass: true,
      actionOptions: [0, 1, 2, 3].map((value) => ({
        value,
        name: value ? `${value} 分` : '不叫',
        enabled: true,
      })),
      timeout: 30,
      startTime: Date.now(),
    });
  await page.route('**/api/ranking/**', async (r) => {
    state.rankings++;
    await r.fulfill({
      json: {
        code: 0,
        data: Array.from({ length: 50 }, (_, i) => ({
          userId: `synthetic-${i}`,
          rank: i + 1,
          userName: `合成榜单${i + 1}`,
          totalGames: 20,
          winRate: 55,
          totalScore: 30,
        })),
      },
    });
  });
  await page.routeWebSocket('**/ws/**', (ws) => {
    socket = ws;
    state.connections++;
    ws.onMessage((raw) => {
      const frame = JSON.parse(String(raw));
      if (frame.type !== 2 || typeof frame.data !== 'string') return;
      const command = JSON.parse(frame.data);
      const body = JSON.parse(command.content);
      state.commands.push(command.type);
      if (state.fail) {
        emit('error', '合成操作失败，请重试');
        return;
      }
      if (command.type === 'gameRoomList') {
        const respond = () =>
          emit('gameRoomList', {
            rooms: state.rooms ? [{ ...snapshot(), playerCount: 3, maxPlayers: 3 }] : [],
          });
        if (holdRooms) pendingRooms = respond;
        else respond();
        return;
      }
      if (command.type === 'gameCreateRoom' || command.type === 'gameJoinRoom') {
        state.rooms = true;
        emit('gameRoomState', {
          ...snapshot(),
          action: command.type === 'gameCreateRoom' ? 'CREATE' : 'JOIN',
          success: true,
        });
        return;
      }
      if (command.type === 'gameReady') {
        players.forEach((p) => (p.ready = true));
        emit('gameReady', snapshot());
        return;
      }
      if (command.type === 'gameStart') {
        state.phase = 'robbing';
        emit('gameStart', snapshot());
        turn('ROB');
        return;
      }
      if (command.type === 'gameRobLandlord') {
        state.phase = 'playing';
        emit('gameRobLandlord', { ...snapshot(), landlordId: '123' });
        turn('PLAY');
        return;
      }
      if (command.type === 'gamePlayCards') {
        state.hand = state.hand.filter((id) => !body.pokers.includes(id));
        players[0]!.currentPlayedCards = body.pokers;
        emit('gameActionResult', { event: 'PLAY_RESULT', playerId: '123', pokerIds: body.pokers });
        emit('gamePlayCards', snapshot());
        turn('PLAY');
        return;
      }
      if (command.type === 'gameSetRobot' || command.type === 'gameCancelRobot') {
        players[0]!.robotControlled = command.type === 'gameSetRobot';
        emit('gameActionResult', {
          event: players[0]!.robotControlled ? 'ROBOT_ENABLED' : 'ROBOT_DISABLED',
          playerId: '123',
        });
        emit(command.type, null);
        return;
      }
      if (command.type === 'gameChat') {
        if (state.chatFail) emit('error', '合成聊天失败');
        else {
          emit('gameChat', { userId: '123', userName: '合成牌友1', content: body.content });
          emit('gameChat', null);
        }
        return;
      }
      if (command.type === 'gameLeaveRoom') {
        emit('gameLeaveRoom', { tempLeaveRoomId: 'synthetic-table' });
        return;
      }
      emit(command.type, snapshot());
    });
  });
  return {
    state,
    players,
    emit,
    releaseRooms: () => {
      holdRooms = false;
      pendingRooms?.();
    },
    close: async () => {
      await socket?.close();
    },
    turn,
  };
}
