var readline = require('readline');
const fs = require('fs')

const process = require('process')
const {Worker} = require('worker_threads')
const {h, randomHash} = require('./util/hash.js')


const ioRoutines = {
  [h('raw_print')]: (worker, message) => {
    console.log(`Printing: From ${message.sender}: ${message.payload}`)
  },
  [h('print')]: (worker, message) => {
    console.log(String.fromCharCode(...message.payload[0]))
  },
  [h('random')]: (worker, message) => {
    const val = (Math.random() * Number.MAX_SAFE_INTEGER)
    worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: val, requestId: message.id})
  },
  [h('readline')]: (worker, message) => {
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false
    })

    rl.once('line', function(line){
      worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: line.split('').map(c => c.charCodeAt(0)), requestId: message.id})
    })
  }
}

class IoHandler {
  handleMessage(worker, message) {
    const [kind, ...payload] = message.payload
    message.payload = payload
    ioRoutines[kind](worker, message)
  }
}

const ioHandler = new IoHandler()


function spawnVm(functions) {
  return new Promise((resolve, reject) => {
    console.log('spawning VM')
    const worker = new Worker('./vm.js', {workerData: functions})
    console.log('VM spawned')
    worker.on('error', reject)
    worker.on('message', (message) => ioHandler.handleMessage(worker, message))
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`))
    })

  })
}

function main () {
  console.log('Launching VM')
  const [,, inFile] = process.argv
  const functions = JSON.parse(fs.readFileSync(inFile).toString())
  spawnVm(functions)

}

main()
