import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

(async () => {
  try {
    console.log('Connecting to MongoDB Atlas at URI in .env...');
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log('  Database:', conn.connection.name);
    console.log('  Host:', conn.connection.host);

    const usersCollection = conn.connection.collection('users');
    const users = await usersCollection.find({}).toArray();
    console.log(`\nFound ${users.length} user(s) in Atlas 'users' collection:`);

    let migrated = 0;
    for (const u of users) {
      const pass = u.password || '';
      const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(pass);
      console.log(`- Email: ${u.email} | Name: ${u.name} | Role: ${u.role} | IsBcryptHash: ${isBcrypt}`);

      if (!isBcrypt && pass.length > 0) {
        console.log(`  ⚡ Migrating plaintext password for ${u.email} to bcrypt hash...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(pass, salt);
        await usersCollection.updateOne({ _id: u._id }, { $set: { password: hashedPassword } });
        migrated++;
      }
    }

    console.log(`\nMigration complete. Migrated ${migrated} user(s) to bcrypt hashes.`);

    // Verify after migration
    const updatedUsers = await usersCollection.find({}).toArray();
    console.log('\nPost-migration check:');
    for (const u of updatedUsers) {
      const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(u.password || '');
      console.log(`- Email: ${u.email} | Role: ${u.role} | ValidBcrypt: ${isBcrypt}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Atlas error:', err);
  }
})();
