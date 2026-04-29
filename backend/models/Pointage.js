const mongoose = require('mongoose');

const pointageSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  heure: { type: String, required: true },
  type: { type: String, enum: ['entree', 'sortie'], required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  valide: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Pointage', pointageSchema);