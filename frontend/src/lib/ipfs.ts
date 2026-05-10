const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

function getPinataJwt(): string | null {
  return process.env.NEXT_PUBLIC_PINATA_JWT ?? null;
}

export async function uploadFileToIPFS(file: File): Promise<string> {
  const jwt = getPinataJwt();
  if (!jwt) throw new Error("IPFS upload not configured — set NEXT_PUBLIC_PINATA_JWT");

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${text}`);
  }

  const data = (await res.json()) as PinataResponse;
  return `ipfs://${data.IpfsHash}`;
}

export async function uploadJsonToIPFS(json: Record<string, unknown>): Promise<string> {
  const jwt = getPinataJwt();
  if (!jwt) throw new Error("IPFS upload not configured — set NEXT_PUBLIC_PINATA_JWT");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinataContent: json }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata JSON upload failed: ${text}`);
  }

  const data = (await res.json()) as PinataResponse;
  return `ipfs://${data.IpfsHash}`;
}

export function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `${PINATA_GATEWAY}/${uri.slice(7)}`;
  }
  return uri;
}

export function hasPinataConfig(): boolean {
  return !!getPinataJwt();
}
