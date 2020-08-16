import React, { useState, useEffect } from 'react'
import { Term } from '@dash4/react-xterm'
import '@dash4/react-xterm/lib/ReactXterm.css'
import axios from 'axios'
import saveAs from 'file-saver'

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

const MyComponent = () => {

  const [term, setTerm] = useState(undefined)
  const [loaded, setLoaded] = useState(false)

  function inputTraps(d, listener) {
    if (d === '[15~') {
      window.reload()
    }
    listener(d)
  }

  useEffect(() => {
    async function loadStuff() {
      if (!loaded && term) {
        term.write('Fetching source files...')
        const files = (await axios(`${config.server_host}/get_dem_files`)).data
        term.write(' Ok\n\r')
        const loadedModules = []
        term.write('Compiling sources...')
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
        ioDude.getTerminalSize = async () => [term.term.cols, term.term.rows]
        ioDude.importFile = async () => await importFile()
        ioDude.saveFile = async (name) => await saveFile(name)
        thing = (d) => inputTraps(d, ioDude.inputListener)
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
    setTerm(xterm)
  }

  return (
    <div>
      <div className="chang-window">
        <Term
          ref_={handleTermRef}
          onData={(d) => thing(d)}
          scrollback={false}
          cursorBlink={true}
          cursorColor={'white'}
          backgroundColor="#454545"
          foregroundColor="#c0c0c0"
          fontFamily='Share Tech Mono'
          fontSize='16'
          fontWeight='200'
          isTermActive={true}
          style={{overflowY: 'null'}}/>
      </div>
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
