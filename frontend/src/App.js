import React, { useState, useEffect } from 'react';
import { Term } from '@dash4/react-xterm';
import '@dash4/react-xterm/lib/ReactXterm.css';
import axios from 'axios';

import config from '../../config.json'
import {changpile} from 'changtopia/changlang/compiler.js'
import {crazyCoolStarter} from 'changtopia/main.js'
import {createFile} from 'changtopia/Io/BrowserIO.js'

function App() {
  return (
    <div className="App">
        {MyComponent('456')}
    </div>
  );
}

const known_modules ={}

let thing = () => console.log('Not loaded')

const MyComponent = ({id}) => {
  const [term, setTerm] = useState(undefined);
  const [loaded, setLoaded] = useState(false);


  useEffect(() => {
    async function loadStuff() {
      if (!loaded && term) {
        term.write('Fetching sources\n\r')
        const files = (await axios(`${config.server_host}/get_dem_files`)).data
        const loadedModules = []
        term.write('Compiling sources\n\r')
        console.log(files)
        Object.entries(files).forEach(([name, content]) => {
          createFile(name, content)
          try {
            const module = changpile(content)
            console.log(module)
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
        term.write('Loaded and compiled:\n\r' + loadedModules.map(name => `  ${name}${'\n\r'}`).join(''))
        term.write('Starting changtopia\n\r');

        const ioDude = crazyCoolStarter(JSON.parse(localStorage._module_main), term)
        ioDude.getTerminalSize = async () => [term.term.cols, term.term.rows]
        thing = (d) => ioDude.inputListener(d)
        setLoaded(true)
      }
    }
    loadStuff()
  });

  function handleTermRef(uid, xterm) {
    setTerm(xterm);
  }

  function handleStart() {
  }

  return (
    <div className="chang-window">
      <Term
        ref_={handleTermRef}
        onData={(d) => thing(d)}
        uid={id}
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
  );
};

export default App;
