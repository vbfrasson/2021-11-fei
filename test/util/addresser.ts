class SimAddresses {
  readonly tribeTimelockAddress: string =
    "0xd51dba7a94e1adea403553a8235c302cebf41a3c";
  readonly tribeGovernorAddress: string =
    "0x0BEF27FEB58e857046d630B2c03dFb7bae567494";
  readonly rgtTimelockAddress: string =
    "0x8ace03fc45139fddba944c6a4082b604041d19fc";
  readonly rgtGovernorAddress: string =
    "0x91d9c2b5cF81D55a5f2Ecc0fC84E62f9cd2ceFd6";

  readonly tribeVoterAddress: string =
    "0xe0ac4559739bd36f0913fb0a3f5bfc19bcbacd52";
  readonly rgtVoterAddress: string =
    "0x961bcb93666e0ea73b6d88a03817cb36f93a6dd9";

  readonly rgtTokenAddress: string =
    "0xD291E7a03283640FDc51b121aC401383A46cC623";
  readonly feiTokenAddress: string =
    "0x956F47F50A910163D8BF957Cf5846D573E7f87CA";
  readonly feiCoreAddress: string =
    "0x8d5ED43dCa8C2F7dFB20CF7b53CC7E593635d7b9";
  readonly tribeTokenAddress: string =
    "0xc7283b66eb1eb5fb86327f08e1b5816b0720212b";

  constructor() {}
}

export const Addresser = new SimAddresses();
