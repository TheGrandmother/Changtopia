const math = [
  {
    functionId: 'min',
    core: true,
    exec: (_, __ , a, b) => {
      return a <= b ? a : b
    }
  },
  {
    functionId: 'max',
    core: true,
    exec: (_, __ , a, b) => {
      return a >= b ? a : b
    }
  },
  {
    functionId: 'sin',
    core: true,
    exec: (_, __ , a) => {
      return Math.sin(a)
    }
  },
  {
    functionId: 'max_value',
    core: true,
    exec: () => {
      return Number.MAX_VALUE
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
  {
    functionId: 'vec3_add',
    core: true,
    exec: (_, __, a, b) => {
      return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]
    }
  },
  {
    functionId: 'vec3_sub',
    core: true,
    exec: (_, __, a, b) => {
      return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]
    }
  },
  {
    functionId: 'vec3_mul',
    core: true,
    exec: (_, __, a, x) => {
      return [a[0]*x, a[1]*x, a[2]*x]
    }
  },
  {
    functionId: 'vec3_mag',
    core: true,
    exec: (_, __, a) => {
      return Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2])
    }
  },
  {
    functionId: 'vec3_norm',
    core: true,
    exec: (_, __, a) => {
      const mag = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2])
      return [a[0] / mag, a[1] / mag, a[2] / mag]
    }
  },
  {
    functionId: 'vec3_dot',
    core: true,
    exec: (_, __, a, b) => {
      return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
    }
  },
  {
    functionId: 'vec3_cross',
    core: true,
    exec: (_, __, a, b) => {
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
      ]
    }
  },
  {
    functionId: 'vec3_proj',
    core: true,
    exec: (_, __, a, b) => {
      const mag = Math.sqrt(b[0]*b[0] + b[1]*b[1] + b[2]*b[2])
      b = [b[0] / mag, b[1] / mag, b[2] / mag]
      return [a[0]*b[0], a[1]*b[1], a[2]*b[2]]
    }
  },
]

module.exports = {math}
