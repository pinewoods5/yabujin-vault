export const TILE = 32;

// Every room is a 20×15 tile map (640×480) plus what stands on its shelves.
// #  wall            .  floor             P  player start
// =  empty shelf     1–9  a book slot on that shelf, filled left to right from `shelves`
// L  lectern holding the room's "locked-page" book
// G  the Gatekeeper (stands on floor)
// D  door in a wall, leading to `doorTo`
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
      '#........G.........#',
      '#########D##########',
    ],
    doorTo: 'garden',
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
  let gatekeeper = null;
  let door = null;

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
      else if (ch === 'G') gatekeeper = one(gatekeeper, 'G (Gatekeeper)', col, row);
      else if (ch === 'D') door = one(door, 'D (door)', col, row);
      else if (ch === ' ') voids.push({ col, row });
      else if (ch !== '.') throw new Error(`Unknown room tile "${ch}" at ${col},${row}`);
    });
  });

  if (!spawn) throw new Error('Room has no P (player start)');

  // Where you stand after coming through the door: the floor tile next to it.
  const walkable = (col, row) => '.PG'.includes(map[row]?.[col] ?? '#');
  const doorStep = door && [[0, -1], [0, 1], [-1, 0], [1, 0]]
    .map(([dc, dr]) => ({ col: door.col + dc, row: door.row + dr }))
    .find(({ col, row }) => walkable(col, row));
  if (door && !doorStep) throw new Error('The door (D) has no floor next to it');

  return { cols, rows, walls, shelfTiles, slots, voids, spawn, lectern, gatekeeper, door, doorStep };
}

export function loadRoom(name) {
  const { map, shelves, tint, doorTo } = ROOMS[name];
  return { name, ...parseRoom(map), shelves, tint, doorTo };
}
