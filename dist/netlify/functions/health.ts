
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  console.log('🏥 Health check function triggered');
  
  try {
    // Check environment variables
    const envCheck = {
      ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL ? 'SET' : 'MISSING',
      ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY ? 'SET' : 'MISSING',
      ASSET_DAO_CONTRACT_ADDRESS: process.env.ASSET_DAO_CONTRACT_ADDRESS ? 'SET' : 'MISSING',
      DLOOP_TOKEN_ADDRESS: process.env.DLOOP_TOKEN_ADDRESS ? 'SET' : 'MISSING'
    };
    
    // Check AI node keys
    const nodeKeys = {};
    for (let i = 1; i <= 5; i++) {
      const key = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
      nodeKeys[`AI_NODE_${i}_PRIVATE_KEY`] = key ? 'SET' : 'MISSING';
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'operational',
        timestamp: new Date().toISOString(),
        environment: envCheck,
        nodeKeys: nodeKeys,
        version: '2.0.0-netlify'
      }, null, 2)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
