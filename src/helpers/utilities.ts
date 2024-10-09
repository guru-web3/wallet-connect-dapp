import { BigNumber, BigNumberish, ethers, providers, utils } from "ethers";
import * as encoding from "@walletconnect/encoding";
import { TypedDataUtils } from "eth-sig-util";
import * as ethUtil from "ethereumjs-util";

import { eip1271 } from "./eip1271";
import { DEFAULT_CHAINS } from "../constants";

export function capitalize(string: string): string {
  return string
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function ellipseText(text = "", maxLength = 9999): string {
  if (text.length <= maxLength) {
    return text;
  }
  const _maxLength = maxLength - 3;
  let ellipse = false;
  let currentLength = 0;
  const result =
    text
      .split(" ")
      .filter((word) => {
        currentLength += word.length;
        if (ellipse || currentLength >= _maxLength) {
          ellipse = true;
          return false;
        } else {
          return true;
        }
      })
      .join(" ") + "...";
  return result;
}

export function ellipseAddress(address = "", width = 10): string {
  return `${address.slice(0, width)}...${address.slice(-width)}`;
}

export function getDataString(func: string, arrVals: any[]): string {
  let val = "";
  for (let i = 0; i < arrVals.length; i++) {
    val += encoding.padLeft(arrVals[i], 64);
  }
  const data = func + val;
  return data;
}

export function isMobile(): boolean {
  let mobile = false;

  function hasTouchEvent(): boolean {
    try {
      document.createEvent("TouchEvent");
      return true;
    } catch (e) {
      return false;
    }
  }

  function hasMobileUserAgent(): boolean {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
        navigator.userAgent
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
        navigator.userAgent.substr(0, 4)
      )
    ) {
      return true;
    } else if (hasTouchEvent()) {
      return true;
    }
    return false;
  }

  mobile = hasMobileUserAgent();

  return mobile;
}

export function encodePersonalMessage(msg: string): string {
  const data = encoding.utf8ToBuffer(msg);
  const buf = Buffer.concat([
    Buffer.from(
      "\u0019Ethereum Signed Message:\n" + data.length.toString(),
      "utf8"
    ),
    data,
  ]);
  return ethUtil.bufferToHex(buf);
}

export function hashPersonalMessage(msg: string): string {
  const data = encodePersonalMessage(msg);
  const buf = ethUtil.toBuffer(data);
  const hash = ethUtil.keccak256(buf);
  return ethUtil.bufferToHex(hash);
}

export function encodeTypedDataMessage(msg: string): string {
  const data = TypedDataUtils.sanitizeData(JSON.parse(msg));
  const buf = Buffer.concat([
    Buffer.from("1901", "hex"),
    TypedDataUtils.hashStruct("EIP712Domain", data.domain, data.types),
    TypedDataUtils.hashStruct(
      data.primaryType as string,
      data.message,
      data.types
    ),
  ]);
  return ethUtil.bufferToHex(buf);
}

export function hashTypedDataMessage(msg: string): string {
  const data = encodeTypedDataMessage(msg);
  const buf = ethUtil.toBuffer(data);
  const hash = ethUtil.keccak256(buf);
  return ethUtil.bufferToHex(hash);
}

export function recoverAddress(sig: string, hash: string): string {
  const params = ethUtil.fromRpcSig(sig);
  const result = ethUtil.ecrecover(
    ethUtil.toBuffer(hash),
    params.v,
    params.r,
    params.s
  );
  const signer = ethUtil.bufferToHex(ethUtil.publicToAddress(result));
  return signer;
}

export function recoverPersonalSignature(sig: string, msg: string): string {
  const hash = hashPersonalMessage(msg);
  const signer = recoverAddress(sig, hash);
  return signer;
}

export function recoverTypedMessage(sig: string, msg: string): string {
  const hash = hashTypedDataMessage(msg);
  const signer = recoverAddress(sig, hash);
  return signer;
}

export async function verifySignature(
  address: string,
  sig: string,
  hash: string,
  rpcUrl: string
): Promise<boolean> {
  const provider = new providers.JsonRpcProvider(rpcUrl);
  const bytecode = await provider.getCode(address);

    return eip1271.isValidSignature(address, sig, hash, provider);
}

