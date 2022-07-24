const express = require('express')
const app = express()
const mongoose = require('mongoose')

const bodyParser = require('body-parser')

let database
let ClassNameSchema
let ClassName

let TitleSchema
let Title
let DescriptionSchema
let Description

// 데이터베이스 연결 open
const connectDB = () => {
  const dbUrl = 'mongodb+srv://<username>:<password>@cluster0.xurzq.mongodb.net/?retryWrites=true&w=majority'
  // const dbUrl = 'mongodb://localhost:27017/local'
  console.log('데이터베이스 연결 시도!')
  // node js에선 window가 아닌 global이 root객체이다.
  mongoose.Promise = global.Promise
  mongoose.connect(dbUrl)
  database = mongoose.connection

  database.on('error', console.error.bind(console, 'mongoose connection error!'))

  database.on('open', () => {
    console.log(`데이터베이스에 연결되었습니다. ${dbUrl}`)
    // db의 형태를 미리 정의함
    // 그 외의 데이터를 받을 시 오류발생
    ClassNameSchema = mongoose.Schema({
      kor: String,
      eng: String,
      search_cnt: Number
    },
    {
      collection : 'class_name'
    })

    // db의 class_name collection을 스키마 기반으로 정의
    ClassName = mongoose.model('class_name', ClassNameSchema)

    TitleSchema = mongoose.Schema({
        title : String,
        timestamp : String,
    },
    {
      collection : 'title'
    })

    Title = mongoose.model('title', TitleSchema)

    DescriptionSchema = mongoose.Schema({
        title : String,
        description : String,
        timestamp : String,
    },
    {
      collection : 'description'
    })

    Description = mongoose.model('description', DescriptionSchema)
  })

  //연결이 끊어졌을때 5초후에 재 연결
  database.on('disconnected', () => {
    console.log('연결이 끊어졌습니다. 5초 후에 다시 연결합니다.')
    setTimeout(connectDB, 5000)
  })
}
// 데이터베이스 연결 close

app.use(bodyParser.json())
//CORS Middleware
app.use(function (req, res, next) {
//Enabling CORS
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT, DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization')
  next()
})


// API request open
app.get('/api/list', (req, res) => {
  ClassName.find({})
    .sort({search_cnt: -1})
    // .limit(20)
    .then(result => {
      res.send(result)
    })
})

app.get('/api/list/:id', (req, res) => {
  const value = req.params.id
  if (!value) {
    return res.status(400).json({error: 'Incorrect id'})
  }
  ClassName.updateOne({ kor: value}, {'$inc': { search_cnt: 1 }})
    .then(
      ClassName.find({kor: { '$regex' : value, '$options' : 'i' }})
        .sort({search_cnt: -1})
        .then(result => {
            res.send(result)
          }
        )
    )
})

app.post('/api/add', (req, res) => {
  const reqKor = req.body.kor
  const reqEng = req.body.eng
  if (!reqKor) {
    return res.status(400).json({status: 400, error: 'Incorrect data'})
  }

  ClassName.find({$and: [{kor: reqKor}, {eng: reqEng}]})
    .then(result => {
      if (result.length > 0) {
        return res.status(200).json({status: 201, error: 'Exist data'})
      }
      const newData = new ClassName(req.body)
      newData.save(newData)
      return res.status(200).json({status: 200})
    })
})

app.put('/api/update', async (req, res) => {
  const reqKor = req.body.kor
  const reqEng = req.body.eng
  const reqBeforeEng = req.body.before_eng
  if (!reqKor) {
    return res.status(400).json({status: 400, error: 'Incorrect data'})
  }

  ClassName.find({$and: [{kor: reqKor}, {eng: reqBeforeEng}]})
    .then(result => {
      if (result.length < 1) {
        return res.status(200).json({status: 201, error: 'Empty data'})
      }
      ClassName.updateOne({$and: [{kor: reqKor}, {eng: reqBeforeEng}]}, {'$set' : {eng : reqEng}})
        .then(async () => {
          await ClassName.find({kor: {'$regex': reqKor, '$options': 'i'}})
            .sort({search_cnt: -1})
            .then(result => {
                res.send(result)
              }
            )
        })
    })
})
// API request close

// api start

app.get('/api/vueStudy/title', (req, res) => {
  Title.find({})
    .then(result => {
      res.send(result)
    })
})

app.get('/api/vueStudy/details/:id', (req, res) => {
  const id = req.params.id
  Description.find({_id: id})
  // .sort()
    .then(result => {
      res.send(result)
    })
})

app.post('/api/vueStudy/add', (req, res) => {
  const titleBody = req.body.title
  const descriptionBody = req.body.description
  const newTitle = new Title(titleBody)
  newTitle.save(newTitle, (err, res) => {
    const body = {...titleBody, ...descriptionBody, _id: res.id}
    const newDescription = new Description(body)
    newDescription.save(newDescription)
  })
  // return res.status(200).json({status: 200})
})

app.put('/api/vueStudy/update', async (req, res) => {
  const id = req.body.id
  const description = req.body.description
  Description.updateOne({ _id: id}, {'description': description})
    .then(
      Description.find({ _id: id})
        .then(result => {
          res.send(result)
        })
    )
})

app.delete('/api/vueStudy/remove/:id', (req, res) => {
  const id = req.params.id
  console.log(id)
  Title.remove({_id: id}, (err, res) => {
    Description.deleteOne({_id: id}, (err, res) => {
      console.log('success')
    })
  })
})

// api end

app.listen(3000, () => {
  connectDB()
  console.log('Example app listening on port 3000!')
})
