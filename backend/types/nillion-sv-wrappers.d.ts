declare module 'nillion-sv-wrappers' {
    export interface Node {
      url: string;
      publicKey: string;
    }
  
    export interface OrgCredentials {
      apiKey: string;
      // Add other credential fields as needed
    }
  
    export class SecretVaultWrapper {
      constructor(
        nodes: Node[],
        orgCredentials: OrgCredentials,
        schemaId: string
      );
  
      init(): Promise<void>;
      
      writeToNodes<T>(data: T[]): Promise<{
        result: {
          data: {
            created: string[];
          };
        };
      }[]>;
  
      readFromNodes<T>(): Promise<T[]>;
    }
  }