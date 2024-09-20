import express, { Request, Response } from 'express';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import { MessageModel } from '../Schema/Post.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { FetchUserDetails } from '../index.js';
import multer from 'multer';
import XLSX from 'xlsx';
import { SignModel } from '../Schema/Post.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Route to serve the HTML file
router.get('/', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../Views/sms.html'));
});

// POST route to handle SMS sending
router.post('/', async (req: Request, res: Response) => {
    const { phonecode, phonenumber, message } = req.body;

    if (!phonecode || !phonenumber || !message) {
        console.log('Server Error 400: Missing required fields');
        return res.status(400).json({ error: 'Please fill in all the required fields: phone code, phone number, and message.' });
    }

    const user = FetchUserDetails[0]?.user;
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
            const userData = FetchUserDetails[0];
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
            const messageId = newMessage._id as mongoose.Types.ObjectId;
            dbUser.messages.push(messageId);
            await dbUser.save();

            console.log('Data Updated Successfully', dbUser);
            res.status(200).json({ message: 'Message sent successfully!' });
        } else {
            console.error('Failed to send message:', response.data);
            res.status(500).json({ error: 'Failed to send SMS. Please try again later.' });
        }
    } catch (err: any) {
        console.error(err.response ? err.response.data : err.message);
        res.status(500).json({ error: 'Failed to send SMS. Please try again later.' });
    }
});

const upload = multer({
    dest: 'addnumbersbyexcel/' // Path where uploaded files will be stored
});

router.get('/addnumbersbyexcel',(req:Request , res:Response)=>{
    res.sendFile(path.resolve(__dirname, '../Views/multipleexcel.html'))
})

router.post('/addnumbersbyexcel', upload.single('file'), async(req:Request,res:Response)=>{
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
        const extractedData = sheet.map((row: any) => ({
            name: row.Name,
            phoneNumber: row.PhoneNumber
        }));

        // Send extracted data as JSON response
        res.status(200).json({ data: extractedData });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ message: 'Failed to process the file' });
    }
})

router.get('/addnumbers',(req: Request , res: Response )=>{
    res.sendFile(path.resolve(__dirname, '../Views/multiple.html'));
})

