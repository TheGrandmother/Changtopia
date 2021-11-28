const math = [
  {
    functionId: 'sin',
    core: true,
    exec: (_, __ , a) => {
      return Math.sin(a)
    }
  },
  {
    functionId: 'cos',
    core: true,
    exec: (_, __ , a) => {
      return Math.cos(a)
    }
  },
  {
    functionId: 'sqrt',
    core: true,
    exec: (_, __ , a) => {
      return Math.sqrt(a)
    }
  },
  {
    functionId: 'abs',
    core: true,
    exec: (_, __ , a) => {
      return Math.abs(a)
    }
  },
  {
    functionId: 'pi',
    core: true,
    exec: () => {
      return Math.PI
    }
  },
  {
    functionId: 'floor',
    core: true,
    exec: (_, __, x) => {
      return Math.floor(x)
    }
  },
  {
    functionId: 'random',
    core: true,
    exec: () => {
      return Math.random()
    }
  },
  {
    functionId: 'rand_range',
    core: true,
    exec: (_, __, min, max) => {
      return min + (Math.random() * (max-min))
    }
  },
]

module.exports = {math}
