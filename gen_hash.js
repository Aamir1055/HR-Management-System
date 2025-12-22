const bcrypt = require('bcryptjs');
const password = 'Fasahaty@#786';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
