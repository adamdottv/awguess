export function getRandomItem<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)] as T
}
