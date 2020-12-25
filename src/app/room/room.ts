import { Mode } from './../factories/game-factory';

/**
 * Room info
 */
export class Room {
  /**
   * Identifier
   */
  id: number;

  /**
   * Players in the room
   */
  players: number[];

  /**
   * Room mode
   */
  mode: Mode;

  /**
   * Game is running
   */
  running: boolean;

  constructor(id: number, mode: Mode) {
    this.id = id;
    this.players = [];
    this.running = false;
    this.mode = mode;
  }
}
