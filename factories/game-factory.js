const { Markup } = require("telegraf");

/**
 * Create a game
 */
module.exports = {
  /**
   * Gets all available modes as buttons
   */
  getModesButtons: () => {
    const response = [];

    // create a list of modes
    for (const mode in modes) {
      response.push(Markup.callbackButton(modes[mode].description, mode));
    }

    return response;
  },

  /**
   * Gets all available modes as actions
   */
  getModesActions: () => {
    const response = [];

    // create a list of modes
    for (const mode in modes) {
      response.push(mode);
    }

    return response;
  },
};

/**
 * Game modes
 */
const modes = {
  /**
   * Party pack, 3 users
   */
  party: {
    /**
     * Message description
     */
    description: "Party pack, up to 10 players",

    /**
     * Max allowed players
     */
    maxPlayers: 10,
  },
};
