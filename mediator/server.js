const ws = require('ws')
const {h, randomHash} = require('../util/hash.js')
const {formatMessage} = require('../util/messages.js')
const {toJsString, fromJsString} = require('../util/strings.js')
const Pid = require('../VM/pid.js')


function makeReply(message, payload, secret) {
  return JSON.stringify({sender: message.recipient, recipient: message.sender, id: randomHash(), payload, requestId: message.id, secret})
}

//initialize the WebSocket server instance
const wss = new ws.Server({ port: 8999 })

const hosts = {}

function messageHandler(ws, _message) {
  const message = JSON.parse(_message)
  const host = hosts[message.sender.host]
  if (message.recipient.host === 0) {
    console.log(formatMessage(message))
    //special secret message to mediator
    const [kind, ...payload] = message.payload

    if (kind === h('publish')) {
      const [name, pid] = payload
      host.publishedPids[toJsString(name)] = pid
      console.log(`${message.sender.host.toString(16)} published ${toJsString(name)} on ${Pid.toPid(pid)}`)
      ws.send(makeReply(message, [h('published')]))
    }

    if (kind === h('fetch_a_dude')) {
      const [name] = payload
      const thing = Object.values(hosts).reduce((acc, host) => [...acc, ...Object.entries(host.publishedPids)], []).find((e) => {console.log(e, message.sender.host); return e[0] === toJsString(name) && e[1].host !== message.sender.host})
      if (thing) {
        ws.send(makeReply(message, [thing[1]]))
      } else {
        ws.send(makeReply(message, [h('nothing')]))
      }
    }

    if (kind === h('fetch_dem_dudes')) {
      const [name] = payload
      const pids = Object.values(hosts).reduce((acc, host) => [...acc, ...Object.entries(host.publishedPids)], []).filter((e) => e[0] === toJsString(name) && e[1].host !== message.sender.host).map(e => e[1])
      ws.send(makeReply(message, [pids]))
    }

  } else {
    const recipientHost = hosts[message.recipient.host]
    if (!recipientHost) {
      ws.send(JSON.stringify({type: 'host_not_found', id: message.id}))
      return
    }
    recipientHost.socket.send(JSON.stringify(message))
  }

}

wss.on('connection', (ws, req) => {
  console.log(`Received connection from ${req.socket.remoteAddress}`)
  ws.once('message', (message) => {
    const {type, host} = JSON.parse(message)
    console.log(`received: ${message}`)
    if (type === 'register') {
      console.log(`Registering host: ${host.toString(16)}`)

      if (hosts[host]) {
        console.log(`Host ${host.toString(16)} allready registered`)
        ws.send(JSON.stringify({type: 'error', msg: 'Host already registered'}))
      } else {
        hosts[host] = {socket: ws, publishedPids: {}}
        ws.on('message', (message) => messageHandler(ws, message))
        ws.on('close', () => {
          console.log(`Host ${host.toString(16)} is no longer with us`)
          delete hosts[host]
        })

        console.log(`Host ${host.toString(16)} registered`)
        ws.send(JSON.stringify({type: 'registered'}))
      }
    } else {
      console.log('Received arbitrary message before registration')
      ws.send(JSON.stringify({type: 'error', msg: 'Not yet registered'}))
    }
  })
})
