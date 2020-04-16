const fs = require('fs').promises

const process = require('process')
const {Worker} = require('worker_threads')
const {NodeIoHandler} = require('./Io/NodeIO.js')



const ioHandler = new NodeIoHandler()


function spawnVm(modules) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./VM/vm.js', {workerData: modules})
    console.log('VM spawned')
    worker.on('error', reject)
    worker.on('message', (message) => {
      const {internal, args} = message
      if (internal) {
        console.log(...args)
      } else {
        ioHandler.handleMessage(worker, message)
      }
    })
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
      resolve()
    })

  })
}

async function main () {
  console.log('Launching VM')
  const [,, inFile] = process.argv
  const modules = JSON.parse((await fs.readFile(inFile)).toString())
  await spawnVm(modules)
  process.exit()
}

main().then().catch((err) => {console.error(err); process.exit(420)})
