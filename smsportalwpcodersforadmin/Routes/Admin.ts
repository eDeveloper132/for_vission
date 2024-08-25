import express,{Request , Response} from 'express';
import path from 'path';
import axios from 'axios';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { PackageModel } from '../Schema/Post.js'
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { FetchUserDetails } from '../index.js';
import { check, validationResult } from 'express-validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const findAndUpdateUserById = async (id: string, updateData: any) => {
  try {
    // Find the user by id
    const responseFind = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/findOne',
      {
        collection: 'signhandlers',  // Replace with your actual collection name
        database: 'test',  // Replace with your actual database name
        dataSource: 'smsaptechvission',  // Replace with your actual data source name
        filter: {_id: { $oid: id } }  // Filter to find the user by id
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY // Ensure this is set in your environment variables
        }
      }
    );

    // Check if the user exists
    const user = responseFind.data.document;
    if (!user) {
      return { error: "User not found." };
    }

    // Update the user with the new data
    const responseUpdate = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/updateOne',
      {
        collection: 'signhandlers',  // Replace with your actual collection name
        database: 'test',  // Replace with your actual database name
        dataSource: 'smsaptechvission',  // Replace with your actual data source name
        filter: {_id: { $oid: id } },  // Filter to find the user by id
        update: {
          $set: updateData  // Update with the new data
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY // Ensure this is set in your environment variables
        }
      }
    );

    return responseUpdate.data;  // Return the result of the update operation
  } catch (error: any) {
    console.error('Error finding and updating user by id:', error.response ? error.response.data : error.message);
    throw new Error('Failed to find and update user by id.');
  }
};
const findUserById = async (id: string) => {
  try {
    const response = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/findOne',
      {
        collection: 'signhandlers',  // Replace with your actual collection name
        database: 'test',  // Replace with your actual database name
        dataSource: 'smsaptechvission',  // Replace with your actual data source name
        filter: {_id: { $oid: id } }  // Filter to find the user by id
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY // Ensure this is set in your environment variables
        }
      }
    );

    return response.data.document || null; // Return the user document if found, otherwise null
  } catch (error: any) {
    console.error('Error finding user by id:', error.response ? error.response.data : error.message);
    throw new Error('Failed to find user by id.');
  }
};
const findUserByEmail = async (email: string) => {
  try {
    const response = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/findOne',
      {
        collection: 'signhandlers',
        database: 'test',
        dataSource: 'smsaptechvission',
        filter: { Email: email }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY
        }
      }
    );

    return response.data.document || null; // Return the user document or null
  } catch (error: any) {
    console.error('Error finding user:', error.response ? error.response.data : error.message);
    throw new Error('Failed to check if the user exists.');
  }
};
// Serve HTML file
router.get('/userstable', (req: Request , res: Response ) => {
  res.sendFile(path.resolve(__dirname, '../Views/details.html'));
});

// Fetch Data
router.get('/usersdata', async (req: Request , res: Response ) => {
  const data = {
    collection: 'signhandlers',
    database: 'test',
    dataSource: 'smsaptechvission',
    filter: {
      Role: 'User'  // Filter to only include users with the "User" role
    },
    projection: {
      _id: 1,
      id: 1,
      Name: 1,
      Email: 1,
      Password: 1,
      PhoneNumber: 1,
      Role: 1,
      Organization: 1,
      isVerified: 1,
      addedBy: 1
    }
  };

  try {
    const response = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/find',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY
        }
      }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching data:', error.message || error);
    res.status(500).send('Error fetching data');
  }
});


// Update Item
router.put('/users/user/edit', [
  check('_id').notEmpty().withMessage('ID is required'),
  check('updatedDetails').isObject().withMessage('Updated details must be an object')
], async (req: Request , res: Response ) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { _id, updatedDetails } = req.body;
  const REPLACE_URL = 'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/replaceOne';

  try {
    // Log request payload
    console.log('Request Payload:', {
      dataSource: 'smsaptechvission',
      database: 'test',
      collection: 'signhandlers',
      filter: { _id: { $oid: _id } },
      replacement: updatedDetails
    });

    // Replace the document
    const replaceResponse = await axios.post(REPLACE_URL, {
      dataSource: 'smsaptechvission',
      database: 'test',
      collection: 'signhandlers',
      filter: { _id: { $oid: _id } },
      replacement: updatedDetails
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.MongoDB_API_KEY
      }
    });

    console.log('Replace Response:', replaceResponse.data);

    if (replaceResponse.data.modifiedCount === 0) {
      return res.status(400).json({ message: 'No changes made' });
    }

    res.status(200).json({ message: 'Item updated successfully', data: replaceResponse.data });
  } catch (error: any) {
    console.error('Error updating item:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Server error', error: error.response ? error.response.data : error.message });
  }
});


