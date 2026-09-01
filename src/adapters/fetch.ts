export type FetchFn = (
  input: string,
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
