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
]

module.exports = {math}
