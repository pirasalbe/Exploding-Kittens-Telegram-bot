import { Markup, Telegraf } from 'telegraf';
import { TelegrafContext } from 'telegraf/typings/context';

import { BotAction } from './bot-action.enum';
import { CardType, DefuseCard, ExplodingKittenCard } from './game/card';
import { GameFactory } from './game/game-factory';
import { Room } from './room/room';
import { RoomService } from './room/room-service';
import { UserService } from './user/user-service';

/**
 * Bot manager
 */
export class Bot {
  /**
   * Singleton
   */
  private static instance: Bot = null;

  /**
   * User service
   */
  private userService: UserService = UserService.getInstance();

  /**
   * Room service
   */
  private roomService: RoomService = RoomService.getInstance();

  /**
   * Bot instace
   */
  private bot = new Telegraf(process.env.BOT_TOKEN);

  /**
   * Tells if the bot has been launched
   */
  private running = false;

  private constructor() {
    this.registerMiddlewares();
  }

  /**
   * Get the instance
   */
  static getInstance(): Bot {
    if (Bot.instance == null) {
      Bot.instance = new Bot();
    }

    return Bot.instance;
  }

  /**
   * Launch the bot
   */
  launch(): void {
    if (!this.running) {
      this.bot.launch();
      this.running = true;
    }
  }

  /**
   * Register all the middlewares
   */
  private registerMiddlewares(): void {
    // start command
    this.bot.start((ctx) => {
      this.registerUser(ctx);

      if (this.userService.getRoom(ctx.from.id)) {
        ctx.reply('You are already playing. Send /stop to disconnect.');
      } else {
        // start game request
        ctx.reply(
          'What do you want to do?',
          Markup.inlineKeyboard([
            Markup.callbackButton('Host game', 'host'),
            Markup.callbackButton('Join game', 'join'),
          ]).extra()
        );
      }
    });

    // help command
    this.bot.help((ctx) => {
      this.registerUser(ctx);

      ctx.reply(
        '/start Start a new game\n/stop End current game',
        Markup.inlineKeyboard([
          Markup.urlButton('Rules', 'http://bit.ly/37OKl0x'),
        ]).extra()
      );
    });

    // stop command
    this.bot.command('stop', (ctx) => {
      this.registerUser(ctx);
      if (this.roomService.exitGame(ctx.from.id)) {
        ctx.reply('Disconnected');
      } else {
        ctx.reply('You are not playing');
      }
    });

    this.host();
    this.join();
    this.player();
    this.textListener();
    this.actionListener();
  }

  /**
   * Create user if not exists
   * @param ctx Telegram context
   */
  registerUser(ctx: TelegrafContext): void {
    this.userService.registerUser(ctx.from.id, ctx.from.username);
  }

  /**
   * Host related commands
   */
  private host(): void {
    // host a game, ask for a mode
    this.bot.action('host', (ctx) => {
      this.registerUser(ctx);
      ctx.editMessageText('Hosting a new game');
      ctx.reply(
        'Choose mode',
        Markup.inlineKeyboard(GameFactory.getModesButtons()).extra()
      );
    });

    /**
     * mode selected, create room
     */
    this.bot.action(GameFactory.getModesActions(), (ctx) => {
      this.registerUser(ctx);

      // create room
      const room: Room = this.roomService.hostGame(
        ctx.from.id,
        ctx.callbackQuery.data
      );

      ctx.editMessageText('Room created: ' + room.mode.description);
      ctx.reply(
        'Room code: ' + room.id,
        Markup.inlineKeyboard([
          Markup.callbackButton('Cancel', BotAction.CANCEL_GAME),
          Markup.callbackButton('Start', BotAction.START_GAME),
        ]).extra()
      );
    });

    /**
     * Cancel Game
     */
    this.bot.action(BotAction.CANCEL_GAME, (ctx) => {
      this.registerUser(ctx);

      this.roomService.stopGame(ctx.from.id);

      ctx.editMessageText('Game ended');
    });

    /**
     * Start Game
     */
    this.bot.action(BotAction.START_GAME, (ctx) => {
      this.registerUser(ctx);

      const started = this.roomService.startGame(ctx.from.id);

      if (started) {
        ctx.editMessageText('Game started');
      } else {
        ctx.reply('Not enough players to start game');
      }
    });
  }

  /**
   * Partecipant related command
   */
  private join(): void {
    // join game
    this.bot.action('join', (ctx) => {
      this.registerUser(ctx);
      ctx.editMessageText('Joining an existing game');
      this.askRoomCode(ctx);
    });
  }

