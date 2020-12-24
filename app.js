const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

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

bot.action("host", (ctx) => ctx.editMessageText("🎉 Awesome! 🎉"));
bot.action("join", (ctx) => {
  ctx.editMessageText("Join game");
  ctx.reply("Insert room code", Markup.forceReply().extra());
});

bot.launch();
