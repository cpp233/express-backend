const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
      },
    ],
  },
  { _id: true }
);

tagSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;

    // delete returnedObject.items;
    // delete returnedObject.id;
  },
});

tagSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Tag', tagSchema);
