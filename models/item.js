const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      minLength: 2,
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    isShow: {
      type: Boolean,
      default: false,
    },
    quantity: {
      type: Number,
      default: 0,
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
  },
});

module.exports = mongoose.model('Item', itemSchema);
