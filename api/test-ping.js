export default function handler(req, res) {
  return res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    method: req.method,
    body: req.body,
    message: 'Backend is alive!'
  });
}
