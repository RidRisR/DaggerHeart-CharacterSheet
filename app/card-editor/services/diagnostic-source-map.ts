export interface DiagnosticSourceMapEntry<TJumpTarget = unknown> {
  internalPath: string;
  authorPath: string;
  fieldLabel?: string;
  locationLabel?: string;
  jumpTarget?: TJumpTarget;
}

export interface DiagnosticSourceMap<TJumpTarget = unknown> {
  lookup(internalPath: string): DiagnosticSourceMapEntry<TJumpTarget> | undefined;
}

export function createIdentityDiagnosticSourceMap<TJumpTarget>(
  resolve?: (
    path: string,
  ) =>
    | Omit<
        DiagnosticSourceMapEntry<TJumpTarget>,
        "internalPath" | "authorPath"
      >
    | undefined,
): DiagnosticSourceMap<TJumpTarget> {
  return {
    lookup(internalPath) {
      return { internalPath, authorPath: internalPath, ...resolve?.(internalPath) };
    },
  };
}
