const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const Tag = require('../models/tag');

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      minLength: 2,
      required: true,
      unique: true,
    },
    quantity: {
      type: Number,
      default: 0,
      // $toString: '$quantityN',
    },
    content: {
      type: String,
      default: '',
    },
    tagList: {
      type: [String],
      // default: [],
      default: undefined,
      // index: true,
    },
    tagList2: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Tag',
      default: undefined,
    },

    isShow: {
      type: Boolean,
      default: false,
    },
    coverImg: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

itemSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;

    // date
    delete returnedObject.createdAt;
    delete returnedObject.updatedAt;
  },
});

// itemSchema.index({
//   name: 'text',
//   quantity: 'text',
//   content: 'text',
//   // tagList: 'text',
//   // tagList2: 'text',
//   // tagList2: 1,
// });

itemSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Item', itemSchema);
