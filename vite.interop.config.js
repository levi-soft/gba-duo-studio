import config from './vite.config.js';

// Optional sibling-repository gate. Normal Studio verification stays standalone.
export default {...config,test:{...config.test,include:['integration/**/*.test.ts']}};
