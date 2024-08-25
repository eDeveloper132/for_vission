import { Schema, model } from 'mongoose';
// Define the schemas
const packageSchema = new Schema({
    id: { type: String, required: true },
    u_id: { type: String, required: false },
    price_id: { type: String, required: false },
    Name: { type: String, required: true },
    Amount: { type: Number, required: true },
    Duration: { type: Number, required: true },
    Coins: { type: Number, required: true },
    Description: { type: String, required: true }
});
const tokenSchema = new Schema({
    Token: { type: String, required: true, unique: true }
}, { timestamps: true });
// Define models
const TokenModel = model('AdminTokenHandler', tokenSchema);
const PackageModel = model('PackageHandler', packageSchema);
export { TokenModel, PackageModel };