  /**
   * Send a request for the room code
   * @param ctx Telegram context
   */
  private askRoomCode(ctx: TelegrafContext): void {
    ctx.reply('Insert room code', Markup.forceReply().extra());
  }

  /**
   * Handles text messages
   */
  private textListener(): void {
    this.bot.on('text', (ctx) => {
      this.registerUser(ctx);

      // join request
      if (
        ctx.message.reply_to_message &&
        ctx.message.reply_to_message.text === 'Insert room code'
      ) {
        const room: Room = this.roomService.joinGame(
          ctx.from.id,
          Number(ctx.message.text)
        );

        // send room info
        if (room) {
          ctx.reply(
            'Joined room: ' +
              room.mode.description +
              '. Send /stop to disconnect.'
          );
        } else {
          // tslint:disable-next-line:quotemark
          ctx.reply("Room doesn't exists").then(() => {
            this.askRoomCode(ctx);
          });
        }
      } else {
        // unknown requests
        ctx.reply(
          'Unknown command "' +
            ctx.message.text +
            '". Send /help for more info.'
        );
      }
    });
  }

  /**
   * Handles action messages
   */
  actionListener(): void {
    this.bot.on('callback_query', (ctx) => {
      this.registerUser(ctx);

      // exploding kittes in deck
      if (
        ctx.callbackQuery.data.startsWith(BotAction.PUT_EXPLODING_BACK_TO_DECK)
      ) {
        const position: number = Number(
          ctx.callbackQuery.data.replace(
            BotAction.PUT_EXPLODING_BACK_TO_DECK,
            ''
          )
        );
        ctx.editMessageText('You choose position: ' + (position + 1));

        // add back
        this.roomService.addExplodingKitten(ctx.from.id, position);
      } else if (
        ctx.callbackQuery.data.startsWith(BotAction.ALTER_THE_FUTURE_ACTION)
      ) {
        const data: string = ctx.callbackQuery.data.replace(
          BotAction.ALTER_THE_FUTURE_ACTION,
          ''
        );
        ctx.editMessageText(ctx.callbackQuery.message.text);

        // alter future
        this.roomService.alterFuture(ctx.from.id, data);
      } else if (
        ctx.callbackQuery.data.startsWith(BotAction.STEAL_FROM_PLAYER)
      ) {
        const player: number = Number(
          ctx.callbackQuery.data.replace(BotAction.STEAL_FROM_PLAYER, '')
        );
        ctx.editMessageText(
          'Steal from: ' + this.userService.getUsername(player)
        );

        // TODO steal
      } else if (
        ctx.callbackQuery.data.startsWith(BotAction.FAVOR_FROM_PLAYER)
      ) {
        const player: number = Number(
          ctx.callbackQuery.data.replace(BotAction.FAVOR_FROM_PLAYER, '')
        );
        ctx.editMessageText(
          'Favor from: ' + this.userService.getUsername(player)
        );

        this.roomService.askFavor(ctx.from.id, player);
      } else if (ctx.callbackQuery.data.startsWith(BotAction.DO_FAVOR)) {
        const data: string = ctx.callbackQuery.data.replace(
          BotAction.DO_FAVOR,
          ''
        );
        ctx.editMessageText('You are giving: ' + data);

        this.roomService.doFavor(ctx.from.id, data);
      } else {
        // unknown requests
        ctx.reply(
          'Unknown command "' +
            ctx.message.text +
            '". Send /help for more info.'
        );
      }
    });
  }

  /**
   * Player commands
   */
  player(): void {
    /**
     * Draw
     */
    this.bot.action(BotAction.DRAW, (ctx) => {
      this.registerUser(ctx);
      ctx.editMessageText('You drew:');
      this.roomService.drawCard(ctx.from.id);
    });

    /**
     * Cards
     */
    this.bot.action(Object.values(CardType), (ctx) => {
      this.registerUser(ctx);
      ctx.editMessageText('You played: ' + ctx.callbackQuery.data);

      this.roomService.playCard(ctx.from.id, ctx.callbackQuery.data);
    });

    /**
     * Defuse exploding
     */
    this.bot.action(BotAction.DEFUSE_KITTEN, (ctx) => {
      this.registerUser(ctx);
      ctx.editMessageText('You played: ' + new DefuseCard().description);

      this.roomService.playCard(ctx.from.id, CardType.DEFUSE);
    });

    /**
     * Explode
     */
    this.bot.action(BotAction.EXPLODE, (ctx) => {
      this.registerUser(ctx);
      ctx.editMessageText(
        'You played: ' + new ExplodingKittenCard().description
      );

      this.roomService.playCard(ctx.from.id, CardType.EXPLODING_KITTEN);
    });
  }
}
