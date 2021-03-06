const { openStreamDeck, listStreamDecks } = require('elgato-stream-deck')
const Jimp = require('jimp')

let myStreamDeck = null

function streamDeckInit () {
  if (myStreamDeck === null) {
    try {
      myStreamDeck = openStreamDeck()
    } catch (error) {
      console.error('Error opening Stream Deck device', error)
    }
    if (myStreamDeck) {
      myStreamDeck.on('error', error => {
        console.error(error)
      })
    }
  }
}

module.exports = function (RED) {
  function StreamDeckIn (config) {
    RED.nodes.createNode(this, config)
    var node = this
    streamDeckInit()
    if (myStreamDeck) {
      myStreamDeck.on('up', keyIndex => {
        node.send({ topic: keyIndex, payload: 0 })
      })
      myStreamDeck.on('down', keyIndex => {
        node.send({ topic: keyIndex, payload: 1 })
      })
    }
  }

  function StreamDeckOut (config) {
    RED.nodes.createNode(this, config)
    var node = this
    streamDeckInit()
    node.on('input', function (msg) {
      if (myStreamDeck) {
        const keyIndex = parseInt(msg.topic)
        if (msg.payload.command) {
          switch (msg.payload.command) {
            case 'fillColor':
              if (!Number.isInteger(keyIndex)) {
                node.error('keyIndex missing in topic', msg)
                return
              }
              try {
                myStreamDeck.fillColor(keyIndex, ...msg.payload.value)
              } catch (error) {
                node.error('Can\'t write to StreamDeck', msg)
              }
              break
            case 'fillImage':
              if (!Number.isInteger(keyIndex)) {
                node.error('keyIndex missing in topic', msg)
                return
              }
              Jimp.read(msg.payload.image, (err, image) => {
                if (err) {
                  node.error(err, msg)
                  return
                }
                image = image.resize(myStreamDeck.ICON_SIZE, myStreamDeck.ICON_SIZE).bitmap.data
                const finalBuffer = Buffer.alloc(myStreamDeck.ICON_SIZE ** 2 * 3)
                for (let p = 0; p < image.length / 4; p++) {
                  image.copy(finalBuffer, p * 3, p * 4, p * 4 + 3)
                }
                try {
                  myStreamDeck.fillImage(keyIndex, finalBuffer)
                } catch (error) {
                  node.error('Can\'t write to StreamDeck', msg)
                }
              })
              break
            case 'fillPanel':
              Jimp.read(msg.payload.image, (err, image) => {
                if (err) {
                  node.error(err, msg)
                  return
                }
                image = image.resize(myStreamDeck.ICON_SIZE * myStreamDeck.KEY_COLUMNS, myStreamDeck.ICON_SIZE * myStreamDeck.KEY_ROWS).bitmap.data
                const finalBuffer = Buffer.alloc((myStreamDeck.ICON_SIZE * myStreamDeck.KEY_COLUMNS * myStreamDeck.ICON_SIZE * myStreamDeck.KEY_ROWS * 3))
                for (let p = 0; p < image.length / 4; p++) {
                  image.copy(finalBuffer, p * 3, p * 4, p * 4 + 3)
                }
                try {
                  myStreamDeck.fillPanel(finalBuffer)
                } catch (error) {
                  node.error('Can\'t write to StreamDeck', msg)
                }
              })
              break
            case 'clearAllKeys':
              try {
                myStreamDeck.clearAllKeys()
              } catch (error) {
                node.error('Can\'t write to StreamDeck', msg)
              }
              break
            case 'clearKey':
              if (!Number.isInteger(keyIndex)) {
                node.error('keyIndex missing in topic')
                return
              }
              try {
                myStreamDeck.clearKey(keyIndex)
              } catch (error) {
                node.error('Can\'t write to StreamDeck', msg)
              }
              break
            case 'resetToLogo':
              try {
                myStreamDeck.resetToLogo()
              } catch (error) {
                node.error('Can\'t write to StreamDeck', msg)
              }
              break
            case 'setBrightness':
              try {
                myStreamDeck.setBrightness(msg.payload.value)
              } catch (error) {
                node.error('Can\'t write to StreamDeck', msg)
              }
              break
            case 'listStreamDecks':
              try {
                node.warn(listStreamDecks())
              } catch (error) {
                node.error('Can\'t write to StreamDeck', msg)
              }
              break
          }
        }
      } else {
        node.error('Stream Deck connection issue', msg)
      }
    })
    node.on('close', function () {
      myStreamDeck.close()
      myStreamDeck = null
    })
  }
  RED.nodes.registerType('streamdeck-in', StreamDeckIn)
  RED.nodes.registerType('streamdeck-out', StreamDeckOut)
}
