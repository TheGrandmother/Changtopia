# Changlang

Changlang is a garbage changuage. Please get out.


## Pattern matching

Changlang includes some rudimentary and halfassed pattern matching.

Then syntax looks as folowing:

```
  match expression
    pattern ->
      block
    end
    pattern ->
      block
    end
    whatever ->
      block
    end
  end
```

`whatever` is a keyword here wich is the default clause.

A pattern can be a constant, an array or an identifier.
In an array, any constants will be matched against and every
identifier will be bound to the coresponding position.

The patterns are matched in the order they show up
and if the expression were to match multiple patterns it would
evaluate the first one.
If no patterns match and there is no `whatever` clause the matching
block will have little to no effect.

