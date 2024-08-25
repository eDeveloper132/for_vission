import { Schema, model, Model, Document } from 'mongoose';

// Define TypeScript interfaces for the documents
interface PackageDocument extends Document {
  id: string;
  u_id?: string;
  price_id?: string;
  Name: string;
  Amount: number;
  Duration: number;
  Coins: number;
  Description: string;
}

interface TokenDocument extends Document {
  Token: string;
}

// Define the schemas
const packageSchema = new Schema<PackageDocument>({
  id: { type: String, required: true },
  u_id: { type: String, required: false },
  price_id: { type: String , required: false},
  Name: { type: String, required: true },
  Amount: { type: Number, required: true },
  Duration: { type: Number, required: true },
  Coins: { type: Number, required: true },
  Description: { type: String, required: true }
});

const tokenSchema = new Schema<TokenDocument>({
  Token: { type: String, required: true, unique: true }
}, { timestamps: true });

// Define models
const TokenModel: Model<TokenDocument> = model<TokenDocument>('AdminTokenHandler', tokenSchema);
const PackageModel: Model<PackageDocument> = model<PackageDocument>('PackageHandler', packageSchema);

export {
  TokenModel,
  PackageModel
};
