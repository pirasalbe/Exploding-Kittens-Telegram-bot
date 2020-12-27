import { Player } from './../room/player';

/**
 * Define a card
 */
export interface Card {
  type: CardType;
  description: string;
}

/**
 * Card allowed type
 */
export enum CardType {
  EXPLODING_KITTEN = 'exploding_kitten',
  DEFUSE = 'defuse',
  ATTACK = 'attack',
  SKIP = 'skip',
  SEE_FUTURE = 'see_future',
  ALTER_FUTURE = 'alter_future',
  SHUFFLE = 'shuffle',
  DRAW_BOTTOM = 'draw_bottom',
  FAVOR = 'favor',
  CAT = 'steal',
}

export class ExplodingKittenCard implements Card {
  type: CardType = CardType.EXPLODING_KITTEN;
  description = '💣 Exploding Kitten 💣';
}

export class DefuseCard implements Card {
  type: CardType = CardType.DEFUSE;
  description = '✳️ Defuse ✳️';
}

export class AttackCard implements Card {
  type: CardType = CardType.ATTACK;
  description = '⚡️ Attack ⚡️';

  /**
   * Turns to give
   */
  turns = 2;
}

export class SkipCard implements Card {
  type: CardType = CardType.SKIP;
  description = '🌀 Skip 🌀';
}

export class SeeFutureCard implements Card {
  type: CardType = CardType.SEE_FUTURE;
  description = '🔮 See the future 🔮';

  /**
   * Cards to see
   */
  count = 3;
}

export class AlterFutureCard implements Card {
  type: CardType = CardType.ALTER_FUTURE;
  description = '⚛️ Alter the future ⚛️';

  /**
   * Cards to alter
   */
  count = 3;

  /**
   * New order
   */
  cards: { position: number; card: Card }[] = [];
}

export class ShuffleCard implements Card {
  type: CardType = CardType.SHUFFLE;
  description = '🔀 Shuffle 🔀';
}

export class DrawBottomCard implements Card {
  type: CardType = CardType.DRAW_BOTTOM;
  description = '🔚 Draw from the bottom 🔚';
}

export class FavorCard implements Card {
  type: CardType = CardType.FAVOR;
  description = '🙏 Favor 🙏';

  /**
   * Player who will do the favor
   */
  otherPlayer: Player;
}

export class CatCard implements Card {
  type: CardType = CardType.CAT;
  description = '🥷 Steal 🥷';

  /**
   * Player to steal
   */
  otherPlayer: Player;
}
