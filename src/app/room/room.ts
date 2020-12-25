/**
 * Room info
 */
export class Room {
  /**
   * Players in the room
   */
  players: number[];

  /**
   * Game is running
   */
  running: boolean;

  constructor() {
    this.players = [];
    this.running = false;
  }
}
