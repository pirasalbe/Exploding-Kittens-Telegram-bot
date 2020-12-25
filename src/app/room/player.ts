import { Card } from './../game/card';

/**
 * Player
 */
export class Player {
  /**
   * User id
   */
  id: number;

  /**
   * Player cards
   */
  cards: Card[];

  /**
   * Player is alive and can play
   */
  alive: boolean;

  constructor(id: number) {
    this.id = id;
    this.cards = [];
    this.alive = true;
  }
}
