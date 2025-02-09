import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import { orgConfig } from './nillionOrgConfig.js';
import 'dotenv/config';

const SCHEMA_ID = process.env.SCHEMA_ID;

export interface Transaction {
  tx_id: string;
  type: 'stake' | 'unstake' | 'reward';
  amount: number;
}

interface ShareableField {
  $share: string;
}

export interface StakingData {
  user_id: string;
  staked_amount: ShareableField;
  unstaked_amount: ShareableField;
  reward_tokens: ShareableField;
  transactions: Transaction[];
}

interface ResponseType {
  success: boolean;
  msg: string | number | object;
}

interface WriteResult {
  result: {
    data: {
      created: string[];
    };
  };
}

export let nillionCollection: SecretVaultWrapper


export async function initializeConnections() {

  try {
      nillionCollection = new SecretVaultWrapper(
        // @ts-ignore
          orgConfig.nodes,
          orgConfig.orgCredentials,
          SCHEMA_ID
      );
      await nillionCollection.init();
      console.log("Nillion connections initialized successfully");

  } catch (error) {
      console.error("Failed to initialize connection to nillion:", error);
      process.exit(1);
  }
}


export async function storeStakingRecord(record: StakingData): Promise<ResponseType> {
  try {
      const result = await nillionCollection.writeToNodes([record]);
      return { 
          success: true, 
          msg: `Record stored successfully with ID: ${result[0].result.data.created[0]}`
      };
  } catch (error) {
      console.error("Failed to store staking record:", error);
      return { success: false, msg: "Failed to store staking record" };
  }
}

export async function getStakingRecords(userId: string): Promise<ResponseType> {
  try {
      const records = await nillionCollection.readFromNodes<StakingData>();
      const userRecords = records.filter(record => record.user_id === userId);
      return { success: true, msg: userRecords };
  } catch (error) {
      console.error("Failed to retrieve staking records:", error);
      return { success: false, msg: "Failed to retrieve staking records" };
  }
}


// const data: StakingData[] = [
//   {
//     user_id: "550e8400-e29b-41d4-a716-446655440000",
//     staked_amount: { $share: "1500.75" },
//     unstaked_amount: { $share: "500.25" },
//     reward_tokens: { $share: "120.5" },
//     transactions: [
//       { tx_id: "tx_001", type: "stake", amount: 1000 },
//       { tx_id: "tx_002", type: "stake", amount: 500.75 },
//       { tx_id: "tx_003", type: "unstake", amount: 500.25 },
//       { tx_id: "tx_004", type: "reward", amount: 120.5 },
//     ],
//   },
// ];

// console.log(data)

// main(data).catch((err) => console.error("Unhandled error:", err));
