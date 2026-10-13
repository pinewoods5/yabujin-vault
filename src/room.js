export const TILE = 32;

// Every room is a 20×15 tile map (640×480) plus what stands on its shelves.
// #  wall            .  floor             P  player start
// =  empty shelf     1–9  a book slot on that shelf, filled left to right from `shelves`
// L  lectern holding the room's "locked-page" book
//    (space) nothing: outside the room
// `tint` washes the whole room in a colour (null = none).
export const ROOMS = {
  library: {
    tint: null,
    map: [
      '####################',
      '#..................#',
      '#.444.===..111.555.#',
      '#..................#',
      '#..................#',
      '#.222.666..===.777.#',
      '#..................#',
      '#..................#',
      '#.===.888..999.333.#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#...P....L.........#',
      '#..................#',
      '####################',
    ],
    // The first five songs keep the slots they had before books.json, so nobody's shelf moves.
    shelves: {
      1: ['hex-ff81k', 'angel-witta-knife', 'the-first-page'],
      2: ['pink-windows', 'azeroy-garden-8888', 'azeroy'],
      3: ['baroque', 'the-mirror-book', 'the-unanswered-letter'],
      4: ['too-many-names', 'chalice-of-mind', 'letters-from-the-2000s'],
      5: ['the-borrowed-melody', 'gambino', 'roots-and-echoes'],
      6: ['numbers', 'mobile-terror-1616', 'the-ghost'],
      7: ['crystal-helix', 'the-great-erasure', 'twenty-four-days'],
      8: ['boing', 'hardstyle-drill-2009-nokia-angelz', 'the-archivists'],
      9: ['laumiu-dovanos', 'mereana-mordegard-glesgorv', 'limbo'],
    },
  },
};

export function parseRoom(map) {
  const rows = map.length;
  const cols = map[0].length;
  const walls = [];
  const shelfTiles = [];
  const slots = [];
  const voids = [];
  let spawn = null;
  let lectern = null;

  const one = (current, name, col, row) => {
    if (current) throw new Error(`Room has more than one ${name}`);
    return { col, row };
  };

  map.forEach((line, row) => {
    if (line.length !== cols) throw new Error(`Room row ${row} is ${line.length} tiles wide, expected ${cols}`);
    [...line].forEach((ch, col) => {
      if (ch === '#') walls.push({ col, row });
      else if (ch === '=') shelfTiles.push({ col, row });
      else if (ch >= '1' && ch <= '9') {
        shelfTiles.push({ col, row });
        slots.push({ shelf: Number(ch), col, row });
      } else if (ch === 'P') spawn = one(spawn, 'P (player start)', col, row);
      else if (ch === 'L') lectern = one(lectern, 'L (lectern)', col, row);
      else if (ch === ' ') voids.push({ col, row });
      else if (ch !== '.') throw new Error(`Unknown room tile "${ch}" at ${col},${row}`);
    });
  });

  if (!spawn) throw new Error('Room has no P (player start)');
  return { cols, rows, walls, shelfTiles, slots, voids, spawn, lectern };
}

export function loadRoom(name) {
  const { map, shelves, tint } = ROOMS[name];
  return { name, ...parseRoom(map), shelves, tint };
}
