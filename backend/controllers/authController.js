const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
exports.register = async (req, res) => {
  try {
    const { nom, email, password, role } = req.body;

    const userExiste = await User.findOne({ email });
    if (userExiste) return res.status(400).json({ message: 'Email déjà utilisé' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ nom, email, password: hashedPassword, role });

    res.status(201).json({ message: 'Utilisateur créé avec succès', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user._id, nom: user.nom, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};