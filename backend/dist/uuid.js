import { ethers } from "ethers";
export function publicKeyToUUID(publicKey) {
    try {
        const cleanKey = publicKey.toLowerCase().replace('0x', '');
        if (!/^[0-9a-f]{40}$/i.test(cleanKey)) {
            return {
                success: false,
                uuid: '',
                error: 'Invalid public key format'
            };
        }
        const hash = ethers.keccak256('0x' + cleanKey);
        const cleanHash = hash.slice(2);
        const uuid = [
            cleanHash.slice(0, 8),
            cleanHash.slice(8, 12),
            '4' + cleanHash.slice(13, 16),
            '8' + cleanHash.slice(17, 20),
            cleanHash.slice(20, 32)
        ].join('-');
        return {
            success: true,
            uuid: uuid
        };
    }
    catch (error) {
        return {
            success: false,
            uuid: '',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
