import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/markup';

/**
 * Mode type
 */
export type Mode = {
  /**
   * Mode description
   */
  description: string;

  /**
   * Allowed players
   */
  maxPlayers: number;
};

/**
 * Create a game
 */
export class GameFactory {
  /**
   * Game modes
   */
  private static modes: Record<string, Mode> = {
    /**
     * Party pack, 3 users
     */
    party: {
      /**
       * Message description
       */
      description: 'Party pack, up to 10 players',

      /**
       * Max allowed players
       */
      maxPlayers: 10,
    },
  };

  /**
   * Gets all available modes as buttons
   */
  static getModesButtons(): InlineKeyboardButton[] {
    const response: InlineKeyboardButton[] = [];

    // create a list of modes
    for (const mode of Object.keys(GameFactory.modes)) {
      response.push(
        Markup.callbackButton(GameFactory.modes[mode].description, mode)
      );
    }

    return response;
  }

  /**
   * Gets all available modes as actions
   */
  static getModesActions(): string[] {
    const response: string[] = [];

    // create a list of modes
    for (const mode of Object.keys(GameFactory.modes)) {
      response.push(mode);
    }

    return response;
  }
}
