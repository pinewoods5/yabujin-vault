export const TILE = 32;

// 20×15 tiles = 640×480.
// # wall   . floor   P player start   = shelf without books
// 1–9 a book slot on that shelf (slots are filled left to right)
export const MAP = [
  '####################',
  '#..................#',
  '#.===.===..111.===.#',
  '#..................#',
  '#..................#',
  '#.222.===..===.===.#',
  '#..................#',
  '#..................#',
  '#.===.===..===.333.#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#........P.........#',
  '####################',
];

export function parseRoom(map = MAP) {
  const rows = map.length;
  const cols = map[0].length;
  const walls = [];
  const shelves = [];
  const slots = [];
  let spawn = null;

  map.forEach((line, row) => {
    if (line.length !== cols) throw new Error(`Room row ${row} is ${line.length} tiles wide, expected ${cols}`);
    [...line].forEach((ch, col) => {
      if (ch === '#') walls.push({ col, row });
      else if (ch === '=') shelves.push({ col, row });
      else if (ch >= '1' && ch <= '9') {
        shelves.push({ col, row });
        slots.push({ shelf: Number(ch), col, row });
      } else if (ch === 'P') {
        if (spawn) throw new Error(`Room has more than one P (player start)`);
        spawn = { col, row };
      } else if (ch !== '.') throw new Error(`Unknown room tile "${ch}" at ${col},${row}`);
    });
  });

  if (!spawn) throw new Error('Room has no P (player start)');
  return { cols, rows, walls, shelves, slots, spawn };
}
