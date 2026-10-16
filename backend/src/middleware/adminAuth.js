export default function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Admin token yok veya geçersiz' } });
  }
  const token = authHeader.split(' ')[1];
  
  const expectedToken = `admin-token-${process.env.ADMIN_PASSWORD}`;
  if (token !== expectedToken) {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Geçersiz token' } });
  }
  next();
}
