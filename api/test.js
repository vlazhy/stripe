export default function handler(req, res) {
  return res.status(200).json({ message: 'Test OK', body: req.body });
}
