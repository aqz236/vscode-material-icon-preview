export type RequireAtLeastOne<T, TKeys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, TKeys>
> &
  {
    [K in TKeys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<TKeys, K>>>;
  }[TKeys];
