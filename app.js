const express = require('express');
const app = express();
const axios = require('axios');
const port = 3000;
var config = require('./config');

//MongoDb
const mongoose = require('mongoose');
const {
    resourceUsage
} = require('process');

const Datas = require('./models/data');

const url = config.mongoUrl;
const connect = mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

connect
    .then((db) => {
        console.log('Connected correctly to server.');
    }, (err) => {
        console.log(err);
    });

//Functions
let token = null;

async function getToken() {
    try {
        const response = await axios.post('http://interview.agileengine.com/auth', config.credential);
        //console.log(response);
        if ((response.data.auth == true) && (response.data.token != null)) {
            token = response.data.token;
        } else {
            console.log('apiKey not valid or server crashed');
        }
    } catch (error) {
        console.error(error);
    }
}

async function dbUpdate(imageColecc) {
    try {
        let imageColeccFinal = await getimageAllInfo(imageColecc);
        //delete previous data
        await Datas.deleteMany({})
        //insert data
        await Datas.insertMany(imageColeccFinal);
        return console.log('Data updated');
    } catch (error) {
        console.error(error);
    }
}

async function getimageAllInfo(imageColecc) {
    try {
        let imageColeccFinal = [];
        await Promise.all(
            imageColecc.map(async (image) => {
                const response = await axios.get(`http://interview.agileengine.com/images/${image.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                imageColeccFinal.push(response.data);
            })
        );
        return imageColeccFinal;
    } catch (error) {
        console.error(error);
    }
}

async function getimageColecc(pagesTotal) {
    try {
        let imageColecc = [];
        let range = (start, end) => [...Array(end - start + 1)].map((_, i) => start + i);
        let iter = range(1, pagesTotal); //[1,2,3.....,pagesTotal]
        await Promise.all(
            iter.map(async (id) => {
                const response = await axios.get(`http://interview.agileengine.com/images?page=${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                response.data.pictures.forEach(element => {
                    imageColecc.push(element);
                });
            })
        );
        return imageColecc;
    } catch (error) {
        console.error(error);
    }
}

async function getImages() {
    try {
        let imageColecc = [];
        //let imageColeccFinal = [];
        let imagesPag1 = await axios.get('http://interview.agileengine.com/images', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if ((imagesPag1.data.pictures) && (!imagesPag1.data.hasMore)) { //check if only one page
            imagesPag1.data.pictures.forEach(element => {
                imageColecc.push(element);
            });

            await dbUpdate(imageColecc);

        } else if ((imagesPag1.data.pictures) && (imagesPag1.data.hasMore)) { //if several pages
            let pagesTotal = imagesPag1.data.pageCount;
            imageColecc = await getimageColecc(pagesTotal);

            await dbUpdate(imageColecc);

        } else {
            console.log('No data availabe');
        }
    } catch (error) {
        console.error(error);
        if (error.message == 'Request failed with status code 401') {
            await getToken(); //token renew
            await getImages();
        }
    }
}

async function getData() {
    try {
        if (token != null) {
            await getImages();
        } else {
            await getToken();
            await getImages();
        }
    } catch (error) {
        console.error(error);
    }
}

getData();
//update info in cache(MongoDb collection) every hour
let updateCache = async () => {
    await new Promise(resolve => setInterval(() => resolve(getData()), 3600000));
}
updateCache();

//routes
app.get('/', (req, res) => {
    res.send('Agile Engine app');
})

app.get('/search/:searchTerm', (req, res) => {
    Datas.find({
            $or: [{
                author: req.params.searchTerm
            }, {
                camera: req.params.searchTerm
            }, {
                tags: req.params.searchTerm
            }, {
                id: req.params.searchTerm
            }]
        }).then((data) => {
            if (data != null) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(data);
            }
        }, (err) => console.error(err))
        .catch((err) => console.error(err));
})

app.listen(port, () => {
    console.log(`Agile Engine app listening at http://localhost:${port}`);
})