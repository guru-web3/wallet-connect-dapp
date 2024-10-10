import { BigNumber, utils } from "ethers";
import { createContext, ReactNode, useContext, useState } from "react";
import * as encoding from "@walletconnect/encoding";
import { Transaction as EthTransaction } from "@ethereumjs/tx";
import { recoverTransaction } from "@celo/wallet-base";
import {
  formatDirectSignDoc,
  stringifySignDocValues,
  verifyAminoSignature,
  verifyDirectSignature,
} from "cosmos-wallet";
import {
  KadenaAccount,
  eip712,
  formatTestBatchCall,
  formatTestTransaction,
  getLocalStorageTestnetFlag,
  hashPersonalMessage,
  hashTypedDataMessage,
  verifySignature,
} from "../helpers";
import { useWalletConnectClient } from "./ClientContext";
import {
  DEFAULT_COSMOS_METHODS,
  DEFAULT_EIP155_METHODS,
  DEFAULT_EIP155_OPTIONAL_METHODS,
  DEFAULT_EIP5792_METHODS,
  SendCallsParams,
  GetCapabilitiesResult,
  GetCallsResult,
  DEFAULT_EIP7715_METHODS,
  WalletGrantPermissionsParameters,
  WalletGrantPermissionsReturnType,
} from "../constants";
import { useChainData } from "./ChainDataContext";
import { rpcProvidersByChainId } from "../../src/helpers/api";

import { parseEther } from "ethers/lib/utils";

/**
 * Types
 */
interface IFormattedRpcResponse {
  method?: string;
  address?: string;
  valid: boolean;
  result: string;
}

type TRpcRequestCallback = (
  chainId: string,
  address: string,
  message?: string
) => Promise<void>;

interface IContext {
  ping: () => Promise<void>;
  ethereumRpc: {
    testSendTransaction: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
    testEthSign: TRpcRequestCallback;
    testSignPersonalMessage: TRpcRequestCallback;
    testSignTypedData: TRpcRequestCallback;
    testSignTypedDatav4: TRpcRequestCallback;
    testWalletGetCapabilities: TRpcRequestCallback;
    testWalletSendCalls: TRpcRequestCallback;
    testWalletGrantPermissions: TRpcRequestCallback;
    testWalletGetCallsStatus: TRpcRequestCallback;
  };
  cosmosRpc: {
    testSignDirect: TRpcRequestCallback;
    testSignAmino: TRpcRequestCallback;
  };
  solanaRpc?: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  polkadotRpc?: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  nearRpc?: {
    testSignAndSendTransaction: TRpcRequestCallback;
    testSignAndSendTransactions: TRpcRequestCallback;
  };
  multiversxRpc?: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
    testSignTransactions: TRpcRequestCallback;
  };
  tronRpc?: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  tezosRpc?: {
    testGetAccounts: TRpcRequestCallback;
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  kadenaRpc?: {
    testGetAccounts: TRpcRequestCallback;
    testSign: TRpcRequestCallback;
    testQuicksign: TRpcRequestCallback;
  };
  rpcResult?: IFormattedRpcResponse | null;
  isRpcRequestPending: boolean;
  isTestnet: boolean;
  setIsTestnet: (isTestnet: boolean) => void;
}

/**
 * Context
 */
export const JsonRpcContext = createContext<IContext>({} as IContext);

/**
 * Provider
 */
