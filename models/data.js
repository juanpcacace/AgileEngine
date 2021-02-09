const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dataSchema = new Schema({
    id: {
        type: String
    },
    author: {
        type: String
    },
    camera: {
        type: String
    },
    tags: {
        type: String
    },
    cropped_picture: {
        type: String
    },
    full_picture: {
        type: String
    }
});

var Datas = mongoose.model('Data', dataSchema);

module.exports = Datas;