// Utility script to generate password hash for admin credentials
const { generatePasswordHash } = require('./auth.js');
const fs = require('fs');
const path = require('path');

async function setupAdminPassword() {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Enter admin password: ', async (password) => {
        if (password.length < 6) {
            console.log('❌ Password must be at least 6 characters long');
            readline.close();
            return;
        }

        const hash = await generatePasswordHash(password);

        const credentials = {
            username: 'admin',
            passwordHash: hash
        };

        const credPath = path.join(__dirname, 'admin-credentials.json');
        fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));

        console.log('✅ Admin credentials saved successfully!');
        console.log('Username: admin');
        console.log('Password: [hidden]');
        console.log('\nYou can now login to the admin interface.');

        readline.close();
    });
}

setupAdminPassword();