// Delete Item
router.delete('/users/user/delete', [
  check('_id').notEmpty().withMessage('ID is required')
], async (req: Request , res: Response ) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { _id } = req.body;

  try {
    const deleteResponse = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/deleteOne',
      {
        dataSource: 'smsaptechvission',
        database: 'test',
        collection: 'signhandlers',
        filter: { _id: { $oid: _id } }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY
        }
      }
    );

    if (deleteResponse.data.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting item:', error.message || error);
    res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
});

router.get("/admins", (req: Request , res: Response ) => {
  res.sendFile(path.resolve(__dirname, "../Views/AdminDetails.html"));
});

router.get("/admins/data", async (req: Request , res: Response ) => {
  var data = JSON.stringify({
      "collection": "signhandlers",
      "database": "test",
      "dataSource": "smsaptechvission",
      "filter": {
          "Role": "Admin"  // Filter to only include users with the "Admin" role
      },
      "projection": {
          "_id": 1,
          "id": 1,
          "Name": 1,
          "Email": 1,
          "Password": 1,
          "PhoneNumber": 1,
          "Role": 1,
          "isVerified": 1,
          "addedBy": 1
      }
  });

  var config = {
      method: 'post',
      url: 'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/find',
      headers: {
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
          'api-key': `${process.env.MongoDB_API_KEY}`,
      },
      data: data
  };

  try {
      const response = await axios(config);
      res.json(response.data);
  } catch (error: any) {
      console.error("Error fetching data:", error);
      res.status(500).send("Error fetching data");
  }
});

const createUser = async (userData: any) => {
  try {
    const response = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/insertOne',
      {
        collection: 'signhandlers',
        database: 'test',
        dataSource: 'smsaptechvission',
        document: userData
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY
        }
      }
    );

    console.log('User created successfully:', response.data);
  } catch (error: any) {
    console.error('Error creating user:', error.response ? error.response.data : error.message);
    throw new Error('Failed to create user.');
  }
};
router.put('/adminsedit', [
  check('_id').notEmpty().withMessage('ID is required'),
  check('updatedDetails').isObject().withMessage('Updated details must be an object')
], async (req: Request , res: Response ) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { _id, updatedDetails } = req.body;
  const REPLACE_URL = 'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/replaceOne';

  try {
    // Log request payload
    console.log('Request Payload:', {
      dataSource: 'smsaptechvission',
      database: 'test',
      collection: 'signhandlers',
      filter: { _id: { $oid: _id } },
      replacement: updatedDetails
    });

    // Replace the document
    const replaceResponse = await axios.post(REPLACE_URL, {
      dataSource: 'smsaptechvission',
      database: 'test',
      collection: 'signhandlers',
      filter: { _id: { $oid: _id } },
      replacement: updatedDetails
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.MongoDB_API_KEY
      }
    });

    console.log('Replace Response:', replaceResponse.data);

    if (replaceResponse.data.modifiedCount === 0) {
      return res.status(400).json({ message: 'No changes made' });
    }

    res.status(200).json({ message: 'Item updated successfully', data: replaceResponse.data });
  } catch (error: any) {
    console.error('Error updating item:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Server error', error: error.response ? error.response.data : error.message });
  }
});


// Delete Item
router.delete('/adminsdelete', [
  check('_id').notEmpty().withMessage('ID is required')
], async (req: Request , res: Response ) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { _id } = req.body;

  try {
    const deleteResponse = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/deleteOne',
      {
        dataSource: 'smsaptechvission',
        database: 'test',
        collection: 'signhandlers',
        filter: { _id: { $oid: _id } }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY
        }
      }
    );

    if (deleteResponse.data.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting item:', error.message || error);
    res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
});


