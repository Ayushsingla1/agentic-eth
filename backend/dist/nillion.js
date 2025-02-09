import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import { orgConfig } from './nillionOrgConfig.js';
const SCHEMA_ID = '778d1f38-a53d-4add-b157-ad6bf41ed537';
export let nillionCollection;
// export async function main(data: StakingData[]): Promise<void> {
//   console.log(data)
//   try {
//     const collection = new SecretVaultWrapper(
//       // @ts-ignore
//       orgConfig.nodes,
//       orgConfig.orgCredentials,
//       SCHEMA_ID
//     );
//     await collection.init();
//     const dataWritten: WriteResult[] = await collection.writeToNodes(data);
//     console.log('👀 Data written to nodes:', JSON.stringify(dataWritten, null, 2));
//     const newIds: string[] = dataWritten.flatMap((item) => item.result.data.created);
//     console.log('Uploaded record IDs:', newIds);
//     const decryptedCollectionData: StakingData[] = await collection.readFromNodes();
//     console.log('Most recent records:', decryptedCollectionData.slice(0, data.length));
//   } catch (error) {
//     console.error('❌ SecretVaultWrapper error:', error instanceof Error ? error.message : error);
//     process.exit(1);
//   }
// }
export async function initializeConnections() {
    try {
        nillionCollection = new SecretVaultWrapper(
        // @ts-ignore
        orgConfig.nodes, orgConfig.orgCredentials, SCHEMA_ID);
        await nillionCollection.init();
        console.log("Nillion connections initialized successfully");
    }
    catch (error) {
        console.error("Failed to initialize connection to nillion:", error);
        process.exit(1);
    }
}
export async function storeStakingRecord(record) {
    try {
        const result = await nillionCollection.writeToNodes([record]);
        return {
            success: true,
            msg: `Record stored successfully with ID: ${result[0].result.data.created[0]}`
        };
    }
    catch (error) {
        console.error("Failed to store staking record:", error);
        return { success: false, msg: "Failed to store staking record" };
    }
}
export async function getStakingRecords(userId) {
    try {
        const records = await nillionCollection.readFromNodes();
        const userRecords = records.filter(record => record.user_id === userId);
        return { success: true, msg: userRecords };
    }
    catch (error) {
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
