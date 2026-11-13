import {defineConfig} from '@playwright/test';
const remote=process.env.ONLINE_SERVICE;
export default defineConfig({
  testDir:'./e2e-online',workers:1,timeout:remote?90000:45000,
  use:{baseURL:'http://localhost:4173/puzzle-games/',channel:process.platform==='win32'?'chrome':undefined,headless:true,trace:'retain-on-failure'},
  webServer:[
    {command:'npm run preview -- --port 4173 --strictPort',url:'http://localhost:4173/puzzle-games/',reuseExistingServer:false},
    ...(remote?[]:[{command:`npx wrangler dev --ip 127.0.0.1 --port 8787 --persist-to .wrangler/tests-${Date.now()}`,url:'http://127.0.0.1:8787/health',reuseExistingServer:false,timeout:60000}])
  ]
});
