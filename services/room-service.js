const UserService = require("./user-service");

/**
 * Rooms online
 * Room example:
 * {
 *      // players
 *      players: []
 * }
 */
const rooms = {};

/**
 * Handle room logic
 */
const roomService = {
  /**
   * Host a new game
   * @param {*} id Player id
   * @param {*} name Player name
   */
  hostGame: (id, name) => {
    let created = false;

    // look for the first empty room
    for (let i = 0; !created; i++) {
      if (!rooms[i]) {
        rooms[i] = {
          players: [],
        };

        // add user to the room
        roomService.joinGame(id, name, i);

        created = true;
      }
    }
  },

  /**
   * Join a game
   * @param {*} id Player id
   * @param {*} name Player name
   * @param {*} room Room number
   */
  joinGame: (id, name, room) => {
    let found = false;

    // if room exists join
    // TODO check if is started
    if (rooms[room]) {
      rooms[room].players.push({ id, name });
      UserService.setRoom(id, room);
      found = true;
    }

    return found;
  },

  /**
   * Exit a game
   * @param {*} id
   */
  exitGame: (id) => {
    // reset user room
    const roomCode = UserService.getRoom(id);
    UserService.setRoom(id);

    // remove user from room
    const room = rooms[roomCode];
    const playerIndex = room.players.findIndex((p) => p.id === id);
    room.splice(playerIndex, 1);

    // TODO handle game logic
  },
};

module.exports = roomService;
