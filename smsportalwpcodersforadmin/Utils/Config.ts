// config.ts
import 'dotenv/config';

// Define a type for environment variables
interface ProcessEnv {
  Name?: string;
  Password?: string;
}

// Type assertion to specify environment variables
const env = process.env as unknown as ProcessEnv;

const URI = `mongodb+srv://${env.Name}:${env.Password}@smsaptechvission.s0y9o.mongodb.net/test?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true";`;

export { URI };
