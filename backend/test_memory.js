require('dotenv').config({ path: '.env' });
const { createClass } = require('./src/controllers/class.controller.ts');
// ts-node is needed to run TS file, but I can just use a tiny TS runner.
