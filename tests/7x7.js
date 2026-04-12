const assert = require('assert');
const G = require('../generator.js');


function countBlacks(grid) {
  var count = 0;
  for (var row of grid) {
    for (var colour of row) {
      count += colour === G.RGB.BLACK ? 1 : 0;
    }
  }
  return count;
}


function generateOne() {
  var seq  = [G.RGB.RED, G.RGB.BLUE, G.RGB.BLUE, G.RGB.BLUE, G.RGB.BLUE];
  var maze = G.generateMaze(7, 7, seq);
  var sols = G.countSolutions(maze.grid, seq);
  var bks  = countBlacks(maze.grid);
  console.log(G.format(maze.grid));
  console.log('This has ' + sols + ' solutions and ' + bks + ' black cells');
  return bks;
}


G.setDebug(true);
for (var i = 0; i < 50; i++) {
  console.log('\n\n\n----------\n\n\n');
  var bks = generateOne();
  if (bks > 20) break;
}
G.setDebug(false);
