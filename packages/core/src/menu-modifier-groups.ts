type ModifierLike = {
  id: string;
  name?: string;
  price?: number;
  is_available?: boolean;
  modifier_action?: unknown;
  sort_order?: number | null;
};

type ModifierGroupLike<TModifier extends ModifierLike = ModifierLike> = {
  modifiers?: TModifier[] | null;
};

type ProductLike<TGroup extends ModifierGroupLike = ModifierGroupLike> = {
  id: string;
  modifier_groups?: TGroup[] | null;
};

export interface SyncedMenuModifier {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  modifier_action?: string;
  sort_order?: number | null;
}

export interface ProductModifierLink {
  product_id: string;
  modifier_id: string;
  sort_order?: number | null;
}

function getSafeSortOrder(
  modifierId: string,
  orderMap: Map<string, number> | null,
  fallbackOrder: unknown
): number {
  if (orderMap?.has(modifierId)) {
    return orderMap.get(modifierId) ?? Number.MAX_SAFE_INTEGER;
  }

  return typeof fallbackOrder === 'number' ? fallbackOrder : Number.MAX_SAFE_INTEGER;
}

export function syncProductModifierGroups<
  TProduct extends ProductLike<TGroup>,
  TGroup extends ModifierGroupLike<TModifier>,
  TModifier extends ModifierLike,
>(
  products: TProduct[],
  productLinks: ProductModifierLink[],
  modifiers: SyncedMenuModifier[]
): TProduct[] {
  if (products.length === 0) return products;

  const modifiersById = new Map(modifiers.map((modifier) => [modifier.id, modifier]));
  const linksByProductId = new Map<string, ProductModifierLink[]>();

  for (const link of productLinks) {
    const current = linksByProductId.get(link.product_id) ?? [];
    current.push(link);
    linksByProductId.set(link.product_id, current);
  }

  return products.map((product) => {
    const groups = Array.isArray(product.modifier_groups) ? product.modifier_groups : [];
    if (groups.length === 0) return product;

    const linksForProduct = linksByProductId.get(product.id) ?? [];
    const hasProductLinks = linksForProduct.length > 0;
    const allowedModifierIds = hasProductLinks
      ? new Set(linksForProduct.map((link) => link.modifier_id))
      : null;
    const orderMap = hasProductLinks
      ? new Map(
          [...linksForProduct]
            .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
            .map((link, index) => [link.modifier_id, link.sort_order ?? index])
        )
      : null;

    const syncedGroups = groups
      .map((group) => {
        const groupModifiers = Array.isArray(group.modifiers) ? group.modifiers : [];
        const syncedModifiers = groupModifiers
          .filter((modifier) => !hasProductLinks || allowedModifierIds?.has(modifier.id))
          .map((modifier) => {
            const latestModifier = modifiersById.get(modifier.id);

            if (!latestModifier) {
              return hasProductLinks ? null : modifier;
            }

            return {
              ...modifier,
              name: latestModifier.name,
              price: latestModifier.price,
              is_available: latestModifier.is_available,
              modifier_action: latestModifier.modifier_action ?? modifier.modifier_action,
              sort_order: hasProductLinks
                ? getSafeSortOrder(
                    modifier.id,
                    orderMap,
                    latestModifier.sort_order ?? modifier.sort_order
                  )
                : modifier.sort_order,
            } as TModifier;
          })
          .filter((modifier): modifier is TModifier => Boolean(modifier))
          .sort(
            (left, right) =>
              getSafeSortOrder(left.id, orderMap, left.sort_order) -
              getSafeSortOrder(right.id, orderMap, right.sort_order)
          );

        return {
          ...group,
          modifiers: syncedModifiers,
        } as TGroup;
      })
      .filter((group) => (group.modifiers?.length ?? 0) > 0);

    return {
      ...product,
      modifier_groups: syncedGroups,
    } as TProduct;
  });
}
