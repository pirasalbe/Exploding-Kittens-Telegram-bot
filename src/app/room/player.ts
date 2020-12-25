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

  constructor(id: number) {
    this.id = id;
    this.cards = [];
  }
}
