So this is Changtopia.
It is my little Erlang clone that I have been playing with a bit for the last couple of years.
Unfortunately not much of the language itself is documented and figuring out how it works is left as an exercise to the reader :P

This project lives on www.changtopia.com where some examples can be found.
You can type `run brot` to see a Mandelbrot set be computed in parallel. Or maybe `run trace` to see some very very grainy and bad path traced graphics.

***

So... Let's just start out by stating that the quality of this code base is not
necessarily reflective of the quality of work that I produce in a professional setting.
But the primary objective of this project has always been to be fun before anything else.

This project has been ongoing and changing  directions quite a few times over the last couple of years. So there may be some dead/irrelevant code around and some parts that i have completely forgotten about.


***


The whole Changtopia system consists of four parts:

The compiler which can be found in `changtopia/changlang/`. There isn't that much to say about it  apart from it being incredibly confusing.

The actual VM which lives in `changtopia/VM/`. `VM.js` and `process.js` which contains the scheduler and all the code for the message passing and such.

The basic frontend in `frontend/` that does not do much more than juust setup the terminal emulator and bind some callbacks.

There is also  a pretty basic backend in `backend/` that handles the message passing between different clients and the persistent cloud storage.

All of the actual chang code can be found in `changtopia/changfiles/`

One should, in theory, be able to run all of Changtopia locally with docker and some flighting. But I haven't done that in quite some time and I am uncertain how well it still works.
