import { Telegram } from 'telegraf';

import { UserService } from '../user/user-service';
import { GameFactory } from './../factories/game-factory';
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
      room.players.push(id);
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
    }

    // TODO logic

    return room.running;
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
      this.userService.setRoom(player);
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
      const playerIndex = room.players.findIndex((p: number) => p === id);
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
      this.telegram.sendMessage(player, message);
    }
  }
}
