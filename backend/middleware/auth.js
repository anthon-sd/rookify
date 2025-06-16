const { jwtVerify } = require('jose');
const axios = require('axios');

const SUPABASE_JWT_ISSUER = 'https://YOUR_PROJECT_ID.supabase.co/auth/v1';
const JWKS_URL = `${SUPABASE_JWT_ISSUER}/.well-known/jwks.json`;

let jwks;

async function getJWKS() {
  if (!jwks) {
    const { data } = await axios.get(JWKS_URL);
    jwks = data;
  }
  return jwks;
}

async function verifySupabaseJWT(token) {
  const { keys } = await getJWKS();
  const key = await jose.importJWK(keys[0]);
  const { payload } = await jwtVerify(token, key, {
    issuer: SUPABASE_JWT_ISSUER,
    audience: SUPABASE_JWT_ISSUER,
  });
  return payload;
}

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = await verifySupabaseJWT(token);
    req.supabaseUser = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token', details: err.message });
  }
};
