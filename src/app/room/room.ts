import { Mode } from '../game/game-factory';
import { Card } from './../game/card';
import { Player } from './player';

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
  players: Player[];

  /**
   * Room mode
   */
  mode: Mode;

  /**
   * Deck of cards
   */
  deck: Card[];

  /**
   * Index of the player that should play
   */
  playerTurn: number;

  /**
   * Game is running
   */
  running: boolean;

  constructor(id: number, mode: Mode) {
    this.id = id;
    this.players = [];
    this.playerTurn = 0;
    this.running = false;
    this.mode = mode;
  }
}
