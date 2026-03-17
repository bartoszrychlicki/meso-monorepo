export function resolveInitialModifierGroupIds(
  initialModifierGroupIds: string[] | undefined,
  legacyModifierGroupIds: string[]
): string[] {
  return initialModifierGroupIds ?? legacyModifierGroupIds;
}
