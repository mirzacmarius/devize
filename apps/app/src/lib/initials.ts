/**
 * Up to two capital letters for an avatar without a photo: the first letters
 * of the first two words ("Andrei Pop" → "AP"), or the first two letters of a
 * single word or username ("ionpopescu" → "IO").
 */
export function initials(name: string): string {
  const [first = "", second = ""] = name.trim().split(/[\s._-]+/);
  const letters = second
    ? first.charAt(0) + second.charAt(0)
    : first.slice(0, 2);
  return letters.toLocaleUpperCase("ro");
}
