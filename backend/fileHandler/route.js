const express = require('express')

const FileHandler = require('./FileHandler.js')

const router = new express.Router()

router.get('/files/:path', (req, res) => {
  const getFile = async () => {
    try {
      const content = await FileHandler.getFile(req.param.path)
      res.json(content)
      res.status(200)
      res.send()
    } catch (err) {
      if (err instanceof FileHandler.FileNotFoundError) {
        res.status(404)
        res.send()
      }
    }
  }
})

