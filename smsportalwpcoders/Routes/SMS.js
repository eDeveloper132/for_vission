import express from 'express';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import { MessageModel } from '../Schema/Post.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import XLSX from 'xlsx';
import { SignModel } from '../Schema/Post.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
// Route to serve the HTML file
router.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Views/sms.html'));
});
// POST route to handle SMS sending
router.post('/', async (req, res) => {
    const { phonecode, phonenumber, message } = req.body;
    if (!phonecode || !phonenumber || !message) {
        console.log('Server Error 400: Missing required fields');
        return res.status(400).json({ error: 'Please fill in all the required fields: phone code, phone number, and message.' });
    }
    const user = res.locals.user;
    const packageName = user?.Details?.PackageName;
    const coins = user?.Details?.Coins;
    if (!packageName || !coins) {
        console.log('Server Error 403: User package details are incomplete.');
        return res.status(403).json({ error: 'You cannot send SMS. Please buy our package first.' });
    }
    const mix = `${phonecode}${phonenumber}`;
    console.log(`We are delivering this message: ${message} to ${mix}`);
    try {
        // Send SMS via VeevoTech API using POST method
        const response = await axios.post('https://api.veevotech.com/v3/sendsms', null, {
            params: {
                apikey: '91a422500fe4afbe412eb7b34242f209', // Replace with your actual API key
                receivernum: mix,
                textmessage: message,
                receivernetwork: '', // Optional, add if needed
                sendernum: '', // Optional, leave empty for default
                header: '' // Optional, add if needed
            }
        });
        console.log(response.data);
        if (response.data.STATUS === 'SUCCESSFUL') {
            const userData = user;
            const userId = userData.user._id;
            const dbUser = await SignModel.findById(userId);
            if (!dbUser) {
                return res.status(404).send('User not found');
            }
            if (!dbUser.Details) {
                return res.status(400).send('User details not found');
            }
            // Deduct one coin from the user's balance
            let coins = dbUser.Details.Coins;
            if (typeof coins === "number") {
                coins -= 1;
                if (coins <= 0) {
                    return res.status(400).send('Insufficient coins for sending message');
                }
                dbUser.Details.Coins = coins;
            }
            // Create a new message entry in the database
            const newMessage = await MessageModel.create({
                id: uuidv4(),
                u_id: dbUser._id,
                from: 'Default',
                to: mix,
                message: message,
                m_count: 1,
                m_schedule: 'NOT PROVIDED',
                status: "SUCCESS"
            });
            // Add the message to the user's messages array and save the user
            const messageId = newMessage._id;
            dbUser.messages.push(messageId);
            await dbUser.save();
            console.log('Data Updated Successfully', dbUser);
            res.status(200).json({ message: 'Message sent successfully!' });
        }
        else {
            console.error('Failed to send message:', response.data);
            res.status(500).json({ error: 'Failed to send SMS. Please try again later.' });
        }
    }
    catch (err) {
        console.error(err.response ? err.response.data : err.message);
        res.status(500).json({ error: 'Failed to send SMS. Please try again later.' });
    }
});
const upload = multer({
    dest: 'addnumbersbyexcel/' // Path where uploaded files will be stored
});
router.get('/addnumbersbyexcel', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Views/multipleexcel.html'));
});
router.post('/addnumbersbyexcel', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Load the file
        const workbook = XLSX.readFile(path.resolve(file.path));
        const sheetName = workbook.SheetNames[0]; // Read the first sheet
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        // Assuming the sheet has 'Name' and 'PhoneNumber' columns
        const extractedData = sheet.map((row) => ({
            name: row.Name,
            phoneNumber: row.PhoneNumber
        }));
        // Send extracted data as JSON response
        res.status(200).json({ data: extractedData });
    }
    catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ message: 'Failed to process the file' });
    }
});
router.get('/addnumbers', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Views/multiple.html'));
});
router.post('/addnumbers', async (req, res) => {
    const { name, phonecode, phonenumber } = req.body;
    const user = res.locals.user;
    const userId = user?._id;
    if (!name || !phonecode || !phonenumber) {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }
    const mix = `${phonecode}${phonenumber}`;
});
router.post('/saveAllNumbers', async (req, res) => {
    const { numbers } = req.body;
    console.log(numbers);
    const user = res.locals.user;
    const userId = user?._id;
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ success: false, message: 'No numbers provided' });
    }
});
router.post('/savenumber', async (req, res) => {
    const { name, phoneNumber } = req.body;
    // console.log(req.body);
    const user = res.locals.user;
    const userId = user?._id;
    if (!name || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }
    console.log(name, phoneNumber);
    const mix = `+${phoneNumber}`;
    console.log(mix);
});
router.get('/getnumbers', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Views/numberDetails.html'));
});
router.post('/getnumbers', async (req, res) => {
});
router.delete('/deletenumber', async (req, res) => {
});
router.get('/bulksms', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Views/bulksms.html'));
});
router.post('/bulksms', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        console.log('Server Error 400: Missing required fields');
        return res.status(400).json({ error: 'Please provide a message to send.' });
    }
    const user = res.locals.user;
    const packageName = user?.Details?.PackageName;
    const coins = user?.Details?.Coins;
    if (!packageName || typeof coins !== 'number') {
        console.log('Server Error 403: User package details are incomplete.');
        return res.status(403).json({ error: 'You cannot send SMS. Please buy our package first.' });
    }
    const phoneNumbers = user?.multiple_message?.Phone_Numbers;
    // if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    //     console.log('Server Error 400: No phone numbers found');
    //     return res.status(400).json({ error: 'No phone numbers available to send the message.' });
    // }
    if (coins < phoneNumbers.length) {
        return res.status(400).send('Insufficient coins for sending all messages');
    }
    try {
        const userData = res.locals.user;
        const userId = userData.user._id;
        const dbUser = await SignModel.findById(userId);
        if (!dbUser) {
            return res.status(404).send('User not found');
        }
        if (!dbUser.Details || typeof dbUser.Details.Coins !== 'number') {
            console.log('User details or coins are missing or invalid:', dbUser.Details);
            return res.status(400).send('User details not found or coins are not valid');
        }
        // Deduct coins for each message sent
        dbUser.Details.Coins -= phoneNumbers.length;
        for (const phoneNumber of phoneNumbers) {
            const response = await axios.post('https://api.veevotech.com/v3/sendsms', null, {
                params: {
                    apikey: '91a422500fe4afbe412eb7b34242f209', // Replace with your actual API key
                    receivernum: phoneNumber,
                    textmessage: message,
                    receivernetwork: '', // Optional, add if needed
                    sendernum: '', // Optional, leave empty for default
                    header: '' // Optional, add if needed
                }
            });
            console.log(response.data);
            if (response.data.STATUS === 'SUCCESSFUL') {
                const newMessage = await MessageModel.create({
                    id: uuidv4(),
                    u_id: dbUser._id,
                    from: 'Default',
                    to: phoneNumber,
                    message: message,
                    m_count: 1,
                    m_schedule: 'NOT PROVIDED',
                    status: "SUCCESS"
                });
                const messageId = newMessage._id;
                dbUser.messages.push(messageId);
            }
        }
        await dbUser.save();
        console.log('Data Updated Successfully', dbUser);
        res.status(200).json({ message: 'Messages sent successfully to all numbers!' });
    }
    catch (err) {
        console.error(err.response ? err.response.data : err.message);
        res.status(500).json({ error: 'Failed to send SMS. Please try again later.' });
    }
});
router.get('/messages', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Views/messageslist.html'));
});
// API endpoint to fetch messages
router.get('/api/messages', async (req, res) => {
    try {
        const useri = res.locals.user;
        const userId = useri._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Find the user by their ID and populate the messages field
        const user = await SignModel.findById(userId).populate('messages').exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Send the user's messages as a response
        res.status(200).json({ messages: user.messages });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
export default router;
