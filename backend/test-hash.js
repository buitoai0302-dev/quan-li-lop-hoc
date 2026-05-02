const bcrypt = require('bcrypt');

const run = async () => {
  const hash = await bcrypt.hash('123456', 10);
  console.log('New hash for 123456:', hash);
};

run();
