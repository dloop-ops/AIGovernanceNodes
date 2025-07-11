
export const handler = async (event, context) => {
  const requiredEnvVars = [
    'ETHEREUM_RPC_URL',
    'AI_NODE_1_PRIVATE_KEY',
    'AI_NODE_2_PRIVATE_KEY',
    'AI_NODE_3_PRIVATE_KEY',
    'AI_NODE_4_PRIVATE_KEY',
    'AI_NODE_5_PRIVATE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => 
    !process.env[varName] || 
    process.env[varName].includes('YOUR_') ||
    process.env[varName].includes('Set in')
  );

  const hasValidConfig = missingVars.length === 0;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: hasValidConfig ? 'healthy' : 'configuration_error',
      timestamp: new Date().toISOString(),
      environment: {
        hasValidRpcUrl: !!process.env.ETHEREUM_RPC_URL && !process.env.ETHEREUM_RPC_URL.includes('YOUR_'),
        hasPrivateKeys: requiredEnvVars.slice(1).every(key => !!process.env[key] && !process.env[key].includes('YOUR_')),
        missingVars: missingVars.length > 0 ? missingVars : undefined
      }
    })
  };
};
