/**
 * User info
 * User example:
 * {
 *      // current room
 *      room: 0
 * }
 */
const users = {};

/**
 * Create a new user if not exists
 * @param {*} id User id
 */
function checkUser(id) {
  if (!users[id]) {
    users[id] = {};
  }

  return users[id];
}

/**
 * Handle user logic
 */
const userService = {
  /**
   * Get a user room
   * @param {*} id User id
   */
  getRoom: (id) => {
    const user = checkUser(id);
    return user.room;
  },

  /**
   * Add user to a room
   * @param {*} id User id
   * @param {*} room Room in which the user is playing
   */
  setRoom: (id, room = null) => {
    const user = checkUser(id);
    user.room = room;
  },
};

module.exports = userService;
