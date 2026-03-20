
(function (global) {
  'use strict';

  function tokenFootprint(token) {
    const size = Math.max(1, Number(token?.size) || 1);
    const cells = [];
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        cells.push({ x: (Number(token.x) || 0) + dx, y: (Number(token.y) || 0) + dy });
      }
    }
    return cells;
  }

  function cellKey(x, y) { return `${x},${y}`; }

  function isBlocked(x, y, cells, tokens, movingId) {
    const key = cellKey(x, y);
    if (cells?.[key]?.type === 'wall') return true;
    return (tokens || []).some(t => t.id !== movingId && tokenFootprint(t).some(c => c.x === x && c.y === y));
  }

  function canPlaceToken(token, x, y, cols, rows, cells, tokens) {
    const size = Math.max(1, Number(token?.size) || 1);
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const tx = x + dx, ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return false;
        if (isBlocked(tx, ty, cells, tokens, token?.id)) return false;
      }
    }
    return true;
  }

  function findOpenPlacement(token, cols, rows, cells, tokens) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (canPlaceToken(token, x, y, cols, rows, cells, tokens)) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }

  function terrainCostAt(x, y, cells) {
    const cell = cells?.[cellKey(x, y)] || {};
    if (cell.type === 'wall') return Infinity;
    if (cell.type === 'difficult') return 2;
    if (cell.type === 'elevation') return cell.elevation && cell.elevation > 1 ? 3 : 2;
    return 1;
  }

  function bfsPath(start, end, cols, rows, cells) {
    const queue = [[start.x, start.y]];
    const seen = new Set([cellKey(start.x, start.y)]);
    const parent = new Map();
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (queue.length) {
      const [x, y] = queue.shift();
      if (x === end.x && y === end.y) break;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (terrainCostAt(nx, ny, cells) === Infinity) continue;
        const key = cellKey(nx, ny);
        if (seen.has(key)) continue;
        seen.add(key);
        parent.set(key, [x, y]);
        queue.push([nx, ny]);
      }
    }
    const out = [];
    let cur = [end.x, end.y];
    const endKey = cellKey(end.x, end.y);
    if (!seen.has(endKey)) return [];
    while (cur) {
      out.push({ x: cur[0], y: cur[1] });
      const p = parent.get(cellKey(cur[0], cur[1]));
      cur = p || null;
    }
    return out.reverse();
  }

  function rulerMeasurement(start, end, cells, cols, rows) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const euclideanCells = Math.sqrt(dx*dx + dy*dy);
    const path = bfsPath(start, end, cols, rows, cells);
    const pathCells = path.length ? path.length - 1 : Math.abs(dx) + Math.abs(dy);
    const movementCost = path.reduce((sum, step, idx) => idx === 0 ? 0 : sum + terrainCostAt(step.x, step.y, cells), 0);
    return {
      euclideanCells,
      euclideanFeet: Math.round(euclideanCells * 5),
      pathCells,
      pathFeet: pathCells * 5,
      movementCost,
      path
    };
  }

  function toggleFog(cells, x, y, value) {
    const key = cellKey(x, y);
    cells[key] = Object.assign({}, cells[key], { fog: value == null ? !cells[key]?.fog : !!value });
    return cells[key];
  }

  const api = { tokenFootprint, cellKey, isBlocked, canPlaceToken, findOpenPlacement, terrainCostAt, bfsPath, rulerMeasurement, toggleFog };
  global.BattleMapEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