router.get("/user/adduser", (req: Request , res: Response ) => {
  res.sendFile(path.resolve(__dirname, "../Views/AddUser.html"));
});

router.post('/user/adduser', async (req: Request , res: Response ) => {
  console.log(req.body);
  const { Name, Email, Password, Role, Organization, Phone, CountryCode } = req.body;
  const namee = FetchUserDetails[0].user.Name;
  try {
      // Validate role
      if (!['User', 'Admin'].includes(Role)) {
          return res.status(400).json({ message: 'Invalid Role' });
      }

      const hashedPassword = await bcrypt.hash(Password, 10);
      console.log('Hashed Password:', hashedPassword);
      const mix = CountryCode + Phone;
      const Id = uuidv4();

      const apiUrl = 'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/insertOne';
      const commonData = {
          id: `${Id}`,
          Name: `${Name}`,
          Email: `${Email}`,
          Password: `${hashedPassword}`,
          PhoneNumber: `${mix}`,
          Role: `${Role}`,
          Organization: Organization,
          isVerified: true,
          addedBy:namee
      };

      // Function to add user or admin
      async function addUserOrAdmin() {
          try {
              const response = await axios.post(apiUrl, {
                  dataSource: "smsaptechvission",
                  database: "test",
                  collection: "signhandlers",
                  document: commonData
              }, {
                  headers: {
                      'Content-Type': 'application/json',
                      'api-key': process.env.MongoDB_API_KEY
                  }
              });

              console.log(`${Role} added successfully:`, response.data);
              return res.status(201).json({ message: `${Role} added successfully` });
          } catch (error: any) {
              console.error(`Error adding ${Role.toLowerCase()}:`, error.response ? error.response.data : error.message);
              return res.status(500).json({ message: `Failed to add ${Role.toLowerCase()}` });
          }
      }

      await addUserOrAdmin();

  } catch (error: any) {
      console.error('Server Error:', error);
      return res.status(500).json({ message: 'Failed to add user' });
  }
});

router.get("/package/addpackage", (req: Request , res: Response ) => {
  res.sendFile(path.resolve(__dirname, "../Views/Package.html"));
});

router.post("/package/addpackage", [
  check('Price_Id').notEmpty().withMessage('Price ID is required'),
  check('Name').notEmpty().withMessage('Name is required'),
  check('Amount').isNumeric().withMessage('Amount must be a number'),
  check('Duration').notEmpty().withMessage('Duration is required'),
  check('Coins').isNumeric().withMessage('Coins must be a number'),
  check('Description').notEmpty().withMessage('Description is required')
], async (req: Request , res: Response ) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
  }

  const { Price_Id , Name, Amount, Duration, Coins, Description } = req.body;

  try {
      // Generate a new ID
      const newid = uuidv4();

      // Create a new package instance
      const Package = new PackageModel({
          id: newid,
          price_id: Price_Id,
          Name,
          Amount,
          Duration,
          Coins,
          Description
      });

      // Save the package to the database
      await Package.save();

      // Respond with success message
      res.status(201).json({ message: 'Package created successfully', data: Package });
  } catch (error: any) {
      console.error('Error creating package:', error.message || error);
      res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
});



router.get("/packages", (req: Request , res: Response ) => {
  res.sendFile(path.resolve(__dirname, "../Views/PackageDetails.html"));
});

router.get("/packagesdata", async (req: Request , res: Response ) => {
  try {
      const data = await PackageModel.find({});
      res.json(data);
  } catch (error: any) {
      console.error("Error fetching data:", error);
      res.status(500).send("Error fetching data");
  }
});

router.put('/package/edit', [
  check('_id').notEmpty().withMessage('ID is required'),
  check('updatedDetails').isObject().withMessage('Updated details must be an object')
], async (req: Request , res: Response ) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { _id, updatedDetails } = req.body;

  try {
    const result = await PackageModel.updateOne(
      { _id },
      { $set: updatedDetails }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: 'No changes made' });
    }

    res.status(200).json({ message: 'Item updated successfully', data: result });
  } catch (error: any) {
    console.error('Error updating item:', error.message || error);
    res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
});