router.post('/addnumbers', async (req: Request, res: Response) => {
    const { name, phonecode, phonenumber } = req.body;

    const user = FetchUserDetails[0]?.user;
    const userId = user?._id;

    if (!name || !phonecode || !phonenumber) {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const mix = `${phonecode}${phonenumber}`;

    try {
        if (!userId) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = await SignModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Ensure multiple_message and its fields are initialized
        user.multiple_message = user.multiple_message || { Name: [], Phone_Numbers: [] };
        user.multiple_message.Name = user.multiple_message.Name ?? [];
        user.multiple_message.Phone_Numbers = user.multiple_message.Phone_Numbers ?? [];

        // Check if the number already exists
        if (user.multiple_message.Phone_Numbers.includes(mix)) {
            return res.status(400).json({ success: false, message: 'Number already exists' });
        }

        if (user.multiple_message.Name.includes(name)) {
            return res.status(400).json({ success: false, message: 'Name already exists' });
        }

        // Add the name and number to the arrays
        user.multiple_message.Name.push(name);
        user.multiple_message.Phone_Numbers.push(mix);

        // Save the updated user document
        await user.save();

        res.json({ success: true, message: `Number added successfully: ${mix}` });
    } catch (error) {
        console.error('Error adding number:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.post('/saveAllNumbers', async (req: Request, res: Response) => {
    const { numbers } = req.body;
    console.log(numbers);
    
    const user = FetchUserDetails[0]?.user;
    const userId = user?._id;
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ success: false, message: 'No numbers provided' });
    }

    try {
        // Find the user by ID
        const user = await SignModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Initialize multiple_message and its fields if they are undefined
        user.multiple_message = user.multiple_message || { Name: [], Phone_Numbers: [] };
        user.multiple_message.Name = user.multiple_message.Name || [];
        user.multiple_message.Phone_Numbers = user.multiple_message.Phone_Numbers || [];

        let addedNumbers = [];

        for (const item of numbers) {
            const { name, phoneNumber } = item;

            if (!name || !phoneNumber) {
                continue; // Skip if either name or phone number is missing
            }

            const formattedNumber = `+${phoneNumber}`;
            console.log(formattedNumber);
            console.log(user);
            
            

            // Check if the number or name already exists in the user's record
            if (!user.multiple_message.Phone_Numbers.includes(formattedNumber) && 
                !user.multiple_message.Name.includes(name)) {
                user.multiple_message.Phone_Numbers.push(formattedNumber);
                user.multiple_message.Name.push(name);
                addedNumbers.push({ name, phoneNumber: formattedNumber });
            }
        }

        // Save the user with the new numbers
        await user.save();

        res.json({ success: true, message: `${addedNumbers.length} numbers added successfully`, data: addedNumbers });
    } catch (error) {
        console.error('Error saving numbers:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});


router.post('/savenumber', async (req: Request, res: Response) => {
    const { name , phoneNumber } = req.body;
    // console.log(req.body);
    

    const user = FetchUserDetails[0]?.user;
    const userId = user?._id;

    if (!name || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }
    console.log(name , phoneNumber);
    
    const mix = `+${phoneNumber}`;
    console.log(mix);
    
    try {
        if (!userId) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = await SignModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Ensure multiple_message and its fields are initialized
        user.multiple_message = user.multiple_message || { Name: [], Phone_Numbers: [] };
        user.multiple_message.Name = user.multiple_message.Name ?? [];
        user.multiple_message.Phone_Numbers = user.multiple_message.Phone_Numbers ?? [];

        // Check if the number already exists
        if (user.multiple_message.Phone_Numbers.includes(mix)) {
            return res.status(400).json({ success: false, message: 'Number already exists' });
        }

        if (user.multiple_message.Name.includes(name)) {
            return res.status(400).json({ success: false, message: 'Name already exists' });
        }

        // Add the name and number to the arrays
        user.multiple_message.Name.push(name);
        user.multiple_message.Phone_Numbers.push(mix);

        // Save the updated user document
        await user.save();

        res.json({ success: true, message: `Number added successfully: ${mix}` });
    } catch (error) {
        console.error('Error adding number:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});



router.get('/getnumbers',(req: Request , res: Response )=>{
    res.sendFile(path.resolve(__dirname, '../Views/numberDetails.html'));
})


router.post('/getnumbers', async (req: Request, res: Response) => {
    try {
        const userId = FetchUserDetails[0]?.user?._id;

        // Fetch the sign record for the user by ID
        const signRecord = await SignModel.findById(userId).select('multiple_message.Phone_Numbers multiple_message.Name');

        if (!signRecord) {
            return res.status(404).json({ message: 'Sign record not found' });
        }

        const phoneNumbers = signRecord.multiple_message.Phone_Numbers || [];
        const names = signRecord.multiple_message.Name || [];

        // Ensure both arrays are of the same length
        const maxLength = Math.max(phoneNumbers.length, names.length);

        const extendedPhoneNumbers = phoneNumbers.concat(new Array(maxLength - phoneNumbers.length).fill(''));
        const extendedNames = names.concat(new Array(maxLength - names.length).fill('Unknown'));

        res.json({ phoneNumbers: extendedPhoneNumbers, names: extendedNames });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


router.delete('/deletenumber', async (req, res) => {
    try {
        const { phoneNumber, Name } = req.body;
        
        // Log request body to ensure correct data is being sent
        console.log('Request Body:', { phoneNumber, Name });

        // Find the user's sign record
        const signRecord = await SignModel.findOne({ _id: FetchUserDetails[0].user._id });
        
        if (!signRecord) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Log sign record to check its structure
        console.log('Sign Record:', signRecord);

        // Ensure that multiple_message and Phone_Numbers exist
        if (!signRecord.multiple_message || !signRecord.multiple_message.Phone_Numbers) {
            return res.status(404).json({ message: 'Phone numbers list not found.' });
        }

        // Find the index of the phone number to be deleted
        const index = signRecord.multiple_message.Phone_Numbers.indexOf(phoneNumber);

        // Log the index to check if the number was found
        console.log('Index of number:', index);

        // Check if the phone number and name exist at the same index
        if (index === -1 || signRecord.multiple_message.Name[index] !== Name) {
            return res.status(404).json({ message: 'Phone number and name pair not found.' });
        }

        // Log the phone number and name before deletion
        console.log('Deleting:', {
            phoneNumber: signRecord.multiple_message.Phone_Numbers[index],
            name: signRecord.multiple_message.Name[index],
        });

        // Remove the phone number and name at the same index
        signRecord.multiple_message.Phone_Numbers.splice(index, 1);
        signRecord.multiple_message.Name.splice(index, 1);

        // Save the updated sign record
        await signRecord.save();

        res.status(200).json({ message: 'Phone number and name deleted successfully.' });
    } catch (error) {
        console.error('Error during deletion:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});





router.get('/bulksms',(req: Request , res: Response)=>{
    res.sendFile(path.resolve(__dirname, '../Views/bulksms.html'));
})

router.post('/bulksms', async (req: Request, res: Response) => {
    const { message } = req.body;

    if (!message) {
        console.log('Server Error 400: Missing required fields');
        return res.status(400).json({ error: 'Please provide a message to send.' });
    }

    const user = FetchUserDetails[0]?.user;
    const packageName = user?.Details?.PackageName;
    const coins = user?.Details?.Coins;

    if (!packageName || typeof coins !== 'number') {
        console.log('Server Error 403: User package details are incomplete.');
        return res.status(403).json({ error: 'You cannot send SMS. Please buy our package first.' });
    }

    const phoneNumbers = user?.multiple_message?.Phone_Numbers;
    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        console.log('Server Error 400: No phone numbers found');
        return res.status(400).json({ error: 'No phone numbers available to send the message.' });
    }

    if (coins < phoneNumbers.length) {
        return res.status(400).send('Insufficient coins for sending all messages');
    }

    try {
        const userData = FetchUserDetails[0];
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

                const messageId = newMessage._id as mongoose.Types.ObjectId;
                dbUser.messages.push(messageId);
            }
        }

        await dbUser.save();

        console.log('Data Updated Successfully', dbUser);
        res.status(200).json({ message: 'Messages sent successfully to all numbers!' });
    } catch (err: any) {
        console.error(err.response ? err.response.data : err.message);
        res.status(500).json({ error: 'Failed to send SMS. Please try again later.' });
    }
});



router.get('/messages', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../Views/messageslist.html'));
});

// API endpoint to fetch messages
router.get('/api/messages', async (req: Request, res: Response) => {
    try {
        const useri = FetchUserDetails[0]?.user;
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
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
