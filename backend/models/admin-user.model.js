import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROLES = ['super_admin', 'admin'];

const adminUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'admin',
    },
    lastLoginAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
adminUserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
adminUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name virtual
adminUserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON output
adminUserSchema.set('toJSON', { virtuals: true });
adminUserSchema.set('toObject', { virtuals: true });

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

export default AdminUser;
export { ROLES };
