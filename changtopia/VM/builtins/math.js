const math = [
  {
    functionId: 'sin',
    bif: true,
    exec: (_, __ , a) => {
      return Math.sin(a)
    }
  },
  {
    functionId: 'cos',
    bif: true,
    exec: (_, __ , a) => {
      return Math.cos(a)
    }
  },
  {
    functionId: 'sqrt',
    bif: true,
    exec: (_, __ , a) => {
      return Math.sqrt(a)
    }
  },
  {
    functionId: 'abs',
    bif: true,
    exec: (_, __ , a) => {
      return Math.abs(a)
    }
  },
  {
    functionId: 'pi',
    bif: true,
    exec: () => {
      return Math.PI
    }
  },
]

module.exports = {math}
