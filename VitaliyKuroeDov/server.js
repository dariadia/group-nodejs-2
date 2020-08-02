const express = require('express')
const consolidate = require('consolidate')
const path = require('path')
const port = 4000
const request = require('request')
const cheerio = require('cheerio')
const app = express()
const Handlebars = require('handlebars')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const taskMongoose = require('./src/models/taskMongo')

mongoose.connect('mongodb://127.0.0.1:27017/GB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: true
})

let news

Handlebars.registerHelper("list", (context, options) => {
    let ret = `<ol class="list">`;
    for ((key) in context) {
        ret = ret + `<li id=${key} class="list__item">` + options.fn({ ...context[key], key }) + "</li>"
    }
    return ret + "</ol>";
})

let users = {
    oleg: {
        username: 'Oleg',
        age: 30,
        defaultNews: 3
    },
    irina: {
        username: 'Irina',
        age: 18,
        defaultNews: 10
    }
}

const getNews = () => {
    request('https://habr.com', (err, res, body) => {
        if (!err && res.statusCode === 200) {
            news = {}
            const $ = cheerio.load(body)

            $('div[class="posts_list"]').find('a[class="post__title_link"]').each((idx, elem) => {
                const title = $(elem).text()
                const link = $(elem).attr('href')
                news = { ...news, [idx]: { title: title, link: link } }
            })
        }
        return news
    })
}

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.engine('hbs', consolidate.handlebars)
app.set('view engine', 'hbs')
app.set('views', path.resolve(__dirname, './views'))

app.get('/', (req, res) => {
    for (key in users) {
        key.defaultNews = req.cookies[key]
    }
    res.render('index')
})

app.get('/news', (req, res) => {
    res.render('news', { news })
})

app.get('/users', (req, res) => {
    res.render('users', { users })
})

app.get('/users/:username', (req, res) => {
    const user = users[req.params.username] ? users[req.params.username] : users['irina']
    res.render('user', { user, news, id: req.params.username })

})

app.post('/users/:username/news', (req, res, next) => {
    const user = { username: req.body.username, countNews: req.body.newsCountDisplay !== '' ? req.body.newsCountDisplay : '15', news: {} }
    const userName = req.body.username
    const userNews = req.body.newsCountDisplay !== '' ? req.body.newsCountDisplay : users[userName].defaultNews

    res.cookie(`${userName}`, userNews, { expires: new Date(Date.now() + 900000), httpOnly: true })

    for (let i = 0; i < req.cookies[userName]; i++) {
        user.news = { ...user.news, [i]: { title: news[i].title, link: news[i].link } }

    }
    res.render('newsList', user)
})

app.get('/tasks', async (req, res) => {
    const tasksList = await taskMongoose.find({}).lean()
    res.render('tasks', { tasksList })
})

app.post('/tasks', async (req, res) => {

    if (req.body.title === '') {
        res.redirect('/tasks')
    } else {
        const newTask = new taskMongoose(req.body)
        const saveTaks = await newTask.save()

        res.redirect('/tasks')
    }
})

app.put('/tasks', async (req, res) => {

    if(req.body._id) {
        const searchTask = await taskMongoose.findById(req.body._id)
        const status = !searchTask.complited 
        console.log(status)

        searchTask.set( 'complited', status )
        searchTask.save()

        res.send({status: 'ok'})
    }
})

app.delete('/tasks', async (req, res) => {
    if(req.body._id) {
        const delTasks = await taskMongoose.findByIdAndDelete(req.body)
        const tasksList = await taskMongoose.find(req.body).lean()
        console.log(tasksList)

        if (tasksList.length <= 0 ) {
            res.send({status: 'ok'})

        } else {
            res.redirect('/tasks')
        }
    }
})

const init = () => {
    getNews()
    console.log(`Server stat in ${port}`)
}
app.listen(port, () => {
    init()
})