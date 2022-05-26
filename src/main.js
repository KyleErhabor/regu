const { Constants, Client: Regu } = require("./index.js");
const sqlite = require("sqlite");
const bot = new Regu(Constants.BOT_TOKEN, {
    messageLimit: 10,
    defaultImageSize: 1024,
    maxReconnectAttempts: 3,
    restMode: true,
    autoreconnect: true,
    disableEveryone: true,
    guildSubscriptions: true,
    disableEvents: { TYPING_START: true }
});

(async () => {
    try {
      bot.db = await sqlite.open("regu.sqlite");

      await bot.init();
    } catch (err) {
      console.log(err)
    }
})();