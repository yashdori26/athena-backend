const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  firebaseUid: { type: String, unique: true, sparse: true },
  fcmToken: { type: String }, // For Firebase Cloud Messaging Push Notifications
  password: { type: String, required: false }, // No longer required for Firebase Auth users
  tier: { type: String, enum: ['free', 'pro'], default: 'free' },
  apiGenerationsToday: { type: Number, default: 0 },
  lastGenerationDate: { type: Date },
}, { timestamps: true });

// Keep legacy password hash for backwards compatibility or dev mode
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
