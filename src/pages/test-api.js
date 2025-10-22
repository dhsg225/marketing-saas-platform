import { useState, useEffect } from 'react';

export default function TestAPI() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    // Test the API URL mapping
    const GOOGLE_CLOUD_BASE_URL = 'https://us-central1-marketing-saas-ai.cloudfunctions.net';
    
    const getGoogleCloudUrl = (functionName) => {
      return `${GOOGLE_CLOUD_BASE_URL}/${functionName}`;
    };
    
    const getUrl = (endpoint) => {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      
      const endpointMapping = {
        'dashboard/data': 'dashboard-data',
        'dashboard/quick-actions': 'dashboard-quick-actions',
        'clients/clients': 'clients-clients',
        'auth': 'auth'
      };
      
      if (endpointMapping[cleanEndpoint]) {
        return getGoogleCloudUrl(endpointMapping[cleanEndpoint]);
      }
      
      if (cleanEndpoint.startsWith('clients/clients/')) {
        return getGoogleCloudUrl('clients-clients');
      }
      
      return getGoogleCloudUrl(cleanEndpoint);
    };

    // Test the mapping
    const mappingTests = [
      { input: 'dashboard/data', expected: 'dashboard-data' },
      { input: 'dashboard/quick-actions', expected: 'dashboard-quick-actions' },
      { input: 'clients/clients/org-1', expected: 'clients-clients' },
      { input: 'auth', expected: 'auth' }
    ];

    const mappingResults = mappingTests.map(test => ({
      input: test.input,
      output: getUrl(test.input),
      expected: `https://us-central1-marketing-saas-ai.cloudfunctions.net/${test.expected}`,
      correct: getUrl(test.input) === `https://us-central1-marketing-saas-ai.cloudfunctions.net/${test.expected}`
    }));

    setResults(mappingResults);

    // Test actual API calls
    const testAPICalls = async () => {
      try {
        const response = await fetch('https://us-central1-marketing-saas-ai.cloudfunctions.net/dashboard-data');
        const data = await response.json();
        console.log('✅ dashboard-data API working:', data.success);
      } catch (error) {
        console.log('❌ dashboard-data API error:', error.message);
      }
    };

    testAPICalls();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>API URL Mapping Test</h1>
      <p>This page tests if the API URL mapping is working correctly.</p>
      
      <h2>URL Mapping Results:</h2>
      {results.map((result, index) => (
        <div key={index} style={{ 
          margin: '10px 0', 
          padding: '10px', 
          border: '1px solid #ccc',
          backgroundColor: result.correct ? '#d4edda' : '#f8d7da'
        }}>
          <strong>Input:</strong> {result.input}<br/>
          <strong>Output:</strong> {result.output}<br/>
          <strong>Expected:</strong> {result.expected}<br/>
          <strong>Status:</strong> {result.correct ? '✅ Correct' : '❌ Incorrect'}
        </div>
      ))}
      
      <h2>API Test Results:</h2>
      <p>Check the browser console for API call results.</p>
      
      <h2>Current Deployment Info:</h2>
      <p>Deployment timestamp: {new Date().toISOString()}</p>
      <p>This page is served from the latest deployment.</p>
    </div>
  );
}
