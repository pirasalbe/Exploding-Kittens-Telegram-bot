import { Markup, Telegram } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/markup';

import { GameFactory } from '../game/game-factory';
import { UserService } from '../user/user-service';
import { BotAction } from './../bot-action.enum';
import { AttackCard, Card, CardType, DefuseCard, ExplodingKittenCard, SeeFutureCard } from './../game/card';
import { GameUtils } from './../game/game-utils';
import { Player } from './player';
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
      room.players.push(new Player(id));
      this.userService.setRoom(id, code);

      // notify players
      this.notifyRoom(
        code,
        'joined the room. [' +
          room.players.length +
          '/' +
          room.mode.maxPlayers +
          '] players.',
        id
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

      this.notifyRoom(
        code,
        'Game started. [' +
          room.players.length +
          '/' +
          room.mode.maxPlayers +
          '] players.'
      );

      // prepare deck
      room.deck = GameUtils.shuffle(room.mode.getCards(room.players.length));

      // give cards to each player
      for (const player of room.players) {
        player.cards.push(new DefuseCard());
        for (let i = 0; i < 4; i++) {
          player.cards.push(room.deck.pop());
        }
      }

      // send card
      this.sendCards(code);

      // add exploding and defuse
      room.deck = GameUtils.shuffle(
        room.deck.concat(room.mode.getMissingCards(room.players.length))
      );

      // start turn
      this.sendCardsButtons(code);
    }

    return room.running;
  }

  /**
   * Send cards to every player or the specified one
   * @param code Room code
   * @param id Specific user id
   */
  sendCards(code: number, id: number = -1): void {
    // get room
    const room: Room = this.getRoom(code);

    for (const player of room.players) {
      if (id === player.id || id === -1) {
        let message =
          // tslint:disable-next-line:quotemark
          player.cards.length > 0 ? 'You have:\n' : "You don't have cards";
        for (const card of player.cards) {
          message += card.description + '\n';
        }

        this.telegram.sendMessage(player.id, message);
      }
    }
  }

  /**
   * Draw action
   * @param id User id
   * @param top Draw from top
   */
  drawCard(id: number, top: boolean = true): void {
    // get room
    const code: number = this.userService.getRoom(id);
    const room: Room = this.getRoom(code);

    // game ended
    if (!room) {
      this.sendStartSuggestion(id);
      return;
    }

    // get current player
    const player: Player = room.players[room.currentPlayer];
    const card: Card = top ? room.deck.pop() : room.deck.splice(0, 1)[0];
    player.cards.push(card);

    this.telegram.sendMessage(player.id, 'You drew ' + card.description);

    // exploding kittens
    if (card instanceof ExplodingKittenCard) {
      this.notifyRoom(code, 'drew an ' + card.description, id);
      // if has defuse ask to play it
      if (player.cards.find((c: Card) => c instanceof DefuseCard)) {
        this.telegram.sendMessage(
          id,
          'Do you want to defuse it?',
          Markup.inlineKeyboard([
            Markup.callbackButton('Yes', BotAction.DEFUSE_KITTEN),
            Markup.callbackButton('No', BotAction.EXPLODE),
          ])
            .oneTime()
            .extra()
        );
      } else {
        // else explode
        this.playCard(id, CardType.EXPLODING_KITTEN);
      }
    } else {
      // add card to player's deck
      this.sendCards(code, id);
      // number of cards
      this.notifyRoom(
        code,
        'drew a card. ' + room.deck.length + ' cards left in the deck',
        id
      );

      this.nextPlayer(code);
    }
  }

  /**
   * Ask the user to start again
   * @param id User id
   */
  private sendStartSuggestion(id: number): void {
    this.telegram.sendMessage(id, 'Send /start to begin.');
  }

  /**
   * Play user card
   * @param id User id
   * @param cardType Card to play
   */
  playCard(id: number, cardType: string): void {
    // get room
    const code: number = this.userService.getRoom(id);
    const room: Room = this.getRoom(code);

    // game ended
    if (!room) {
      this.sendStartSuggestion(id);
      return;
    }

    const player: Player = room.players[room.currentPlayer];

    // get played card
    const cardIndex = player.cards.findIndex((c: Card) => c.type === cardType);

    // player doesn't have the card
    if (cardIndex === -1) {
      this.telegram.sendMessage(id, 'Card not found');
      this.sendCardsButtons(code);
      return;
    }

    const card: Card = player.cards.splice(cardIndex, 1)[0];

    // card logic
    switch (cardType) {
      case CardType.EXPLODING_KITTEN:
        // explode
        this.notifyRoom(code, 'has exploded', id);
        player.alive = false;
        player.cards = [];
        if (!this.checkEndGame(code)) {
          this.nextPlayer(code);
        }
        break;
      case CardType.DEFUSE:
        const explodingIndex: number = player.cards.findIndex(
          (c: Card) => c instanceof ExplodingKittenCard
        );
        // only if player has an exploding
        if (explodingIndex > -1) {
          player.cards.splice(explodingIndex, 1);
          this.notifyRoom(code, 'played a ' + card.description, id);
          this.nextPlayer(code);
        } else {
          // else send cards buttons
          player.cards.push(card);
          // tslint:disable-next-line:quotemark
          this.telegram.sendMessage(id, "You can't use this card");
          this.sendCardsButtons(code);
        }
        break;
      case CardType.ATTACK:
        this.notifyRoom(code, 'played an ' + card.description, id);

        const attackCard: AttackCard = card as AttackCard;

        this.nextPlayer(code, attackCard.turns);
        break;
      case CardType.SKIP:
        this.notifyRoom(code, 'played a ' + card.description, id);
        this.nextPlayer(code);
        break;
      case CardType.SEE_FUTURE:
        this.notifyRoom(code, 'played a ' + card.description, id);

        const seeFutureCard: SeeFutureCard = card as SeeFutureCard;

        // see cards
        let e = room.deck.length - 1;
        for (let i = 0; i < seeFutureCard.count && e > 0; i++) {
          this.telegram.sendMessage(
            id,
            'Card ' + (e + 1) + ' is ' + room.deck[e].description
          );
          e--;
        }

        this.sendCardsButtons(code);
        break;
      case CardType.ALTER_FUTURE:
        // TODO
        break;
      case CardType.SHUFFLE:
        this.notifyRoom(code, 'played a ' + card.description, id);
        // shuffle deck
        room.deck = GameUtils.shuffle(room.deck);

        this.sendCardsButtons(code);
        break;
      case CardType.DRAW_BOTTOM:
        this.notifyRoom(code, 'played a ' + card.description, id);
        this.drawCard(id, false);
        break;
      case CardType.FAVOR:
        // TODO
        break;
      case CardType.CAT:
        // TODO
        break;
      default:
        console.log('Card not recognized', cardType);
        break;
    }
  }

  /**
   * Check if game has ended and a player has won
   * @param code Room code
   */
  private checkEndGame(code: number): boolean {
    // get room
    const room: Room = this.getRoom(code);

    let end = false;
    let alive = 0;

    // count player alive
    for (let i = 0; i < room.players.length && !end; i++) {
      if (room.players[i].alive) {
        alive++;
      }
      // check if game has finished
      end = alive < 2;
    }

    // TODO ask to start again
    if (end) {
    }

    return end;
  }

  /**
   * Send cards to let a player play
   * @param code Room code
   */
  sendCardsButtons(code: number): void {
    // get room
    const room: Room = this.getRoom(code);

    // get active player
    const player: Player = room.players[room.currentPlayer];

    this.notifyRoom(
      code,
      'turn. ' + room.turns + ' turn' + (room.turns > 1 ? 's' : '') + ' left.',
      player.id
    );

    // send cards info
    const buttons: InlineKeyboardButton[][] = [
      [Markup.callbackButton('Draw', BotAction.DRAW)],
    ];
    for (const card of player.cards) {
      buttons.push([Markup.callbackButton(card.description, card.type)]);
    }

    this.telegram.sendMessage(
      player.id,
      'Choose a card',
      Markup.inlineKeyboard(buttons).oneTime().extra()
    );
  }

  /**
   * End current player turn
   * @param code Room code
   * @param turns Turns that the player has to play
   */
  nextPlayer(code: number, turns: number = 1): void {
    // get room
    const room: Room = this.getRoom(code);
    room.turns--;

    // player ended his turns or he's attacking
    if (room.turns === 0 || turns > 1) {
      let alive = false;
      // find next player alive
      while (!alive) {
        if (room.currentPlayer < room.players.length - 1) {
          room.currentPlayer++;
        } else {
          room.currentPlayer = 0;
        }

        alive = room.players[room.currentPlayer].alive;
      }

      // se sono stati impostati dei turni
      room.turns += turns;
    }

    // send cards button
    this.sendCardsButtons(code);
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
      this.userService.setRoom(player.id);
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
      const playerIndex = room.players.findIndex((p: Player) => p.id === id);
      room.players.splice(playerIndex, 1);

      let message =
        'disconnected. [' +
        room.players.length +
        '/' +
        room.mode.maxPlayers +
        '] players.';

      // remove exploding kitten
      if (room.deck.length > 0) {
        const explodingIndex: number = room.deck.findIndex(
          (c: Card) => c instanceof ExplodingKittenCard
        );
        // only if player has an exploding
        if (explodingIndex > -1) {
          const card: Card = room.deck.splice(explodingIndex, 1)[0];
          message += ' Removed an ' + card.description;
        }
      }

      // notify players
      this.notifyRoom(code, message, id);

      // if there are no more players
      if (room.players.length === 0) {
        this.destroyRoom(code);
      }

      // check if last player alive
      this.checkEndGame(code);

      // next player if he was the current player
      if (room.currentPlayer === playerIndex) {
        room.currentPlayer--;
        this.nextPlayer(code);
      }
    }
  }

  /**
   * Send a message to all users
   * @param code Room code
   * @param message Message to send
   * @param userId Username to add at the beginnig of the message
   */
  private notifyRoom(code: number, message: string, userId: number = -1): void {
    const room: Room = this.getRoom(code);

    // add username
    if (userId !== -1) {
      message = this.userService.getUsername(userId) + ' ' + message;
    }

    for (const player of room.players) {
      this.telegram.sendMessage(player.id, message);
    }
  }
}
