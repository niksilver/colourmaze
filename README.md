# Colourmaze

Create a maze in which the you have to step from one colour to another
in sequence from start to end.

This is available to play at `https://niksilver.github.io/colourmaze/`.


## Running the app

Start a local HTTP server, e.g. `python -m http.server 8000`.
Then navigate to `index.html`.


## Running the tests

`node tests/test-generator.js`


## Background

I first read about colour mazes in The Guardian's Online section in the
1980s or '90s. The article talked about how people can often easily see the
solution path in ordinary mazes, but that it's much, much more difficult
for these kinds of maze. I wanted to create a colour maze generator ever since.

The problem was that the effort required to devise an acceptable generation
algorithm was much greater than my real interest.
I approached it on and off over the years, and always ended up backing off.

What makes an algorithm 'accepable':
- Must guarantee exactly one solution.
- Must allow duplicate colours in the sequence - for example, red-blue-yellow-blue.
- Must allow paths to cross each other, and cross the solution path,
  without creating a second solution. This should be possible with
  the RBYB sequence, say, where a dead-end path crosses the solution path
  on a blue, as long as it's the other blue in the sequence.
- Must generate some decent dead-end paths to mislead the player.
- Is reasonably efficient - doesn't use a brute force approach.

Finally, this is it. I was nudged partly because I thought an AI coding
tool would help. In this finished app Claude Claude code wrote all the
web code (which I'm very rusty on) and the start of the algorithm code.
I devised the algorithm spec. Claude was also very impressive when it came to
critiquing the algorithm spec, including finding various errors.

However, Claude failed to recognise that the algorithm I devised was
fundamentally wrong. Also, towards the end it started burning
through most of my token allocation without making much meaningful
progress. In the end I manually rewrote the algorithm and updated and
finished off the code myself.
