import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { TokenModel } from './Schema/Post.js';
import MainRoute from './Routes/Main.js';
import Admin from './Routes/Admin.js';
import axios from "axios";
import sendVerificationEmail from './emailService.js'; // Import the email service
import connection from './DB/db.js';
const PORT = process.env.PORT || 3436;
const app = express();
app.use(express.json());
app.use(cors());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
const findUserById = async (id) => {
    try {
        const response = await axios.post('https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/findOne', {
            collection: 'signhandlers', // Replace with your actual collection name
            database: 'test', // Replace with your actual database name
            dataSource: 'smsaptechvission', // Replace with your actual data source name
            filter: { _id: { $oid: id } } // Filter to find the user by _id as an ObjectId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.MongoDB_API_KEY // Ensure this is set in your environment variables
            }
        });
        return response.data.document || null; // Return the user document if found, otherwise null
    }
    catch (error) {
        console.error('Error finding user by id:', error.response ? error.response.data : error.message);
        throw new Error('Failed to find user by id.');
    }
};
await connection();
const SessionManager = [];
const OneTime = [];
const ExpiredTokens = [];
const FetchUserDetails = [];
app.use('/assets', express.static(path.join(__dirname, 'assets')));
function clearOneTimeToken() {
    const maxTimeout = Math.pow(2, 31) - 1; // Maximum timeout value in JavaScript
    // Check for the minimum of desired timeout and maxTimeout to avoid overflow
    const timeoutDuration = Math.min(2.592E+09, maxTimeout); // 30 days or max timeout
    setTimeout(async () => {
        if (OneTime.length > 0) {
            console.log("OneTime token expired");
            OneTime.shift();
            const Token = OneTime[0];
            const signin = await TokenModel.findOneAndDelete({ Token });
            console.log('Deleted Token', signin);
            // Additional logic can be added here, like notifying the user
        }
    }, timeoutDuration);
}
// Initially set the timeout to clear the token if already present
if (OneTime.length > 0) {
    clearOneTimeToken();
}
app.use((req, res, next) => {
    if (req.path.toLowerCase() === '/verify-email') {
        return next();
    }
    else if (req.path.toLowerCase() === '/resend-verification') {
        return next();
    }
    else if (req.path.toLowerCase() === '/recoverpass') {
        return next();
    }
    if (OneTime[0]) {
        const isValidToken = SessionManager.some(session => session.Token === OneTime[0]);
        if (!isValidToken) {
            console.log("Invalid Token");
            OneTime.shift();
            SessionManager.shift();
            return res.redirect('/signin');
        }
        if (req.path.toLowerCase() === '/signin' || req.path.toLowerCase() === '/signup') {
            return res.redirect('/');
        }
        else {
            console.log("Success");
            next();
        }
    }
    else {
        console.log('OneTime Token is not set');
        if (req.path.toLowerCase() === '/signin' || req.path.toLowerCase() === '/signup') {
            next();
        }
        else {
            return res.redirect('/signin');
        }
    }
    // Reset the timeout whenever a new token is set in OneTime array
    if (OneTime.length > 0) {
        clearOneTimeToken();
    }
});
app.get("/signup", (req, res) => {
    res.sendFile(path.resolve(__dirname, "./Views/signup.html"));
});
const findUserByEmail = async (email) => {
    try {
        const response = await axios.post('https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/findOne', {
            collection: 'signhandlers',
            database: 'test',
            dataSource: 'smsaptechvission',
            filter: { Email: email }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.MongoDB_API_KEY
            }
        });
        return response.data.document || null; // Return the user document or null
    }
    catch (error) {
        console.error('Error finding user:', error.response ? error.response.data : error.message);
        throw new Error('Failed to check if the user exists.');
    }
};
const createUser = async (userData) => {
    try {
        const response = await axios.post('https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/insertOne', {
            collection: 'signhandlers',
            database: 'test',
            dataSource: 'smsaptechvission',
            document: userData
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.MongoDB_API_KEY
            }
        });
        console.log('User created successfully:', response.data);
    }
    catch (error) {
        console.error('Error creating user:', error.response ? error.response.data : error.message);
        throw new Error('Failed to create user.');
    }
};
app.post("/signup", async (req, res) => {
    const { Name, Email, Password, Phone, CountryCode, Role } = req.body;
    try {
        // Check if all required fields are provided
        if (!Name || !Email || !Password || !Phone || !CountryCode || !Role) {
            return res.status(400).json({ error: "All fields are required." });
        }
        const mix = CountryCode + Phone;
        // Check if user already exists
        const existingUser = await findUserByEmail(Email);
        if (existingUser) {
            return res.status(400).send('Error: Email is already registered');
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(Password, 10);
        // Generate a verification token
        const verificationToken = await bcrypt.hash(uuidv4(), 10);
        // Create the new user data object
        const userData = {
            id: uuidv4(),
            Name,
            Email,
            Password: hashedPassword,
            PhoneNumber: mix,
            Role,
            verificationToken,
            verificationTokenExpiry: new Date(Date.now() + 3600000), // 1 hour expiry
            isVerified: false,
        };
        // Create the new user in the database
        await createUser(userData);
        // Send verification email
        await sendVerificationEmail(Email, verificationToken);
        console.log("Verification link sent to email.");
        return res.status(200).send("A verification link has been sent to your email. Please check your inbox or spam folder.").redirect('/signin');
    }
    catch (error) {
        console.error("Error during signup:", error.message);
        return res.status(500).json({ error: "Internal Server Error. Please try again later." });
    }
});
app.get("/signin", (req, res) => {
    res.sendFile(path.resolve(__dirname, "./Views/signin.html"));
});
app.post('/signin', async (req, res) => {
    const { Email, Password } = req.body;
    try {
        if (!Email || !Password) {
            return res.status(400).send('Error: Missing fields');
        }
        const user = await findUserByEmail(Email);
        if (!user) {
            console.log('User not found');
            return res.status(401).send('Error: Invalid email');
        }
        const isMatch = await bcrypt.compare(Password, user.Password);
        if (!isMatch) {
            console.log('Password does not match');
            return res.status(401).send('Error: Invalid password');
        }
        if (user.Role === "User") {
            return res.status(401).send('Error: You are not a Admin');
        }
        if (user.isVerified) {
            const token = uuidv4();
            const hashedToken = await bcrypt.hash(token, 10);
            await SessionManager.push({
                Token: hashedToken
            });
            const signin = await TokenModel.create({
                Token: hashedToken
            });
            await signin.save();
            OneTime.push(hashedToken);
            ExpiredTokens.push({
                Token: hashedToken
            });
            FetchUserDetails.push({
                user
            });
            console.log('User logged in:', user);
            console.log('Uploaded Id on Database:', signin);
            console.log('Generated access token:', hashedToken);
            res.redirect('/');
        }
        else {
            res.redirect('/signup');
        }
    }
    catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/signin', async (req, res) => {
    const { Email, Password } = req.body;
    try {
        if (!Email || !Password) {
            return res.status(400).send('Error: Missing fields');
        }
        const user = await findUserByEmail(Email);
        // const user = await SignModel.findOne({ Email });
        if (!user) {
            console.log('User not found');
            return res.status(401).send('Error: Invalid email');
        }
        const isMatch = await bcrypt.compare(Password, user.Password);
        if (!isMatch) {
            console.log('Password does not match');
            return res.status(401).send('Error: Invalid password');
        }
        if (!user.isVerified) {
            console.log('Email not verified');
            return res.status(403).send('You have not verified your email address, check your inbox');
        }
        // If the email is verified, proceed with the login
        const token = uuidv4();
        const hashedToken = await bcrypt.hash(token, 10);
        SessionManager.push({
            Token: hashedToken
        });
        const signin = await TokenModel.create({
            Token: hashedToken
        });
        await signin.save();
        OneTime.push(hashedToken);
        ExpiredTokens.push({
            Token: hashedToken
        });
        FetchUserDetails.push({
            user
        });
        console.log('User logged in:', user);
        console.log('Uploaded Id on Database:', signin);
        console.log('Generated access token:', hashedToken);
        res.redirect('/');
    }
    catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).send('Internal Server Error');
    }
});
const io = [];
app.post('/resend-verification', async (req, res) => {
    const { Email } = req.body;
    try {
        const user = await findUserByEmail(Email);
        // const user = await SignModel.findOne({ Email });
        console.log(user);
        if (!user) {
            return res.status(404).send('Error: User not found');
        }
        if (user.isVerified) {
            return res.status(400).send('Error: Email is already verified');
        }
        const token = uuidv4(); // Use UUID or any unique token generator
        const hashed = await bcrypt.hash(token, 10);
        const verificationToken = hashed;
        io.push(verificationToken);
        // const verificationToken = hashed,
        const verificationTokenExpiry = new Date(Date.now() + 3600000);
        const datia = {
            verificationToken: io[0],
            verificationTokenExpiry: verificationTokenExpiry
        };
        const IDI = user._id;
        // console.log(IDI)
        const updarte = await findAndUpdateUserById(IDI, datia);
        console.log("UPDARTE", updarte, "DATIA", datia, "IDI", IDI);
        await sendVerificationEmail(Email, io[0]);
        res.status(200).send('Verification email sent');
    }
    catch (error) {
        console.error('Error resending verification email:', error.message);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/reset-Session', async (req, res) => {
    const Token = OneTime[0];
    const signin = await TokenModel.findOneAndDelete({ Token });
    console.log('Deleted Token', signin);
    await OneTime.shift();
    await SessionManager.shift();
    await FetchUserDetails.shift();
    res.status(200).send("Session reset");
});
app.post('/admin_one', async (req, res) => {
    // Assuming FetchUserDetails is available and contains the user information
    const Data = FetchUserDetails[0];
    console.log(Data);
    try {
        const Id = Data.user._id;
        const user = await findUserById(Id);
        console.log(user);
        if (!user) {
            return res.status(404).send('Error: User not found');
        }
        // console.log(user)
        const data = {
            Name: user.Name,
            Email: user.Email,
            // Omit Password or other sensitive data
        };
        res.json(data); // Use res.json() for sending JSON responses
    }
    catch (error) {
        console.error('Error during fetching user details:', error.message);
        res.status(500).send('Internal Server Error');
    }
});
const arrey = [];
app.use('/', MainRoute);
app.use('/admin', Admin);
const findAndUpdateUserById = async (id, updateData) => {
    try {
        // Find the user by id (using the internal ObjectId)
        const responseFind = await axios.post('https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/findOne', {
            collection: 'signhandlers', // Replace with your actual collection name
            database: 'test', // Replace with your actual database name
            dataSource: 'smsaptechvission', // Replace with your actual data source name
            filter: { _id: { $oid: id } } // Filter to find the user by MongoDB ObjectId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.MongoDB_API_KEY // Ensure this is set in your environment variables
            }
        });
        // Check if the user exists
        const user = responseFind.data.document;
        if (!user) {
            return { error: "User not found." };
        }
        // Update the user with the new data
        const responseUpdate = await axios.post('https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/updateOne', {
            collection: 'signhandlers', // Replace with your actual collection name
            database: 'test', // Replace with your actual database name
            dataSource: 'smsaptechvission', // Replace with your actual data source name
            filter: { _id: { $oid: id } }, // Filter to find the user by MongoDB ObjectId
            update: {
                $set: updateData // Update with the new data
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.MongoDB_API_KEY // Ensure this is set in your environment variables
            }
        });
        return responseUpdate.data; // Return the result of the update operation
    }
    catch (error) {
        console.error('Error finding and updating user by id:', error.response ? error.response.data : error.message);
        throw new Error('Failed to find and update user by id.');
    }
};
app.post('/recoverpass', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await findUserByEmail(email);
        if (!user) {
            console.log('User not found');
            return res.status(401).send('Invalid email address. Please try again.');
        }
        const Id = user._id;
        function generateTemporaryPassword(length = 10) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let password = '';
            for (let i = 0; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                password += characters[randomIndex];
            }
            return password;
        }
        const temporaryPassword = generateTemporaryPassword(12);
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        arrey.push(hashedPassword);
        const FORVERIFICATION = arrey[0];
        const updateduser = {
            Password: arrey[0],
            verificationToken: FORVERIFICATION,
            verificationTokenExpiry: new Date(Date.now() + 3600000),
            isVerified: false
        };
        // const updatedUser = await SignModel.findByIdAndUpdate(
        //     Id,
        //     {
        //         $set: { 
        //             "Password": arrey[0],
        //             "verificationToken": FORVERIFICATION,
        //             "verificationTokenExpiry": Date.now() + 3600000,
        //             "isVerified": false 
        //         }
        //     },
        //     { new: true, runValidators: true }
        // );
        const updatedUser = await findAndUpdateUserById(Id, updateduser);
        // await updatedUser.save();
        await sendVerificationEmail(email, FORVERIFICATION);
        if (!updatedUser) {
            return res.status(500).send('Failed to update the password. Please try again.');
        }
        console.log(`Temporary password for ${email}: ${hashedPassword}`);
        res.send({
            message: `A verification link has been sent to your email. Please copy and save the temporary password provided password: ${temporaryPassword}.`,
        });
    }
    catch (error) {
        console.error('Error in /recoverpass:', error);
        res.status(500).send('An internal server error occurred. Please try again later.');
    }
});
app.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Verification token is required.');
    }
    // Clear the io array if it contains 1 or 2 items
    if (io.length > 0) {
        io.length = 0;
    }
    try {
        // Function to find a user by the verification token
        const findUserByVerificationToken = async (veri) => {
            try {
                const response = await axios.post('https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/findOne', {
                    collection: 'signhandlers',
                    database: 'test',
                    dataSource: 'smsaptechvission',
                    filter: { verificationToken: veri }
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': process.env.MongoDB_API_KEY
                    }
                });
                return response.data.document || null; // Return the user document or null
            }
            catch (error) {
                console.error('Error finding user:', error.response ? error.response.data : error.message);
                throw new Error('Failed to check if the user exists.');
            }
        };
        // Find the user with the provided verification token
        const user = await findUserByVerificationToken(token);
        if (!user) {
            return res.status(400).send('Invalid or expired token.');
        }
        const id = user._id; // Extract the ObjectId string
        console.log(id);
        // Prepare the data to mark the user as verified
        const updatedData = {
            isVerified: true
        };
        // Update the user in the database
        const updated = await findAndUpdateUserById(id, updatedData);
        if (updated.matchedCount === 0) {
            return res.status(400).send('Failed to update user. Please try again.');
        }
        res.send('Email verified successfully!');
    }
    catch (error) {
        console.error("Error verifying email:", error);
        res.status(500).send('Server error');
    }
});
app.use("*", (req, res) => {
    // res.status(404).sendFile(path.resolve(__dirname, './Views/Other/page-404.html'));
    res.status(404).send({
        message: "Page Not Found"
    });
});
export { FetchUserDetails, OneTime, SessionManager, };
