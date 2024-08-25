// config.ts
import 'dotenv/config';
// Type assertion to specify environment variables
const env = process.env;
const URI = `mongodb+srv://${env.Name}:${env.Password}@smsaptechvission.s0y9o.mongodb.net/test?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true";`;
export { URI };
