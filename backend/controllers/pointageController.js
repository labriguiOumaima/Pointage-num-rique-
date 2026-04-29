const Pointage = require('../models/Pointage');

// Créer un pointage
exports.createPointage = async (req, res) => {
  try {
    const { type, latitude, longitude, valide } = req.body;
    const now = new Date();

    const pointage = await Pointage.create({
      user_id: req.user.id,
      date: now.toISOString().split('T')[0],
      heure: now.toTimeString().split(' ')[0].slice(0, 5),
      type,
      latitude,
      longitude,
      valide: valide || false
    });

    res.status(201).json({ message: 'Pointage enregistré', pointage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Récupérer les pointages
exports.getPointages = async (req, res) => {
  try {
    const { date, user_id } = req.query;
    let filter = {};

    if (date) filter.date = date;
    if (user_id) filter.user_id = user_id;
    if (req.user.role === 'employe') filter.user_id = req.user.id;

    const pointages = await Pointage.find(filter).populate('user_id', 'nom email');
    res.json(pointages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};