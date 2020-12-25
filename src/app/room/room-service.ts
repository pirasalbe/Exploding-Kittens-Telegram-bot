import { UserService } from '../user/user-service';
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
   */
  hostGame(id: number): void {
    let created = false;

    // look for the first empty room
    for (let i = 0; !created; i++) {
      if (!this.rooms[i]) {
        this.rooms[i] = new Room();

        // add user to the room
        this.joinGame(id, i);

        created = true;
      }
    }
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
  joinGame(id: number, code: number): boolean {
    let found = false;

    // join room if exists
    const room: Room = this.getRoom(code);
    if (room && !room.running) {
      room.players.push(id);
      this.userService.setRoom(id, code);
      found = true;
    }

    return found;
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
    const playerIndex = room.players.findIndex((p: number) => p === id);
    room.players.splice(playerIndex, 1);

    // TODO handle game logic
  }
}
