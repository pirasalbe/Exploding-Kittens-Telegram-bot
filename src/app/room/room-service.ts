import { Markup, Telegram } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/markup';

import { GameFactory } from '../game/game-factory';
import { UserService } from '../user/user-service';
import { BotAction } from './../bot-action.enum';
import { DefuseCard } from './../game/card';
import { GameUtils } from './../game/game-utils';
import { Player } from './player';
import { Room } from './room';

/**
 * Handle room logic
 */
export class RoomService {
  /**
   * Singleton
   */
  private static instance: RoomService = null;

  /**
   * User service
   */
  private userService: UserService = UserService.getInstance();

  /**
   * Online rooms
   */
  private rooms: Record<number, Room> = {};

  /**
   * Telegram instance
   */
  private telegram = new Telegram(process.env.BOT_TOKEN);

  private constructor() {}

  /**
   * Get the instance
   */
  static getInstance(): RoomService {
    if (RoomService.instance == null) {
      RoomService.instance = new RoomService();
    }

    return RoomService.instance;
  }

  /**
   * Host a new game
   * @param id Player id
   * @param mode Mode id
   */
  hostGame(id: number, mode: string): Room {
    let room: Room;

    while (!room) {
      const i = this.getRandomNumber();
      // look for a new room
      if (!this.rooms[i]) {
        this.rooms[i] = new Room(i, GameFactory.getMode(mode));

        // add user to the room
        room = this.joinGame(id, i);
      }
    }

    return room;
  }

  /**
   * Generate a random room number
   */
  private getRandomNumber(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  /**
   * Gets a room
   * @param code Room code
   */
  private getRoom(code: number): Room {
    return this.rooms[code];
  }

  /**
   * Join a game
   * @param id Player id
   * @param code Room number
   */
  joinGame(id: number, code: number): Room {
    const room: Room = this.getRoom(code);
    if (room && !room.running && room.players.length < room.mode.maxPlayers) {
      // add user
      room.players.push(new Player(id));
      this.userService.setRoom(id, code);

      // notify players
      const username = this.userService.getUsername(id);
      this.notifyRoom(
        code,
        username +
          ' joined the room. [' +
          room.players.length +
          '/' +
          room.mode.maxPlayers +
          '] players.'
      );
    }

    return room;
  }

  /**
   * Start the game in a room
   * @param id Player id
   */
  startGame(id: number): boolean {
    // get room
    const code: number = this.userService.getRoom(id);
    const room: Room = this.getRoom(code);

    if (room.players.length > 1) {
      room.running = true;

      // prepare deck
      room.deck = GameUtils.shuffle(room.mode.getCards(room.players.length));

      // give cards to each player
      for (const player of room.players) {
        player.cards.push(new DefuseCard());
        for (let i = 0; i < 4; i++) {
          player.cards.push(room.deck.pop());
        }
      }

      // add exploding and defuse
      room.deck = GameUtils.shuffle(
        room.deck.concat(room.mode.getMissingCards(room.players.length))
      );

      // start turn
      this.sendCards(code);
    }

    return room.running;
  }

  /**
   * Send cards to a player
   * @param code Room code
   */
  sendCards(code: number): void {
    // get room
    const room: Room = this.getRoom(code);

    // get active player
    const player: Player = room.players[room.playerTurn];

    this.notifyRoom(
      code,
      'It is ' + this.userService.getUsername(player.id) + ' turn'
    );

    // send cards info
    const buttons: InlineKeyboardButton[][] = [
      [Markup.callbackButton('Draw', BotAction.DRAW)],
    ];
    for (const card of player.cards) {
      buttons.push([Markup.callbackButton(card.description, card.type)]);
    }

    this.telegram.sendMessage(
      player.id,
      'Choose a card',
      Markup.inlineKeyboard(buttons).extra()
    );
  }

  /**
   * Stop a game
   * @param id Player id
   */
  stopGame(id: number): void {
    // get room
    const code: number = this.userService.getRoom(id);
    const room: Room = this.getRoom(code);

    if (room) {
      // notify users
      this.notifyRoom(code, 'Game ended by host');

      // destroy room
      this.destroyRoom(code);
    }
  }

  /**
   * Destroy the room
   * @param code Room code
   */
  private destroyRoom(code: number): void {
    const room: Room = this.getRoom(code);

    // remove all players
    for (const player of room.players) {
      this.userService.setRoom(player.id);
    }

    // destroy room
    delete this.rooms[code];
  }

  /**
   * Exit a game
   * @param id Player id
   */
  exitGame(id: number): void {
    // reset user room
    const code = this.userService.getRoom(id);
    this.userService.setRoom(id);

    // remove user from room
    const room = this.getRoom(code);
    if (room) {
      const playerIndex = room.players.findIndex((p: Player) => p.id === id);
      room.players.splice(playerIndex, 1);

      // notify players
      const username = this.userService.getUsername(id);
      this.notifyRoom(
        code,
        username +
          ' disconnected. [' +
          room.players.length +
          '/' +
          room.mode.maxPlayers +
          '] players.'
      );

      // if there are no more players
      if (room.players.length === 0) {
        this.destroyRoom(code);
      }

      // TODO handle game logic
    }
  }

  /**
   * Send a message to all users
   * @param code Room code
   * @param message Message to send
   */
  private notifyRoom(code: number, message: string): void {
    const room: Room = this.getRoom(code);
    for (const player of room.players) {
      this.telegram.sendMessage(player.id, message);
    }
  }
}