router.delete('/package/delete/:id', async (req: Request , res: Response ) => {
  const { id } = req.params;

  if (!id) {
      return res.status(400).json({ message: 'ID is required' });
  }

  try {
      const result = await PackageModel.deleteOne({ _id: id });

      if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Item not found' });
      }

      res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error: any) {
      console.error('Error deleting item:', error.message || error);
      res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
});



router.get("/messages", (req: Request , res: Response ) => {
  res.sendFile(path.resolve(__dirname, "../Views/MessageDetails.html"));
});

router.get("/messagesdata", async (req: Request , res: Response ) => {
  var data = JSON.stringify({
      "collection": "messagehandlers",
      "database": "test",
      "dataSource": "smsaptechvission",
      "projection": {
          "_id": 1,
          // Include other fields you need in the projection
          "id": 1,
          "u_id": 1,
          "from": 1,
          "to": 1,
          "message": 1,
          "m_count": 1,
          "m_schedule": 1,
          "status": 1
      }
  });

  var config = {
      method: 'post',
      url: 'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/find',
      headers: {
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
          'api-key': `${process.env.MongoDB_API_KEY}`,
      },
      data: data
  };

  try {
      const response = await axios(config);
      res.json(response.data);
  } catch (error: any) {
      console.error("Error fetching data:", error);
      res.status(500).send("Error fetching data");
  }
});

router.put('/message/edit', [
  check('_id').notEmpty().withMessage('ID is required'),
  check('updatedDetails').isObject().withMessage('Updated details must be an object')
], async (req: Request , res: Response ) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { _id, updatedDetails } = req.body;
  const REPLACE_URL = 'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/replaceOne';

  try {
    // Log request payload
    console.log('Request Payload:', {
      dataSource: 'smsaptechvission',
      database: 'test',
      collection: 'messagehandlers',
      filter: { _id: { $oid: _id } },
      replacement: updatedDetails
    });

    // Replace the document
    const replaceResponse = await axios.post(REPLACE_URL, {
      dataSource: 'smsaptechvission',
      database: 'test',
      collection: 'messagehandlers',
      filter: { _id: { $oid: _id } },
      replacement: updatedDetails
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.MongoDB_API_KEY
      }
    });

    console.log('Replace Response:', replaceResponse.data);

    if (replaceResponse.data.modifiedCount === 0) {
      return res.status(400).json({ message: 'No changes made' });
    }

    res.status(200).json({ message: 'Item updated successfully', data: replaceResponse.data });
  } catch (error: any) {
    console.error('Error updating item:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Server error', error: error.response ? error.response.data : error.message });
  }
});


// Delete Item
router.delete('/messages/message/delete', [
  check('_id').notEmpty().withMessage('ID is required')
], async (req: Request , res: Response ) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { _id } = req.body;

  try {
    const deleteResponse = await axios.post(
      'https://ap-southeast-1.aws.data.mongodb-api.com/app/data-eejosda/endpoint/data/v1/action/deleteOne',
      {
        dataSource: 'smsaptechvission',
        database: 'test',
        collection: 'messagehandlers',
        filter: { _id: { $oid: _id } }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.MongoDB_API_KEY
        }
      }
    );

    if (deleteResponse.data.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting item:', error.message || error);
    res.status(500).json({ message: 'Server error', error: error.message || 'Unknown error' });
  }
});

router.get('/user/changepass',(req,res)=>{
  res.sendFile(path.resolve(__dirname, "../Views/changePass.html"));
})

router.post('/user/changepass', async (req: Request , res: Response ) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
      return res.status(400).send('All fields are required.');
  }

  // Fetch user details from FetchUserDetails
  const user = FetchUserDetails[0].user; // Modify as needed
  if (!user) {
      return res.status(404).send('User not found.');
  }

  try {
      // Verify current password
      const match = await bcrypt.compare(current_password, user.Password);
      if (!match) {
          return res.status(400).send('Current password is incorrect.');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);
      const updated_data = {
          Password: hashedPassword
      };

      // Update user password
      await findAndUpdateUserById(user._id, updated_data);

      res.send('Password changed successfully.');
  } catch (error: any) {
      console.error('Error changing password:', error);
      res.status(500).send({ error: 'Error changing password: ' + error.message });
  }
});





export default router;
