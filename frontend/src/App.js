import React, { useState, useEffect } from 'react';
import { Term } from '@dash4/react-xterm';
import '@dash4/react-xterm/lib/ReactXterm.css';
import {crazyCoolStarter} from 'changtopia/main.js'
import axios from 'axios';
import config from '../../config.json'
const {changpile} = require('changtopia/changlang/compiler.js')

function App() {
  return (
    <div className="App">
        {MyComponent('456')}
    </div>
  );
}

const known_modules ={}

let thing = () => console.log('bruh i dont even know any more :/')

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
        Object.entries(files).forEach(([name, content]) => {
          const module = changpile(content)
          localStorage[`_module_${module.moduleName}`] = JSON.stringify(module)
          loadedModules.push(module.moduleName)
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
    <>
      <Term ref_={handleTermRef} onData={(d) => thing(d)} uid={id} scrollback={false} style={{overflowY: 'null'}}/>
    </>
  );
};

export default App;