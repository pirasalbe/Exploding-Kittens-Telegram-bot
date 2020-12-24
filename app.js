const { Telegraf, Markup } = require("telegraf");

const GameFactory = require("./factories/game-factory");
const RoomService = require("./services/room-service");

const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * Host related commands
 */
function host() {
  // host a game, ask for a mode
  bot.action("host", (ctx) => {
    ctx.editMessageText("Hosting a new game");
    ctx.reply(
      "Choose mode",
      Markup.inlineKeyboard(GameFactory.getModesButtons()).extra()
    );
  });

  // mode selected, create room
  bot.action(GameFactory.getModesActions(), (ctx) => {
    ctx.editMessageText("Mode selected");
    // create room
    RoomService.hostGame(ctx.from.id, ctx.from.username);
    // TODO reply with id and game info
  });
}

/**
 * Partecipant related command
 */
function join() {
  // join game
  bot.action("join", (ctx) => {
    ctx.editMessageText("Joining an existing game");
    ctx.reply("Insert room code", Markup.forceReply().extra());
  });
}

/**
 * Handles text messages
 */
function textListener() {
  bot.on("text", (ctx) => {
    // join request
    if (ctx.message.reply_to_message.text === "Insert room code") {
      RoomService.joinGame(ctx.from.id, ctx.from.username, ctx.message.text);
      // TODO send game info
    } else {
      // unknown requests
      ctx.reply(
        "Unknown command '" +
          ctx.message.text +
          "'. Send /start to begin, send /stop to exit current game"
      );
    }
  });
}

// start command
bot.start((ctx) =>
  ctx.reply(
    "What do you want to do?",
    Markup.inlineKeyboard([
      Markup.callbackButton("Host game", "host"),
      Markup.callbackButton("Join game", "join"),
    ]).extra()
  )
);

// stop command
bot.command("stop", (ctx) => {
  ctx.reply("Ended current game");
  RoomService.disconnect(ctx.id);
});

host();
join();
textListener();

bot.launch();
