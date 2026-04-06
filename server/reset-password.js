const bcrypt = require('bcryptjs');
const fs = require('fs');

const NEW_PASSWORD = 'eklavya123';

bcrypt.hash(NEW_PASSWORD, 10).then(hash => {
    const creds = { username: 'admin', passwordHash: hash };
    fs.writeFileSync('admin-credentials.json', JSON.stringify(creds, null, 2));
    console.log('✅ Password reset successfully!');
    console.log('Username : admin');
    console.log('Password : ' + NEW_PASSWORD);
});
