const { chromium } = require('playwright');

async function debugLiveApp() {
  console.log('🔍 DEBUGGING LIVE APPLICATION');
  console.log('============================\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console messages from the browser
  page.on('console', msg => {
    console.log(`🌐 Browser Console: ${msg.text()}`);
  });
  
  try {
    console.log('1. Testing main portal page...');
    await page.goto('http://globeco.local:31510', { waitUntil: 'networkidle' });
    console.log('   ✅ Portal loaded successfully');
    
    console.log('2. Testing health API endpoint...');
    const healthResponse = await page.goto('http://globeco.local:31510/api/health');
    const healthStatus = healthResponse.status();
    const healthText = await healthResponse.text();
    console.log(`   📊 Health API Status: ${healthStatus}`);
    console.log(`   📋 Health Response: ${healthText.substring(0, 200)}...`);
    
    console.log('3. Testing telemetry test endpoint...');
    const telemetryResponse = await page.goto('http://globeco.local:31510/api/telemetry/test');
    const telemetryStatus = telemetryResponse.status();
    const telemetryText = await telemetryResponse.text();
    console.log(`   📊 Telemetry API Status: ${telemetryStatus}`);
    console.log(`   📋 Telemetry Response: ${telemetryText.substring(0, 200)}...`);
    
    console.log('4. Checking Prometheus for custom metrics...');
    const prometheusPage = await browser.newPage();
    await prometheusPage.goto('http://node-2:31565');
    
    // Search for our custom metrics
    const customMetrics = [
      'api_requests_total',
      'page_views_total', 
      'errors_total',
      'db_operations_total'
    ];
    
    for (const metric of customMetrics) {
      console.log(`   🔍 Searching for metric: ${metric}`);
      await prometheusPage.goto(`http://node-2:31565/graph?g0.expr=${metric}&g0.tab=1&g0.stacked=0&g0.show_exemplars=0&g0.range_input=1h`);
      await prometheusPage.waitForTimeout(1000);
      
      const pageContent = await prometheusPage.content();
      if (pageContent.includes(metric) && pageContent.includes('globeco-portfolio-management-portal')) {
        console.log(`   ✅ Found metric: ${metric}`);
      } else {
        console.log(`   ❌ Missing metric: ${metric}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugLiveApp();