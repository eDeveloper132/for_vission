import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { SignModel } from '../Schema/Post.js';
// Resolve file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
// Route to serve the HTML page
router.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Views/index.html'));
});
router.get('/changepass', (req, res) => {
    res.sendFile(path.resolve(__dirname, "../Views/changePass.html"));
});
router.post('/changepass', async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    if (!current_password || !new_password || !confirm_password) {
        return res.status(400).send('All fields are required.');
    }
    const user = res.locals.user;
    if (!user) {
        return res.status(404).send('User not found.');
    }
    try {
        // Verify current password
        const isMatch = await bcrypt.compare(current_password, user.Password);
        if (!isMatch) {
            return res.status(400).send('Current password is incorrect.');
        }
        // Check if new password matches confirmation password
        if (new_password !== confirm_password) {
            return res.status(400).send('New password and confirmation password do not match.');
        }
        // Hash new password and update it in the database
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await SignModel.findByIdAndUpdate(user._id, { Password: hashedPassword });
        res.send('Password changed successfully.');
    }
    catch (error) {
        console.error('Error changing password:', error);
        res.status(500).send({ error: `Error changing password: ${error.message}` });
    }
});
router.get('/candmlist', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Views/createList.html'));
});
router.post('/createList', async (req, res) => {
    console.log(req.body);
});
export default router;
