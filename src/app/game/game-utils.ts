/**
 * Game utils methods
 */
export class GameUtils {
  /**
   * Shuffle an array
   * @param array Array to shuffle
   */
  static shuffle<T>(array: T[]): T[] {
    let currentIndex: number = array.length;
    let temporaryValue: T = null;
    let randomIndex: number = null;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }
}
