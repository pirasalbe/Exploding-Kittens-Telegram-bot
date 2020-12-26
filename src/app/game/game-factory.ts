import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/markup';

import {
  AlterFutureCard,
  AttackCard,
  Card,
  CatCard,
  DefuseCard,
  DrawBottomCard,
  ExplodingKittenCard,
  FavorCard,
  SeeFutureCard,
  ShuffleCard,
  SkipCard,
} from './card';

/**
 * Mode interface
 */
export abstract class Mode {
  /**
   * Mode description
   */
  description: string;

  /**
   * Allowed players
   */
  maxPlayers: number;

  /**
   * Get mode cards
   * @param players Number of players
   */
  abstract getCards(players: number): Card[];

  /**
   * Get exploding kittens and defuse
   * @param players Number of players
   */
  getMissingCards(players: number): Card[] {
    const cards: Card[] = [];

    this.pushCards(cards, new ExplodingKittenCard(), players - 1);
    this.pushCards(cards, new DefuseCard(), players / 2);

    return cards;
  }

  /**
   * Push cards in an array
   * @param cards Array
   * @param card Card to push
   * @param times Times to push
   */
  protected pushCards(cards: Card[], card: Card, times: number): void {
    for (let i = 0; i < times; i++) {
      cards.push(card);
    }
  }
}

/**
 * Party mode
 */
class PartyMode extends Mode {
  description = 'Party pack, up to 10 players';

  maxPlayers = 10;

  getCards(players: number): Card[] {
    const cards: Card[] = [];

    if (players < 4) {
      this.pushCards(cards, new AttackCard(), 4);
      this.pushCards(cards, new SkipCard(), 4);
      this.pushCards(cards, new SeeFutureCard(), 3);
      this.pushCards(cards, new AlterFutureCard(), 2);
      this.pushCards(cards, new ShuffleCard(), 2);
      this.pushCards(cards, new DrawBottomCard(), 3);
      this.pushCards(cards, new FavorCard(), 2);
      this.pushCards(cards, new CatCard(), 5);
    } else if (players < 8) {
      this.pushCards(cards, new AttackCard(), 7);
      this.pushCards(cards, new SkipCard(), 6);
      this.pushCards(cards, new SeeFutureCard(), 3);
      this.pushCards(cards, new AlterFutureCard(), 4);
      this.pushCards(cards, new ShuffleCard(), 4);
      this.pushCards(cards, new DrawBottomCard(), 4);
      this.pushCards(cards, new FavorCard(), 4);
      this.pushCards(cards, new CatCard(), 10);
    } else {
      this.pushCards(cards, new AttackCard(), 11);
      this.pushCards(cards, new SkipCard(), 10);
      this.pushCards(cards, new SeeFutureCard(), 6);
      this.pushCards(cards, new AlterFutureCard(), 6);
      this.pushCards(cards, new ShuffleCard(), 6);
      this.pushCards(cards, new DrawBottomCard(), 7);
      this.pushCards(cards, new FavorCard(), 6);
      this.pushCards(cards, new CatCard(), 15);
    }

    return cards;
  }
}

/**
 * Create a game
 */
export class GameFactory {
  /**
   * Game modes
   */
  private static modes: Record<string, Mode> = {
    /**
     * Party pack
     */
    party: new PartyMode(),
  };

  /**
   * Gets a mode
   * @param id Mode id
   */
  static getMode(id: string): Mode {
    return this.modes[id];
  }

  /**
   * Gets all available modes as buttons
   */
  static getModesButtons(): InlineKeyboardButton[] {
    const response: InlineKeyboardButton[] = [];

    // create a list of modes
    for (const mode of Object.keys(GameFactory.modes)) {
      response.push(
        Markup.callbackButton(GameFactory.modes[mode].description, mode)
      );
    }

    return response;
  }

  /**
   * Gets all available modes as actions
   */
  static getModesActions(): string[] {
    const response: string[] = [];

    // create a list of modes
    for (const mode of Object.keys(GameFactory.modes)) {
      response.push(mode);
    }

    return response;
  }
}
