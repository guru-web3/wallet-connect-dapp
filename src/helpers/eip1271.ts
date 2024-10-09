import { Contract, ethers, providers, utils } from "ethers";
import { verifySignMessageSignatureUniversal } from "./utilities";

const spec = {
  magicValue: "0x1626ba7e",
  abi: [
    {
      constant: true,
      inputs: [
        {
          name: "_hash",
          type: "bytes32",
        },
        {
          name: "_sig",
          type: "bytes",
        },
      ],
      name: "isValidSignature",
      outputs: [
        {
          name: "magicValue",
          type: "bytes4",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  ],
};

async function isValidSignature(
  address: string,
  sig: string,
  data: string,
  provider: providers.Provider,
  abi = eip1271.spec.abi,
  magicValue = eip1271.spec.magicValue
): Promise<boolean> {
  let returnValue;
  try {
    returnValue = await new Contract(address, abi, provider).isValidSignature(
      data,
      sig
    );
  } catch (e) {
    console.log({e});
    const isValidSignature = verifySignMessageSignatureUniversal({
      address,
      signature: sig,
      hash: data,
      provider,
    })
    console.log({ isValidSignature }, {e});
    return false;
  }
  return returnValue.toLowerCase() === magicValue.toLowerCase();
}

export const eip1271 = {
  spec,
  isValidSignature,
};