const universalValidator = "0x60806040523480156200001157600080fd5b50604051620007003803806200070083398101604081905262000034916200056f565b6000620000438484846200004f565b9050806000526001601ff35b600080846001600160a01b0316803b806020016040519081016040528181526000908060200190933c90507f6492649264926492649264926492649264926492649264926492649264926492620000a68462000451565b036200021f57600060608085806020019051810190620000c79190620005ce565b8651929550909350915060000362000192576000836001600160a01b031683604051620000f5919062000643565b6000604051808303816000865af19150503d806000811462000134576040519150601f19603f3d011682016040523d82523d6000602084013e62000139565b606091505b5050905080620001905760405162461bcd60e51b815260206004820152601e60248201527f5369676e617475726556616c696461746f723a206465706c6f796d656e74000060448201526064015b60405180910390fd5b505b604051630b135d3f60e11b808252906001600160a01b038a1690631626ba7e90620001c4908b90869060040162000661565b602060405180830381865afa158015620001e2573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906200020891906200069d565b6001600160e01b031916149450505050506200044a565b805115620002b157604051630b135d3f60e11b808252906001600160a01b03871690631626ba7e9062000259908890889060040162000661565b602060405180830381865afa15801562000277573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906200029d91906200069d565b6001600160e01b031916149150506200044a565b8251604114620003195760405162461bcd60e51b815260206004820152603a6024820152600080516020620006e083398151915260448201527f3a20696e76616c6964207369676e6174757265206c656e677468000000000000606482015260840162000187565b620003236200046b565b506020830151604080850151855186939260009185919081106200034b576200034b620006c9565b016020015160f81c9050601b81148015906200036b57508060ff16601c14155b15620003cf5760405162461bcd60e51b815260206004820152603b6024820152600080516020620006e083398151915260448201527f3a20696e76616c6964207369676e617475726520762076616c75650000000000606482015260840162000187565b6040805160008152602081018083528a905260ff83169181019190915260608101849052608081018390526001600160a01b038a169060019060a0016020604051602081039080840390855afa1580156200042e573d6000803e3d6000fd5b505050602060405103516001600160a01b031614955050505050505b9392505050565b60006020825110156200046357600080fd5b508051015190565b60405180606001604052806003906020820280368337509192915050565b6001600160a01b03811681146200049f57600080fd5b50565b634e487b7160e01b600052604160045260246000fd5b60005b83811015620004d5578181015183820152602001620004bb565b50506000910152565b600082601f830112620004f057600080fd5b81516001600160401b03808211156200050d576200050d620004a2565b604051601f8301601f19908116603f01168101908282118183101715620005385762000538620004a2565b816040528381528660208588010111156200055257600080fd5b62000565846020830160208901620004b8565b9695505050505050565b6000806000606084860312156200058557600080fd5b8351620005928162000489565b6020850151604086015191945092506001600160401b03811115620005b657600080fd5b620005c486828701620004de565b9150509250925092565b600080600060608486031215620005e457600080fd5b8351620005f18162000489565b60208501519093506001600160401b03808211156200060f57600080fd5b6200061d87838801620004de565b935060408601519150808211156200063457600080fd5b50620005c486828701620004de565b6000825162000657818460208701620004b8565b9190910192915050565b828152604060208201526000825180604084015262000688816060850160208701620004b8565b601f01601f1916919091016060019392505050565b600060208284031215620006b057600080fd5b81516001600160e01b0319811681146200044a57600080fd5b634e487b7160e01b600052603260045260246000fdfe5369676e617475726556616c696461746f72237265636f7665725369676e6572"
export const verifySignMessageSignatureUniversal = async (params : {
  address : string,
  hash : string,
  signature : string,
  provider: providers.Provider,
}) => {
  const isValidSignature = await params.provider.call({
    data: ethers.utils.concat([
      universalValidator,
      (new ethers.utils.AbiCoder()).encode(['address', 'bytes32', 'bytes'], [params.address, params.hash, params.signature])
    ])
  })
  console.log({ isValidSignature });
}

export function convertHexToNumber(hex: string) {
  try {
    return encoding.hexToNumber(hex);
  } catch (e) {
    return hex;
  }
}

export function convertHexToUtf8(hex: string) {
  try {
    return encoding.hexToUtf8(hex);
  } catch (e) {
    return hex;
  }
}

export const sanitizeDecimals = (value: string, decimals = 18): string => {
  const [integer, fractional] = value.split(".");
  const _fractional = fractional
    ? fractional.substring(0, decimals).replace(/0+$/gi, "")
    : undefined;
  return _fractional ? [integer, _fractional].join(".") : integer;
};

export const toWad = (amount: string, decimals = 18): BigNumber => {
  return utils.parseUnits(sanitizeDecimals(amount, decimals), decimals);
};

export const fromWad = (wad: BigNumberish, decimals = 18): string => {
  return sanitizeDecimals(utils.formatUnits(wad, decimals), decimals);
};

export const LOCALSTORAGE_KEY_TESTNET = "TESTNET";
export const INITIAL_STATE_TESTNET_DEFAULT = true;

export function setLocaleStorageTestnetFlag(value: boolean): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALSTORAGE_KEY_TESTNET, `${value}`);
  }
}

export function getLocalStorageTestnetFlag(): boolean {
  if (typeof window === "undefined") return false;
  let value = INITIAL_STATE_TESTNET_DEFAULT;
  const persisted = window.localStorage.getItem(LOCALSTORAGE_KEY_TESTNET);
  if (!persisted) {
    setLocaleStorageTestnetFlag(value);
  } else {
    value = persisted === "true" ? true : false;
  }
  return value;
}

export const getAllChainNamespaces = () => {
  const namespaces: string[] = [];
  DEFAULT_CHAINS.forEach((chainId) => {
    const [namespace] = chainId.split(":");
    if (!namespaces.includes(namespace)) {
      namespaces.push(namespace);
    }
  });
  return namespaces;
};

export const getProviderUrl = (chainId: string) => {
  return `https://rpc.walletconnect.com/v1/?chainId=${chainId}&projectId=${process.env.NEXT_PUBLIC_PROJECT_ID}`;
};
