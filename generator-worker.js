// generator-worker.js
importScripts('generator.js');

self.addEventListener('message', function (e) {
  var d    = e.data;
  var maze = self.Generator.generateMaze(d.rows, d.cols, d.sequence);
  self.postMessage({ maze: maze });
});
