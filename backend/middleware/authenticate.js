
import { auth } from '../firebase/admin.js';


export async function authenticate(req, res, next) {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No Authorization header or invalid format');
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'No authentication token provided' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      console.log('Empty token');
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'Invalid token format' 
      });
    }
 
    console.log('Verifying Firebase token...');
    const decodedToken = await auth.verifyIdToken(token);
    
    const user_id = decodedToken.uid;
    
    // SMOKE TEST: Console log the user_id
    console.log('Token verified!');
    console.log('   User ID:', user_id);
    console.log('   Email:', decodedToken.email);
    console.log('   Token issued at:', new Date(decodedToken.iat * 1000).toISOString());
    
    req.user_id = user_id;
    req.user_email = decodedToken.email;
    
    next();
    
  } catch (error) {
    console.error('Token verification failed:', error.message);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired' 
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ 
        error: 'INVALID_TOKEN',
        message: 'Invalid authentication token format' 
      });
    }
    
    return res.status(401).json({ 
      error: 'UNAUTHORIZED',
      message: 'Failed to verify authentication token' 
    });
  }
}

