import { Markup, Telegraf } from 'telegraf';

import { GameFactory } from './factories/game-factory';
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
      // register user
      this.userService.registerUser(ctx.from.id, ctx.from.username);

      // start game request
      ctx.reply(
        'What do you want to do?',
        Markup.inlineKeyboard([
          Markup.callbackButton('Host game', 'host'),
          Markup.callbackButton('Join game', 'join'),
        ]).extra()
      );
    });

    // stop command
    this.bot.command('stop', (ctx) => {
      ctx.reply('Ended current game');
      this.roomService.exitGame(ctx.from.id);
    });

    this.host();
    this.join();
    this.textListener();
  }

  /**
   * Host related commands
   */
  private host(): void {
    // host a game, ask for a mode
    this.bot.action('host', (ctx) => {
      ctx.editMessageText('Hosting a new game');
      ctx.reply(
        'Choose mode',
        Markup.inlineKeyboard(GameFactory.getModesButtons()).extra()
      );
    });

    // mode selected, create room
    this.bot.action(GameFactory.getModesActions(), (ctx) => {
      ctx.editMessageText('Mode selected');
      // create room
      this.roomService.hostGame(ctx.from.id);
      // TODO reply with id and game info
    });
  }

  /**
   * Partecipant related command
   */
  private join(): void {
    // join game
    this.bot.action('join', (ctx) => {
      ctx.editMessageText('Joining an existing game');
      ctx.reply('Insert room code', Markup.forceReply().extra());
    });
  }

  /**
   * Handles text messages
   */
  private textListener(): void {
    this.bot.on('text', (ctx) => {
      // join request
      if (ctx.message.reply_to_message.text === 'Insert room code') {
        this.roomService.joinGame(ctx.from.id, Number(ctx.message.text));
        // TODO send game info
      } else {
        // unknown requests
        ctx.reply(
          'Unknown command "' +
            ctx.message.text +
            '". Send /start to begin, send /stop to exit current game'
        );
      }
    });
  }
}
