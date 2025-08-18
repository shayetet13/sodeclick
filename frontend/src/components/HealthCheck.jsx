import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { feelFreePayAPI } from '../services/feelfreepayAPI';

const HealthCheck = () => {
  // Mock user data for testing
  const user = {
    _id: 'test-user-123',
    displayName: 'Test User',
    email: 'test@example.com'
  };
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testFeelFreePayAPI = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const testData = {
        plan: {
          _id: 'test-plan',
          name: 'Premium Plan',
          tier: 'premium',
          price: {
            amount: 299,
            currency: 'THB'
          }
        },
        userInfo: {
          userId: user?._id || user?.id || 'user123',
          name: user?.displayName || 'Test User',
          email: user?.email || 'test@example.com',
          phone: '0800000000',
          address: 'Bangkok, Thailand'
        }
      };

      console.log('Testing FeelFreePay API with data:', testData);
      
      const result = await feelFreePayAPI.createPayment(testData);
      
      console.log('FeelFreePay API test result:', result);
      
      setTestResult({
        success: true,
        data: result,
        message: 'FeelFreePay API test successful!'
      });
    } catch (error) {
      console.error('FeelFreePay API test error:', error);
      
      setTestResult({
        success: false,
        error: error.message,
        message: 'FeelFreePay API test failed!'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔧 API Health Check
          </CardTitle>
          <CardDescription>
            Test the FeelFreePay API integration to ensure it's working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Current User Info:</h4>
            <pre className="text-sm text-blue-800 bg-blue-100 p-2 rounded">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          <Button 
            onClick={testFeelFreePayAPI} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test FeelFreePay API'}
          </Button>

          {testResult && (
            <div className={`p-4 rounded-lg ${
              testResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                testResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {testResult.message}
              </h4>
              
              {testResult.success ? (
                <div className="space-y-2">
                  <div className="text-sm text-green-800">
                    <strong>Reference No:</strong> {testResult.data.referenceNo}
                  </div>
                  <div className="text-sm text-green-800">
                    <strong>Amount:</strong> {testResult.data.amount} {testResult.data.currency}
                  </div>
                  <div className="text-sm text-green-800">
                    <strong>Is Mock:</strong> {testResult.data.isMock ? 'Yes' : 'No'}
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-green-800">
                      View Full Response
                    </summary>
                    <pre className="text-xs text-green-700 bg-green-100 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-sm text-red-800">
                  <strong>Error:</strong> {testResult.error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthCheck;
