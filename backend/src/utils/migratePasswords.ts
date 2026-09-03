import bcrypt from 'bcryptjs';
import { User } from '../models/User.model';

/**
 * Scans MongoDB User collection and migrates any plaintext password
 * fields to secure bcrypt hashes ($2a$10$...).
 * Never logs or exposes the password contents.
 */
export const migratePlaintextPasswords = async (): Promise<number> => {
  try {
    const usersWithPassword = await User.find({}).select('+password');
    let migratedCount = 0;

    for (const user of usersWithPassword) {
      if (!user.password) continue;

      const isBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password);

      if (!isBcryptHash) {
        // Plaintext detected: Hash securely with bcrypt
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        migratedCount++;
      }
    }

    if (migratedCount > 0) {
      console.log(`🔐 [Security]: Successfully migrated ${migratedCount} plaintext user password(s) to bcrypt hashes.`);
    }

    return migratedCount;
  } catch (error) {
    console.error('⚠️ [Security]: Error during password hash migration:', error);
    return 0;
  }
};
