import React, { useState, useEffect } from 'react'
import axios from 'axios'
import saveAs from 'file-saver'
import { Terminal } from 'xterm'
import 'xterm/css/xterm.css'
import { FitAddon } from 'xterm-addon-fit'

import config from '../../config.json'
import {changpile} from 'changtopia/changlang/compiler.js'
import {crazyCoolStarter} from 'changtopia/main.js'
import {createFile, getFile} from 'changtopia/Io/BrowserIO.js'



function App() {
  return (
    <div className="App">
      {MyComponent('456')}
    </div>
  )
}

const known_modules ={}

let thing = () => console.log('Not loaded')

const terminalOptions = {
  scrollback: false,
  cursorBlink: true,
  cursorStyle: 'block',
  fontFamily:'Share Tech Mono',
  fontSize:'16',
  fontWeight:'200',
  rendererType: 'canvas',
  theme: {
    foreground: '#c0c0c0',
    background: '#454545',
    cursor: '#c0c0c0'
  }
}

const setupTerminal = (term) => {
  const fit = new FitAddon()
  term.loadAddon(fit)
  window.term = term
  term.open(document.getElementById('chang-window'))
  fit.fit()
  term.focus()
}

const MyComponent = () => {

  const [term, setTerm] = useState(new Terminal(terminalOptions))
  const [loaded, setLoaded] = useState(false)

  function inputTraps(d, listener) {
    if (d.key === 'F5') {
      window.reload()
    }
    if (d.type === 'keypress') {return}
    listener(d)
  }

  useEffect(() => {
    async function loadStuff() {
      window.DEBUG_LOAD_FACTOR = 1
      if (!loaded && term) {
        setupTerminal(term)
        term.write('Fetching the chang sauce...')
        const files = (await axios(`${config.server_host}/get_dem_files`)).data
        term.write(' Ok\n\r')
        const loadedModules = []
        term.write('Changpiling...')
        Object.entries(files).forEach(([name, content]) => {
          createFile(name, content)
          try {
            const module = changpile(content)
            localStorage[`_module_${module.moduleName}`] = JSON.stringify(module)
            loadedModules.push(module.moduleName)
          } catch (err) {
            console.log(err.message)
            term.write(`Error compiling ${name}:${'\n\r'}`)
            term.write(err.message.replace(/\n/g, '\n\r') + '\n\r')
            term.write('Could not start changtopia\n\r')
            throw err
          }
        })
        term.write(' Ok\n\r')
        term.write('Starting changtopia!\n\r')

        let mediatorUrl
        if (config.use_location_as_m_host) {
          mediatorUrl = `ws://${window.location.host}:${config.mediator_port}`
        } else {
          mediatorUrl = `${config.mediator_host}:${config.mediator_port}`
        }
        const ioDude = crazyCoolStarter(JSON.parse(localStorage._module_main), term, mediatorUrl)
        ioDude.getTerminalSize = async () => [term.cols, term.rows]
        ioDude.importFile = async () => importFile()
        ioDude.saveFile = async (name) => await saveFile(name)
        thing = (d) => inputTraps(d, ioDude.inputListener)
        term.attachCustomKeyEventHandler(thing)
        setLoaded(true)
      }
    }
    loadStuff()
  })

  async function saveFile(name) {
    const blob = new Blob([getFile(name)], {type: 'text/plain;charset=utf-8'})
    saveAs(blob, name)
  }

  function importFile() {
    return new Promise((resolve) => {
      const input = document.getElementById('iHaveNoIdeaHowToReact')
      input.onchange = (e) => {
        e.preventDefault()
        const files = e.target.files

        const creators = []
        for (let i = 0; i < files.length; i++) {
          creators.push((async () => {
            const content = await files[i].text()
            createFile(files[i].name, content)
          })())
        }

        resolve(Promise.all(creators).then(() => input.value = ''))
      }
      input.click()
    })
  }

  function handleTermRef(uid, xterm) {
  }

  return (
    <div>
      <div className="chang-window" id="chang-window"></div>
      <div>
        <input
          type="file"
          name="file"
          multiple={true}
          id="iHaveNoIdeaHowToReact"
          onChange={() => {}}
          style={{display: 'none'}}
        />
      </div>
    </div>
  )
}

export default App
