import { Player } from './../room/player';

/**
 * Define a card
 */
export interface Card {
  type: CardType;
  description: CardDescription;
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
  TACOCAT = 'tacocat',
  CATTERMELON = 'cattermelon',
  HAIRY_POTATO_CAT = 'hairy_potato_cat',
  BEARD_CAT = 'beard_cat',
  RAINBOW_CAT = 'rainbow_cat',
  FERAL_CAT = 'feral',
}

export enum CardDescription {
  EXPLODING_KITTEN = '💣 Exploding Kitten 💣',
  DEFUSE = '✳️ Defuse ✳️',
  ATTACK = '⚡️ Attack ⚡️',
  SKIP = '🌀 Skip 🌀',
  SEE_FUTURE = '🔮 See the future 🔮',
  ALTER_FUTURE = '⚛️ Alter the future ⚛️',
  SHUFFLE = '🔀 Shuffle 🔀',
  DRAW_BOTTOM = '🔚 Draw from the bottom 🔚',
  FAVOR = '🙏 Favor 🙏',
  TACOCAT = '🌮 Tacocat 🌮',
  CATTERMELON = '🍉 Cattermelon 🍉',
  HAIRY_POTATO_CAT = '🥔 Hairy Potato Cat 🥔',
  BEARD_CAT = '🧔🏻 Beard Cat 🧔🏻',
  RAINBOW_CAT = '🌈 Rainbow Cat 🌈',
  FERAL_CAT = '🥸 Feral Cat 🥸',
}

export class CardFactory {
  /**
   * Description per type
   */
  static descriptions: Record<CardType, CardDescription> = {
    exploding_kitten: CardDescription.EXPLODING_KITTEN,
    defuse: CardDescription.DEFUSE,
    attack: CardDescription.ATTACK,
    skip: CardDescription.SKIP,
    see_future: CardDescription.SEE_FUTURE,
    alter_future: CardDescription.ALTER_FUTURE,
    shuffle: CardDescription.SHUFFLE,
    draw_bottom: CardDescription.DRAW_BOTTOM,
    favor: CardDescription.FAVOR,
    tacocat: CardDescription.TACOCAT,
    cattermelon: CardDescription.CATTERMELON,
    hairy_potato_cat: CardDescription.HAIRY_POTATO_CAT,
    beard_cat: CardDescription.BEARD_CAT,
    rainbow_cat: CardDescription.RAINBOW_CAT,
    feral: CardDescription.FERAL_CAT,
  };
}

export class ExplodingKittenCard implements Card {
  type: CardType = CardType.EXPLODING_KITTEN;
  description: CardDescription = CardDescription.EXPLODING_KITTEN;
}

export class DefuseCard implements Card {
  type: CardType = CardType.DEFUSE;
  description: CardDescription = CardDescription.DEFUSE;
}

export class AttackCard implements Card {
  type: CardType = CardType.ATTACK;
  description: CardDescription = CardDescription.ATTACK;

  /**
   * Turns to give
   */
  turns = 2;
}

export class SkipCard implements Card {
  type: CardType = CardType.SKIP;
  description: CardDescription = CardDescription.SKIP;
}

export class SeeFutureCard implements Card {
  type: CardType = CardType.SEE_FUTURE;
  description: CardDescription = CardDescription.SEE_FUTURE;

  /**
   * Cards to see
   */
  count = 3;
}

export class AlterFutureCard implements Card {
  type: CardType = CardType.ALTER_FUTURE;
  description: CardDescription = CardDescription.ALTER_FUTURE;

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
  description: CardDescription = CardDescription.SHUFFLE;
}

export class DrawBottomCard implements Card {
  type: CardType = CardType.DRAW_BOTTOM;
  description: CardDescription = CardDescription.DRAW_BOTTOM;
}

export abstract class OtherPlayerCard implements Card {
  type: CardType;
  description: CardDescription;

  /**
   * Other player
   */
  otherPlayer: Player;
}

export class FavorCard extends OtherPlayerCard {
  type: CardType = CardType.FAVOR;
  description: CardDescription = CardDescription.FAVOR;
}

export abstract class CatCard extends OtherPlayerCard {
  type: CardType;
  description: CardDescription;

  /**
   * Other cards used
   */
  otherCards = 0;

  /**
   * Other feral used
   */
  otherFeralCards = 0;

  /**
   * Action
   */
  action: 'steal' | 'request';
}

export class TacocatCard extends CatCard {
  type: CardType = CardType.TACOCAT;
  description: CardDescription = CardDescription.TACOCAT;
}

export class CattermelonCard extends CatCard {
  type: CardType = CardType.CATTERMELON;
  description: CardDescription = CardDescription.CATTERMELON;
}

export class HairyPotatoCatCard extends CatCard {
  type: CardType = CardType.HAIRY_POTATO_CAT;
  description: CardDescription = CardDescription.HAIRY_POTATO_CAT;
}

export class BeardCatCard extends CatCard {
  type: CardType = CardType.BEARD_CAT;
  description: CardDescription = CardDescription.BEARD_CAT;
}

export class RainbowCatCard extends CatCard {
  type: CardType = CardType.RAINBOW_CAT;
  description: CardDescription = CardDescription.RAINBOW_CAT;
}

export class FeralCatCard extends CatCard {
  type: CardType = CardType.FERAL_CAT;
  description: CardDescription = CardDescription.FERAL_CAT;
}
