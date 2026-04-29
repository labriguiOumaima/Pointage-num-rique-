const Conge = require('../models/Conge');

// Créer une demande de congé
exports.createConge = async (req, res) => {
  try {
    const { date_debut, date_fin, type } = req.body;

    const conge = await Conge.create({
      user_id: req.user.id,
      date_debut,
      date_fin,
      type,
      statut: 'en_attente'
    });

    res.status(201).json({ message: 'Demande de congé envoyée', conge });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Récupérer les congés
exports.getConges = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'employe') filter.user_id = req.user.id;

    const conges = await Conge.find(filter).populate('user_id', 'nom email');
    res.json(conges);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Valider ou refuser un congé (admin)
exports.updateConge = async (req, res) => {
  try {
    const { statut } = req.body;

    const conge = await Conge.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true }
    );

    res.json({ message: 'Statut mis à jour', conge });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};