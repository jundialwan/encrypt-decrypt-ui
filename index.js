const express = require('express')
const cons = require('consolidate')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const shell = require('shelljs')

const app = express()

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve('./uploads'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const uploadFile = multer({ storage: storage })

// view engine setup
// app.engine('html', cons.swig)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.resolve('./public')))

app.get('/encrypt', (rq, rs) => rs.render('encrypt'))
app.get('/decrypt', (rq, rs) => rs.render('decrypt'))
app.post('/submit-encrypt', uploadFile.single('fileToEncrypt'), async (rq, rs) => {
  // load private key path
  const publicKeyFile = path.resolve('./public.pem') 

  // encrypt file
  const encryptedFilename = `encrypted-${rq.file.filename}`
  const command = `openssl rsautl -encrypt -pubin -inkey ${publicKeyFile} -in ${path.resolve(`./uploads/${rq.file.filename}`)} -out ${path.resolve(`./encrypted/${encryptedFilename}`)}`

  const encryption = await new Promise((rs, rj) => {
    console.log('encrypting...')

    shell.exec(command, { silent: true }, (code, stdout, stderr) => {
      if (code !== 0) {
        console.log('Failed when encrypt file')
        rs(null)
      }
      rs(stdout)
    })
  })

  console.log(encryption)
  if (encryption === null) {
    return rs.render('encrypt', { error: 'Failed when encrypting file' })
  }

  // send encrypted file to user
  rs.download(path.resolve(`./encrypted/${encryptedFilename}`))
})

app.post('/submit-decrypt', uploadFile.single('fileToDecrypt'), async (rq, rs) => {
  // load public key path
  const privateKeyFile = path.resolve('./private.pem')

  // decrypt file
  const decryptedFilename = `decrypted-${rq.file.filename}`
  const command = `openssl rsautl -decrypt -inkey ${privateKeyFile} -in ${path.resolve(`./uploads/${rq.file.filename}`)} -out ${path.resolve(`./decrypted/${decryptedFilename}`)}`

  const decryption = await new Promise((rs, rj) => {
    console.log('decrypting...')

    shell.exec(command, { silent: true }, (code, stdout, stderr) => {
      if (code !== 0) {
        console.log('Failed when decrypt file')
        rs(null)
      }
      rs(stdout)
    })
  })

  console.log(decryption)
  if (decryption === null) {
    return rs.render('decrypt', { error: 'Failed when decrypting file' })
  }

  // send encrypted file to user
  return rs.download(path.resolve(`./decrypted/${decryptedFilename}`))
})

app.listen(8989, _ => console.log('Running on 8989'))