export function JsonRpcContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<IFormattedRpcResponse | null>();
  const [isTestnet, setIsTestnet] = useState(getLocalStorageTestnetFlag());
  const [lastTxId, setLastTxId] = useState<`0x${string}`>();
  const [kadenaAccount, setKadenaAccount] = useState<KadenaAccount | null>(
    null
  );

  const { client, session, accounts, balances, solanaPublicKeys } =
    useWalletConnectClient();

  const { chainData } = useChainData();

  const _createJsonRpcRequestHandler =
    (
      rpcRequest: (
        chainId: string,
        address: string
      ) => Promise<IFormattedRpcResponse>
    ) =>
    async (chainId: string, address: string) => {
      if (typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      if (typeof session === "undefined") {
        throw new Error("Session is not connected");
      }

      try {
        setPending(true);
        const result = await rpcRequest(chainId, address);
        setResult(result);
      } catch (err: any) {
        console.error("RPC request failed: ", err);
        setResult({
          address,
          valid: false,
          result: err?.message ?? err,
        });
      } finally {
        setPending(false);
      }
    };

  const _verifyEip155MessageSignature = (
    message: string,
    signature: string,
    address: string
  ) =>
    utils.verifyMessage(message, signature).toLowerCase() ===
    address.toLowerCase();

  const ping = async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      setPending(true);

      let valid = false;

      try {
        await client.ping({ topic: session.topic });
        valid = true;
      } catch (e) {
        valid = false;
      }

      // display result
      setResult({
        method: "ping",
        valid,
        result: valid ? "Ping succeeded" : "Ping failed",
      });
    } catch (e) {
      console.error(e);
      setResult(null);
    } finally {
      setPending(false);
    }
  };

  // -------- ETHEREUM/EIP155 RPC METHODS --------

  const ethereumRpc = {
    testSendTransaction: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);

        const tx = await formatTestTransaction(account);

        console.log({balances});
        // const balance = BigNumber.from(balances[account][0].balance || "0");
        // if (balance.lt(BigNumber.from(tx.gasPrice).mul(tx.gasLimit))) {
        //   return {
        //     method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
        //     address,
        //     valid: false,
        //     result: "Insufficient funds for intrinsic transaction cost",
        //   };
        // }

        const result = await client!.request<string>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
            params: [tx],
          },
        });

        // format displayed result
        return {
          method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
          address,
          valid: true,
          result,
        };
      }
    ),
    testSignTransaction: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);

        const tx = await formatTestTransaction(account);

        const signedTx = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TRANSACTION,
            params: [tx],
          },
        });

        const CELO_ALFAJORES_CHAIN_ID = 44787;
        const CELO_MAINNET_CHAIN_ID = 42220;

        let valid = false;
        const [, reference] = chainId.split(":");
        if (
          reference === CELO_ALFAJORES_CHAIN_ID.toString() ||
          reference === CELO_MAINNET_CHAIN_ID.toString()
        ) {
          const [, signer] = recoverTransaction(signedTx);
          valid = signer.toLowerCase() === address.toLowerCase();
        } else {
          valid = EthTransaction.fromSerializedTx(
            signedTx as any
          ).verifySignature();
        }

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TRANSACTION,
          address,
          valid,
          result: signedTx,
        };
      }
    ),
    testSignPersonalMessage: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        // test message
        const message = `My email is john@doe.com - ${Date.now()}`;

        // encode message (hex)
        const hexMsg = encoding.utf8ToHex(message, true);
        // personal_sign params
        const params = [hexMsg, address];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashMsg = hashPersonalMessage(message);

        const valid = await verifySignature(
          address,
          signature,
          hashMsg,
          rpc.baseURL
        );

        // format displayed result
        return {
          method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
          address,
          valid,
          result: signature,
        };
      }
    ),
    testEthSign: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        // test message
        const message = `My email is john@doe.com - ${Date.now()}`;
        // encode message (hex)
        const hexMsg = encoding.utf8ToHex(message, true);
        // eth_sign params
        const params = [address, hexMsg];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashMsg = hashPersonalMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashMsg,
          rpc.baseURL
        );

        // format displayed result
        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN + " (standard)",
          address,
          valid,
          result: signature,
        };
      }
    ),
    testSignTypedData: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const message = JSON.stringify(eip712.example);

        // eth_signTypedData params
        const params = [address, message];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashedTypedData = hashTypedDataMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashedTypedData,
          rpc.baseURL
        );

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
          address,
          valid,
          result: signature,
        };
      }
    ),
    testSignTypedDatav4: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const message = JSON.stringify(eip712.example);
        console.log("eth_signTypedData_v4");

        // eth_signTypedData_v4 params
        const params = [address, message];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA_V4,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashedTypedData = hashTypedDataMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashedTypedData,
          rpc.baseURL
        );

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
          address,
          valid,
          result: signature,
        };
      }
    ),
    testWalletGetCapabilities: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        // The wallet_getCapabilities "caching" should ultimately move into the provider.
        // check the session.sessionProperties first for capabilities
        const capabilitiesJson = session?.sessionProperties?.["capabilities"];
        const walletCapabilities =
          capabilitiesJson && JSON.parse(capabilitiesJson);
        let capabilities = walletCapabilities[address] as
          | GetCapabilitiesResult
          | undefined;
        // send request for wallet_getCapabilities
        if (!capabilities)
          capabilities = await client!.request<GetCapabilitiesResult>({
            topic: session!.topic,
            chainId,
            request: {
              method: DEFAULT_EIP5792_METHODS.WALLET_GET_CAPABILITIES,
              params: [address],
            },
          });

        // format displayed result
        return {
          method: DEFAULT_EIP5792_METHODS.WALLET_GET_CAPABILITIES,
          address,
          valid: true,
          result: JSON.stringify(capabilities),
        };
      }
    ),
    testWalletGetCallsStatus: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }
        if (lastTxId === undefined)
          throw new Error(
            `Last transaction ID is undefined, make sure previous call to sendCalls returns successfully. `
          );
        const params = [lastTxId];
        // send request for wallet_getCallsStatus
        const getCallsStatusResult = await client!.request<GetCallsResult>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP5792_METHODS.WALLET_GET_CALLS_STATUS,
            params: params,
          },
        });

        // format displayed result
        return {
          method: DEFAULT_EIP5792_METHODS.WALLET_GET_CALLS_STATUS,
          address,
          valid: true,
          result: JSON.stringify(getCallsStatusResult),
        };
      }
    ),
    testWalletSendCalls: _createJsonRpcRequestHandler(
      //Sample test call - batch multiple native send tx

      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);

        const balance = BigNumber.from(balances[account][0].balance || "0");
        if (balance.lt(parseEther("0.0002"))) {
          return {
            method: DEFAULT_EIP5792_METHODS.WALLET_SEND_CALLS,
            address,
            valid: false,
            result:
              "Insufficient funds for batch call [minimum 0.0002ETH required excluding gas].",
          };
        }
        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];
        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }
        const sendCallsRequestParams: SendCallsParams =
          await formatTestBatchCall(account);
        // send batch Tx
        const txId = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP5792_METHODS.WALLET_SEND_CALLS,
            params: [sendCallsRequestParams],
          },
        });
        // store the last transactionId to use it for wallet_getCallsReceipt
        setLastTxId(
          txId && txId.startsWith("0x") ? (txId as `0x${string}`) : undefined
        );
        // format displayed result
        return {
          method: DEFAULT_EIP5792_METHODS.WALLET_SEND_CALLS,
          address,
          valid: true,
          result: txId,
        };
      }
    ),
    testWalletGrantPermissions: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);
        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];
        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }
        const walletGrantPermissionsParameters: WalletGrantPermissionsParameters =
          {
            signer: {
              type: "key",
              data: {
                id: "0xc3cE257B5e2A2ad92747dd486B38d7b4B36Ac7C9",
              },
            },
            permissions: [
              {
                type: "native-token-limit",
                data: {
                  amount: parseEther("0.5"),
                },
                policies: [],
                required: true,
              },
            ],

            expiry: 1716846083638,
          } as WalletGrantPermissionsParameters;
        // send wallet_grantPermissions rpc request
        const issuePermissionResponse =
          await client!.request<WalletGrantPermissionsReturnType>({
            topic: session!.topic,
            chainId,
            request: {
              method: DEFAULT_EIP7715_METHODS.WALLET_GRANT_PERMISSIONS,
              params: [walletGrantPermissionsParameters],
            },
          });

        // format displayed result
        return {
          method: DEFAULT_EIP7715_METHODS.WALLET_GRANT_PERMISSIONS,
          address,
          valid: true,
          result: JSON.stringify(issuePermissionResponse),
        };
      }
    ),
  };

  // -------- COSMOS RPC METHODS --------

  const cosmosRpc = {
    testSignDirect: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        // test direct sign doc inputs
        const inputs = {
          fee: [{ amount: "2000", denom: "ucosm" }],
          pubkey: "AgSEjOuOr991QlHCORRmdE5ahVKeyBrmtgoYepCpQGOW",
          gasLimit: 200000,
          accountNumber: 1,
          sequence: 1,
          bodyBytes:
            "0a90010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412700a2d636f736d6f7331706b707472653766646b6c366766727a6c65736a6a766878686c63337234676d6d6b38727336122d636f736d6f7331717970717870713971637273737a673270767871367273307a716733797963356c7a763778751a100a0575636f736d120731323334353637",
          authInfoBytes:
            "0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21034f04181eeba35391b858633a765c4a0c189697b40d216354d50890d350c7029012040a020801180112130a0d0a0575636f736d12043230303010c09a0c",
        };

        // split chainId
        const [namespace, reference] = chainId.split(":");

        // format sign doc
        const signDoc = formatDirectSignDoc(
          inputs.fee,
          inputs.pubkey,
          inputs.gasLimit,
          inputs.accountNumber,
          inputs.sequence,
          inputs.bodyBytes,
          reference
        );

        // cosmos_signDirect params
        const params = {
          signerAddress: address,
          signDoc: stringifySignDocValues(signDoc),
        };

        // send message
        const result = await client!.request<{ signature: string }>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_DIRECT,
            params,
          },
        });

        const targetChainData = chainData[namespace][reference];

        if (typeof targetChainData === "undefined") {
          throw new Error(`Missing chain data for chainId: ${chainId}`);
        }

        const valid = await verifyDirectSignature(
          address,
          result.signature,
          signDoc
        );

        // format displayed result
        return {
          method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_DIRECT,
          address,
          valid,
          result: result.signature,
        };
      }
    ),
    testSignAmino: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        // split chainId
        const [namespace, reference] = chainId.split(":");

        // test amino sign doc
        const signDoc = {
          msgs: [],
          fee: { amount: [], gas: "23" },
          chain_id: "foochain",
          memo: "hello, world",
          account_number: "7",
          sequence: "54",
        };

        // cosmos_signAmino params
        const params = { signerAddress: address, signDoc };

        // send message
        const result = await client!.request<{ signature: string }>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_AMINO,
            params,
          },
        });

        const targetChainData = chainData[namespace][reference];

        if (typeof targetChainData === "undefined") {
          throw new Error(`Missing chain data for chainId: ${chainId}`);
        }

        const valid = await verifyAminoSignature(
          address,
          result.signature,
          signDoc
        );

        // format displayed result
        return {
          method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_AMINO,
          address,
          valid,
          result: result.signature,
        };
      }
    ),
  };


  return (
    <JsonRpcContext.Provider
      value={{
        ping,
        ethereumRpc,
        cosmosRpc,
        rpcResult: result,
        isRpcRequestPending: pending,
        isTestnet,
        setIsTestnet,
      }}
    >
      {children}
    </JsonRpcContext.Provider>
  );
}

export function useJsonRpc() {
  const context = useContext(JsonRpcContext);
  if (context === undefined) {
    throw new Error("useJsonRpc must be used within a JsonRpcContextProvider");
  }
  return context;
}
