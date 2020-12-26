import { Extra, Markup, Telegram } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/markup';
import { Message } from 'telegraf/typings/telegram-types';

import { GameFactory } from '../game/game-factory';
import { UserService } from '../user/user-service';
import { BotAction } from './../bot-action.enum';
import {
  AttackCard,
  Card,
  CardType,
  DefuseCard,
  ExplodingKittenCard,
  SeeFutureCard,
} from './../game/card';
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
      // notify players
      this.notifyRoom(
        code,
        'joined the room. [' +
          (room.players.length + 1) +
          '/' +
          room.mode.maxPlayers +
          '] players.',
        id
      );

      // add user
      room.players.push(new Player(id));
      this.userService.setRoom(id, code);
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
  sendCards(code: number, id: number = -1): Promise<Message[]> {
    // get room
    const room: Room = this.getRoom(code);

    const result: Promise<Message>[] = [];
    for (const player of room.players) {
      if (id === player.id || id === -1) {
        let message =
          // tslint:disable-next-line:quotemark
          player.cards.length > 0 ? 'You have:\n' : "You don't have cards";
        const cards: Record<string, number> = {};
        for (const card of player.cards) {
          if (cards[card.description]) {
            cards[card.description]++;
          } else {
            cards[card.description] = 1;
          }
        }

        for (const card of Object.keys(cards)) {
          message += cards[card] + ' ' + card + '\n';
        }

        result.push(this.telegram.sendMessage(player.id, message));
      }
    }

    return Promise.all(result);
  }

  /**
   * Send cards to let a player play
   * @param code Room code
   * @param notify Notify turn
   */
  sendCardsButtons(code: number, notify: boolean = true): void {
    // get room
    const room: Room = this.getRoom(code);

    // get active player
    const player: Player = room.players[room.currentPlayer];

    if (notify) {
      this.notifyRoom(
        code,
        'turn. ' +
          room.turns +
          ' turn' +
          (room.turns > 1 ? 's' : '') +
          ' left.',
        player.id
      );
    }

    // send cards info
    const buttons: InlineKeyboardButton[][] = [
      [Markup.callbackButton('Draw', BotAction.DRAW)],
    ];

    // group cards by same type
    const rows: Record<string, number> = {};
    let row = 1;
    for (const card of player.cards) {
      if (!rows[card.type]) {
        rows[card.type] = row;
        buttons[row] = [];
        row++;
      }

      // add button to the row of its type
      buttons[rows[card.type]].push(
        Markup.callbackButton(card.description, card.type)
      );
    }

    this.telegram.sendMessage(
      player.id,
      'Choose a card',
      Markup.inlineKeyboard(buttons).oneTime().extra()
    );
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

    // check user playing
    if (player.id !== id) {
      this.sendWaitYourTurn(id);
      return;
    }

    const card: Card = top ? room.deck.pop() : room.deck.splice(0, 1)[0];
    player.cards.push(card);

    this.telegram
      .sendMessage(player.id, card.description, Extra.markdown().markup(''))
      .then(() => {
        // exploding kittens
        if (card instanceof ExplodingKittenCard) {
          this.notifyRoom(code, 'drew an ' + card.description, id).then(() => {
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
          });
        } else {
          // add card to player's deck
          this.sendCards(code, id).then(() => {
            // number of cards
            this.notifyRoom(
              code,
              'drew a card. ' + room.deck.length + ' cards left in the deck',
              id
            ).then(() => {
              this.nextPlayer(code);
            });
          });
        }
      });
  }

  /**
   * Ask the user to start again
   * @param id User id
   */
  private sendStartSuggestion(id: number): void {
    this.telegram.sendMessage(id, 'Send /start to begin.');
  }

  /**
   * Notify user that it's not his turn
   * @param id User id
   */
  private sendWaitYourTurn(id: number): void {
    this.telegram.sendMessage(id, 'Wait for your turn.');
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

    // check user playing
    if (player.id !== id) {
      this.sendWaitYourTurn(id);
      return;
    }

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
        this.notifyRoom(code, 'has exploded 💥💥💥', id).then(() => {
          player.alive = false;
          player.cards = [];
          if (!this.checkEndGame(code)) {
            this.nextPlayer(code);
          }
        });
        break;
      case CardType.DEFUSE:
        const explodingIndex: number = player.cards.findIndex(
          (c: Card) => c instanceof ExplodingKittenCard
        );
        // only if player has an exploding
        if (explodingIndex > -1) {
          player.cards.splice(explodingIndex, 1);
          this.notifyRoom(code, 'played a ' + card.description, id).then(() => {
            // send cards to player
            this.sendCards(code, id).then(() => {
              // put exploding back in the deck
              this.sendAddExplodingKitten(id, code);
            });
          });
        } else {
          // else send cards buttons
          player.cards.push(card);
          // tslint:disable-next-line:quotemark
          this.telegram.sendMessage(id, "You can't use this card").then(() => {
            this.sendCardsButtons(code, false);
          });
        }
        break;
      case CardType.ATTACK:
        this.notifyRoom(code, 'played an ' + card.description, id).then(() => {
          const attackCard: AttackCard = card as AttackCard;

          this.nextPlayer(code, attackCard.turns);
        });
        break;
      case CardType.SKIP:
        this.notifyRoom(code, 'played a ' + card.description, id).then(() => {
          this.nextPlayer(code);
        });
        break;
      case CardType.SEE_FUTURE:
        this.notifyRoom(code, 'played a ' + card.description, id).then(() => {
          const seeFutureCard: SeeFutureCard = card as SeeFutureCard;

          // see cards
          let e = room.deck.length - 1;
          let message = 'Top card:\n';
          for (let i = 0; i < seeFutureCard.count && e >= 0; i++, e--) {
            message +=
              'Card ' + (e + 1) + ' is ' + room.deck[e].description + '\n';
          }
          this.telegram.sendMessage(id, message).then(() => {
            this.sendCardsButtons(code);
          });
        });
        break;
      case CardType.ALTER_FUTURE:
        // TODO
        break;
      case CardType.SHUFFLE:
        this.notifyRoom(code, 'played a ' + card.description, id).then(() => {
          // shuffle deck
          room.deck = GameUtils.shuffle(room.deck);

          this.sendCardsButtons(code);
        });
        break;
      case CardType.DRAW_BOTTOM:
        this.notifyRoom(code, 'played a ' + card.description, id).then(() => {
          this.drawCard(id, false);
        });
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
   * Ask a user where to put the exploding kitten
   * @param id User id
   * @param code Room code
   */
  private sendAddExplodingKitten(id: number, code: number): void {
    // get room
    const room: Room = this.getRoom(code);

    // game ended
    if (!room) {
      this.sendStartSuggestion(id);
      return;
    }

    const player: Player = room.players[room.currentPlayer];

    // check user playing
    if (player.id !== id) {
      this.sendWaitYourTurn(id);
      return;
    }

    // check if there are only exploding kittens in the deck
    const onlyExploding =
      room.deck.findIndex((c: Card) => !(c instanceof ExplodingKittenCard)) ===
      -1;

    if (onlyExploding) {
      // only exploding kittens, default position
      this.addExplodingKitten(id, 0);
    } else {
      // prepare buttons
      const buttons: InlineKeyboardButton[][] = [
        [
          // last
          Markup.callbackButton(
            'Top',
            BotAction.PUT_EXPLODING_BACK_TO_DECK + room.deck.length
          ),
        ],
      ];
      let row = 1;
      for (let i = room.deck.length - 1; i > 0; i--) {
        // create row
        if (!buttons[row]) {
          buttons.push([]);
        }

        // add button
        buttons[row].push(
          Markup.callbackButton(
            String(i + 1),
            BotAction.PUT_EXPLODING_BACK_TO_DECK + i
          )
        );

        // max 4 buttons per row
        if (buttons[row].length > 3) {
          row++;
        }
      }
      // first
      buttons.push([
        Markup.callbackButton(
          'Bottom',
          BotAction.PUT_EXPLODING_BACK_TO_DECK + 0
        ),
      ]);

      // ask for position
      this.telegram.sendMessage(
        id,
        'Choose ' + new ExplodingKittenCard().description + ' new position',
        Markup.inlineKeyboard(buttons).oneTime().extra()
      );
    }
  }

  /**
   * Put an exploding kitten back in the deck
   * @param id User id
   * @param position Position in which add the card
   */
  addExplodingKitten(id: number, position: number): void {
    // get room
    const code: number = this.userService.getRoom(id);
    const room: Room = this.getRoom(code);

    // game ended
    if (!room) {
      this.sendStartSuggestion(id);
      return;
    }

    const player: Player = room.players[room.currentPlayer];

    // check user playing
    if (player.id !== id) {
      this.sendWaitYourTurn(id);
      return;
    }

    // put exploding kitten in deck
    room.deck.splice(position, 0, new ExplodingKittenCard());

    // next player
    this.nextPlayer(code);
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
    let winner: number = null;

    // count player alive
    for (const player of room.players) {
      if (player.alive) {
        winner = player.id;
        alive++;
      }
      // check if game has finished
      end = alive < 2;
    }

    // TODO ask to start again
    if (end) {
      this.notifyRoom(code, 'won the game 👑👑🐈', winner);
    }

    return end;
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

    // player is not alive
    if (
      !room.players[room.currentPlayer] ||
      !room.players[room.currentPlayer].alive ||
      room.turns < 0
    ) {
      room.turns = 0;
    }

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
  exitGame(id: number): boolean {
    let exit = false;

    // reset user room
    const code = this.userService.getRoom(id);
    this.userService.setRoom(id);

    // remove user from room
    const room = this.getRoom(code);
    if (room) {
      exit = true;
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
      } else {
        // check if one player alive
        if (!this.checkEndGame(code)) {
          // next player if he was the current player
          if (room.currentPlayer === playerIndex) {
            room.currentPlayer--;
            room.turns = 0;
            this.nextPlayer(code);
          }
        }
      }
    }

    return exit;
  }

  /**
   * Send a message to all users
   * @param code Room code
   * @param message Message to send
   * @param userId Username to add at the beginnig of the message
   */
  private notifyRoom(
    code: number,
    message: string,
    userId: number = -1
  ): Promise<Message[]> {
    const room: Room = this.getRoom(code);

    // add username
    if (userId !== -1) {
      message = '@' + this.userService.getUsername(userId) + ' ' + message;
    }

    const result: Promise<Message>[] = [];
    for (const player of room.players) {
      result.push(this.telegram.sendMessage(player.id, message));
    }

    return Promise.all(result);
  }
}
