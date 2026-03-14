import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MESOpos API - Dokumentacja',
  description: 'Publiczna dokumentacja REST API systemu MESOpos',
};

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-amber-100 text-amber-800',
    PATCH: 'bg-violet-100 text-violet-800',
    DELETE: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold uppercase ${colors[method] || 'bg-gray-100 text-gray-800'}`}
      style={{ minWidth: '3.5rem' }}
    >
      {method}
    </span>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      {title && (
        <div className="border-b border-gray-200 bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-gray-800">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  permission,
  params,
  queryParams,
  body,
  response,
}: {
  method: string;
  path: string;
  description: string;
  permission: string;
  params?: { name: string; type: string; desc: string }[];
  queryParams?: { name: string; type: string; desc: string; required?: boolean }[];
  body?: string;
  response?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white" id={`${method.toLowerCase()}-${path.replace(/[/:]/g, '-')}`}>
      <div className="flex items-center gap-3 border-b border-gray-100 p-4">
        <MethodBadge method={method} />
        <code className="text-sm font-semibold text-gray-900">{path}</code>
        <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {permission}
        </span>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-sm text-gray-600">{description}</p>
        {params && params.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Parametry URL
            </h4>
            <table className="w-full text-sm">
              <tbody>
                {params.map((p) => (
                  <tr key={p.name} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-mono text-xs text-gray-900">{p.name}</td>
                    <td className="py-1.5 pr-3 text-xs text-gray-500">{p.type}</td>
                    <td className="py-1.5 text-xs text-gray-600">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {queryParams && queryParams.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Parametry zapytania
            </h4>
            <table className="w-full text-sm">
              <tbody>
                {queryParams.map((p) => (
                  <tr key={p.name} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-mono text-xs text-gray-900">
                      {p.name}
                      {p.required && <span className="ml-1 text-red-500">*</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-xs text-gray-500">{p.type}</td>
                    <td className="py-1.5 text-xs text-gray-600">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {body && <CodeBlock title="Request body">{body}</CodeBlock>}
        {response && <CodeBlock title="Response">{response}</CodeBlock>}
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12" data-page="api-docs">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          MESOpos REST API
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Dokumentacja publicznego API systemu MESOpos do integracji z zewnętrznymi aplikacjami.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            v1
          </span>
          <span>Base URL:</span>
          <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
            https://twoja-domena.pl/api/v1
          </code>
        </div>
      </div>

      {/* Table of Contents */}
      <nav className="mb-12 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Spis treści
        </h2>
        <ul className="space-y-1.5 text-sm">
          <li><a href="#autentykacja" className="text-blue-600 hover:underline">Autentykacja</a></li>
          <li><a href="#format-odpowiedzi" className="text-blue-600 hover:underline">Format odpowiedzi</a></li>
          <li><a href="#kody-bledow" className="text-blue-600 hover:underline">Kody błędów</a></li>
          <li><a href="#paginacja" className="text-blue-600 hover:underline">Paginacja</a></li>
          <li>
            <a href="#menu" className="text-blue-600 hover:underline">Menu</a>
            <ul className="ml-4 mt-1 space-y-1 text-gray-500">
              <li><a href="#menu-products" className="hover:text-blue-600">Produkty</a></li>
              <li><a href="#menu-categories" className="hover:text-blue-600">Kategorie</a></li>
            </ul>
          </li>
          <li>
            <a href="#orders" className="text-blue-600 hover:underline">Zamówienia</a>
            <ul className="ml-4 mt-1 space-y-1 text-gray-500">
              <li><a href="#orders-crud" className="hover:text-blue-600">CRUD</a></li>
              <li><a href="#orders-status" className="hover:text-blue-600">Zmiana statusu</a></li>
            </ul>
          </li>
          <li>
            <a href="#crm" className="text-blue-600 hover:underline">Klienci (CRM)</a>
            <ul className="ml-4 mt-1 space-y-1 text-gray-500">
              <li><a href="#crm-customers" className="hover:text-blue-600">CRUD klientów</a></li>
            </ul>
          </li>
          <li>
            <a href="#locations" className="text-blue-600 hover:underline">Lokalizacje</a>
            <ul className="ml-4 mt-1 space-y-1 text-gray-500">
              <li><a href="#locations-list" className="hover:text-blue-600">Lista lokalizacji</a></li>
              <li><a href="#locations-detail" className="hover:text-blue-600">Szczegóły lokalizacji</a></li>
            </ul>
          </li>
          <li><a href="#enumy" className="text-blue-600 hover:underline">Wartości enum</a></li>
        </ul>
      </nav>

      {/* Auth */}
      <section className="mb-12" id="autentykacja">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Autentykacja</h2>
        <p className="mb-4 text-sm text-gray-600">
          Wszystkie endpointy wymagają klucza API przesyłanego w nagłówku <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Key</code>.
          Klucze API można wygenerować w panelu <strong>Ustawienia &rarr; Klucze API</strong>.
        </p>
        <CodeBlock title="Przykład">{`curl -H "X-API-Key: meso_k1_abc123def456..." \\
     https://twoja-domena.pl/api/v1/menu/products`}</CodeBlock>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Uprawnienia:</strong> Każdy klucz API ma przypisany zestaw uprawnień.
          Endpoint wymaga konkretnego uprawnienia (np. <code className="text-xs">menu:read</code>).
          Jeśli klucz nie posiada wymaganego uprawnienia, otrzymasz błąd <code className="text-xs">403 Forbidden</code>.
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Dostępne uprawnienia</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                <th className="py-2 pr-4">Uprawnienie</th>
                <th className="py-2">Opis</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 font-mono text-xs">menu:read</td>
                <td className="py-1.5 text-gray-600">Odczyt produktów i kategorii</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 font-mono text-xs">menu:write</td>
                <td className="py-1.5 text-gray-600">Tworzenie, edycja i usuwanie produktów oraz kategorii</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 font-mono text-xs">orders:read</td>
                <td className="py-1.5 text-gray-600">Odczyt zamówień</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 font-mono text-xs">orders:write</td>
                <td className="py-1.5 text-gray-600">Tworzenie, edycja i usuwanie zamówień</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 font-mono text-xs">orders:status</td>
                <td className="py-1.5 text-gray-600">Zmiana statusu zamówień</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 font-mono text-xs">crm:read</td>
                <td className="py-1.5 text-gray-600">Odczyt klientów</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 font-mono text-xs">crm:write</td>
                <td className="py-1.5 text-gray-600">Tworzenie, edycja i usuwanie klientów</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 font-mono text-xs">settings:read</td>
                <td className="py-1.5 text-gray-600">Odczyt lokalizacji i ich konfiguracji</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Response Format */}
      <section className="mb-12" id="format-odpowiedzi">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Format odpowiedzi</h2>
        <p className="mb-4 text-sm text-gray-600">
          Wszystkie odpowiedzi mają jednolity format JSON:
        </p>
        <CodeBlock title="Sukces">{`{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 42,
    "page": 1,
    "per_page": 20,
    "timestamp": "2026-02-08T12:00:00.000Z"
  }
}`}</CodeBlock>
        <div className="mt-4">
          <CodeBlock title="Błąd">{`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Błąd walidacji danych",
    "details": [
      { "field": "name", "message": "Nazwa produktu jest wymagana" }
    ]
  },
  "meta": {
    "timestamp": "2026-02-08T12:00:00.000Z"
  }
}`}</CodeBlock>
        </div>
      </section>

      {/* Error Codes */}
      <section className="mb-12" id="kody-bledow">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Kody błędów</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">HTTP</th>
              <th className="py-2 pr-4">Kod</th>
              <th className="py-2">Opis</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-mono text-xs">400</td>
              <td className="py-1.5 pr-4 font-mono text-xs">INVALID_JSON</td>
              <td className="py-1.5 text-gray-600">Nieprawidłowy format JSON w body</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-mono text-xs">401</td>
              <td className="py-1.5 pr-4 font-mono text-xs">UNAUTHORIZED</td>
              <td className="py-1.5 text-gray-600">Brak lub nieprawidłowy klucz API</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-mono text-xs">403</td>
              <td className="py-1.5 pr-4 font-mono text-xs">FORBIDDEN</td>
              <td className="py-1.5 text-gray-600">Klucz API nie posiada wymaganego uprawnienia</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-mono text-xs">404</td>
              <td className="py-1.5 pr-4 font-mono text-xs">NOT_FOUND</td>
              <td className="py-1.5 text-gray-600">Zasób nie istnieje</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-mono text-xs">422</td>
              <td className="py-1.5 pr-4 font-mono text-xs">VALIDATION_ERROR</td>
              <td className="py-1.5 text-gray-600">Dane nie przeszły walidacji</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-mono text-xs">422</td>
              <td className="py-1.5 pr-4 font-mono text-xs">INVALID_STATUS_TRANSITION</td>
              <td className="py-1.5 text-gray-600">Niedozwolona zmiana statusu zamówienia</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Pagination */}
      <section className="mb-12" id="paginacja">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Paginacja</h2>
        <p className="mb-4 text-sm text-gray-600">
          Endpointy listujące kolekcje obsługują paginację poprzez parametry zapytania:
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Parametr</th>
              <th className="py-2 pr-4">Typ</th>
              <th className="py-2 pr-4">Domyślnie</th>
              <th className="py-2">Opis</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-mono text-xs">page</td>
              <td className="py-1.5 pr-4 text-xs text-gray-500">number</td>
              <td className="py-1.5 pr-4 text-xs text-gray-500">1</td>
              <td className="py-1.5 text-gray-600">Numer strony</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-mono text-xs">per_page</td>
              <td className="py-1.5 pr-4 text-xs text-gray-500">number</td>
              <td className="py-1.5 pr-4 text-xs text-gray-500">20</td>
              <td className="py-1.5 text-gray-600">Liczba wyników na stronę (maks. 100)</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4">
          <CodeBlock title="Przykład">{`GET /api/v1/menu/products?page=2&per_page=10`}</CodeBlock>
        </div>
      </section>

      {/* ──────────── MENU ──────────── */}
      <section className="mb-12" id="menu">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Menu</h2>

        {/* Products */}
        <div className="mb-8" id="menu-products">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">Produkty</h3>
          <div className="space-y-4">
            <Endpoint
              method="GET"
              path="/api/v1/menu/products"
              description="Pobierz listę produktów z opcjonalnym filtrowaniem i paginacją."
              permission="menu:read"
              queryParams={[
                { name: 'page', type: 'number', desc: 'Numer strony (domyślnie: 1)' },
                { name: 'per_page', type: 'number', desc: 'Wyników na stronę (domyślnie: 20, maks: 100)' },
                { name: 'category_id', type: 'string', desc: 'Filtruj po kategorii (UUID)' },
                { name: 'search', type: 'string', desc: 'Szukaj po nazwie produktu' },
                { name: 'available', type: 'boolean', desc: 'Filtruj po dostępności (true/false)' },
              ]}
              response={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Burger Classic",
      "slug": "burger-classic",
      "sku": "BRG-001",
      "category_id": "uuid",
      "type": "single",
      "price": 29.90,
      "tax_rate": 8,
      "is_available": true,
      "allergens": ["gluten", "eggs", "milk"],
      "variants": [...],
      "modifier_groups": [...],
      "pricing": [
        { "channel": "delivery", "price": 34.90 },
        { "channel": "pickup", "price": 29.90 }
      ],
      ...
    }
  ],
  "meta": { "total": 42, "page": 1, "per_page": 20, "timestamp": "..." }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/menu/products"
              description="Utwórz nowy produkt. Wszystkie wymagane pola muszą być wypełnione."
              permission="menu:write"
              body={`{
  "name": "Burger Classic",
  "slug": "burger-classic",
  "sku": "BRG-001",
  "category_id": "uuid",
  "type": "single",           // single | with_variants | combo
  "price": 29.90,
  "tax_rate": 8,
  "is_available": true,
  "is_featured": false,
  "allergens": ["gluten", "eggs"],
  "pricing": [
    { "channel": "delivery", "price": 34.90 },
    { "channel": "pickup", "price": 29.90 }
  ],
  "variants": [                // opcjonalne
    {
      "name": "Duży",
      "sku": "BRG-001-L",
      "price": 39.90,
      "is_available": true,
      "sort_order": 0,
      "variant_type": "size"   // size | version | weight
    }
  ],
  "modifier_groups": [         // opcjonalne
    {
      "name": "Dodatki",
      "type": "multiple",      // single | multiple
      "required": false,
      "min_selections": 0,
      "max_selections": 5,
      "modifiers": [
        {
          "name": "Ser cheddar",
          "price": 4.00,
          "is_available": true,
          "modifier_action": "add"
        }
      ]
    }
  ],
  "ingredients": [             // opcjonalne (BOM)
    {
      "stock_item_id": "uuid",
      "stock_item_name": "Bułka burger",
      "quantity": 1,
      "unit": "szt"
    }
  ]
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/menu/products/:id"
              description="Pobierz szczegóły pojedynczego produktu."
              permission="menu:read"
              params={[{ name: ':id', type: 'UUID', desc: 'ID produktu' }]}
            />

            <Endpoint
              method="PUT"
              path="/api/v1/menu/products/:id"
              description="Zaktualizuj produkt. Wszystkie pola są opcjonalne (partial update)."
              permission="menu:write"
              params={[{ name: ':id', type: 'UUID', desc: 'ID produktu' }]}
              body={`{
  "name": "Burger Classic v2",
  "price": 31.90,
  "is_available": false
}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/menu/products/:id"
              description="Usuń produkt."
              permission="menu:write"
              params={[{ name: ':id', type: 'UUID', desc: 'ID produktu' }]}
              response={`{
  "success": true,
  "data": { "deleted": true },
  "meta": { "timestamp": "..." }
}`}
            />
          </div>
        </div>

        {/* Categories */}
        <div id="menu-categories">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">Kategorie</h3>
          <div className="space-y-4">
            <Endpoint
              method="GET"
              path="/api/v1/menu/categories"
              description="Pobierz listę kategorii menu."
              permission="menu:read"
              queryParams={[
                { name: 'page', type: 'number', desc: 'Numer strony (domyślnie: 1)' },
                { name: 'per_page', type: 'number', desc: 'Wyników na stronę (domyślnie: 50)' },
              ]}
              response={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Burgery",
      "slug": "burgery",
      "description": "Nasze autorskie burgery",
      "sort_order": 1,
      "is_active": true,
      "color": "#ef4444",
      "icon": "hamburger"
    }
  ],
  "meta": { "total": 8, "page": 1, "per_page": 50, "timestamp": "..." }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/menu/categories"
              description="Utwórz nową kategorię."
              permission="menu:write"
              body={`{
  "name": "Napoje",
  "slug": "napoje",
  "description": "Napoje zimne i gorące",
  "sort_order": 5,
  "is_active": true,
  "color": "#3b82f6",
  "icon": "coffee"
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/menu/categories/:id"
              description="Pobierz szczegóły kategorii."
              permission="menu:read"
              params={[{ name: ':id', type: 'UUID', desc: 'ID kategorii' }]}
            />

            <Endpoint
              method="PUT"
              path="/api/v1/menu/categories/:id"
              description="Zaktualizuj kategorię (partial update)."
              permission="menu:write"
              params={[{ name: ':id', type: 'UUID', desc: 'ID kategorii' }]}
              body={`{
  "name": "Napoje gorące",
  "sort_order": 6
}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/menu/categories/:id"
              description="Usuń kategorię."
              permission="menu:write"
              params={[{ name: ':id', type: 'UUID', desc: 'ID kategorii' }]}
            />
          </div>
        </div>
      </section>

      {/* ──────────── ORDERS ──────────── */}
      <section className="mb-12" id="orders">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Zamówienia</h2>

        <div className="mb-8" id="orders-crud">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">CRUD</h3>
          <div className="space-y-4">
            <Endpoint
              method="GET"
              path="/api/v1/orders"
              description="Pobierz listę zamówień z opcjonalnym filtrowaniem."
              permission="orders:read"
              queryParams={[
                { name: 'page', type: 'number', desc: 'Numer strony (domyślnie: 1)' },
                { name: 'per_page', type: 'number', desc: 'Wyników na stronę (domyślnie: 20, maks: 100)' },
                { name: 'status', type: 'string', desc: 'Filtruj po statusie (np. pending, preparing)' },
                { name: 'from', type: 'ISO date', desc: 'Od daty (np. 2026-02-01)' },
                { name: 'to', type: 'ISO date', desc: 'Do daty (np. 2026-02-28)' },
                { name: 'customer', type: 'string', desc: 'Szukaj po nazwie klienta' },
              ]}
              response={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_number": "ZAM-20260208-001",
      "status": "preparing",
      "channel": "online",
      "source": "delivery",
      "location_id": "uuid",
      "customer_name": "Jan Kowalski",
      "items": [...],
      "subtotal": 59.80,
      "discount": 0,
      "tax": 4.78,
      "total": 64.58,
      "created_at": "2026-02-08T10:30:00.000Z",
      ...
    }
  ],
  "meta": { "total": 156, "page": 1, "per_page": 20, "timestamp": "..." }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/orders"
              description="Utwórz nowe zamówienie. Numer zamówienia i totale są wyliczane automatycznie."
              permission="orders:write"
              body={`{
  "channel": "online",          // pos | online | phone | delivery_app
  "source": "delivery",         // dine_in | takeaway | delivery
  "location_id": "uuid",
  "customer_name": "Jan Kowalski",        // opcjonalne
  "customer_phone": "+48123456789",       // opcjonalne
  "payment_method": "card",     // cash | card | blik | online | voucher
  "notes": "Bez cebuli",        // opcjonalne
  "discount": 5.00,             // opcjonalne (domyślnie: 0)
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Burger Classic",
      "quantity": 2,
      "unit_price": 29.90,
      "variant_id": "uuid",              // opcjonalne
      "variant_name": "Duży",            // opcjonalne
      "notes": "Medium rare",            // opcjonalne
      "modifiers": [                     // opcjonalne
        {
          "modifier_id": "uuid",
          "name": "Extra ser",
          "price": 4.00,
          "quantity": 1,
          "modifier_action": "add"
        }
      ]
    }
  ]
}`}
              response={`{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ZAM-20260208-007",
    "status": "pending",
    "subtotal": 63.80,
    "discount": 5.00,
    "tax": 4.70,
    "total": 63.50,
    "items": [...],
    "status_history": [
      { "status": "pending", "timestamp": "...", "changed_by": "api" }
    ],
    ...
  },
  "meta": { "timestamp": "..." }
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/orders/:id"
              description="Pobierz szczegóły zamówienia."
              permission="orders:read"
              params={[{ name: ':id', type: 'UUID', desc: 'ID zamówienia' }]}
            />

            <Endpoint
              method="PUT"
              path="/api/v1/orders/:id"
              description="Zaktualizuj zamówienie (partial update). Totale są przeliczane automatycznie."
              permission="orders:write"
              params={[{ name: ':id', type: 'UUID', desc: 'ID zamówienia' }]}
              body={`{
  "customer_name": "Anna Nowak",
  "notes": "Proszę o dodatkowy sos"
}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/orders/:id"
              description="Usuń zamówienie."
              permission="orders:write"
              params={[{ name: ':id', type: 'UUID', desc: 'ID zamówienia' }]}
            />
          </div>
        </div>

        <div id="orders-status">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">Zmiana statusu</h3>
          <div className="space-y-4">
            <Endpoint
              method="PATCH"
              path="/api/v1/orders/:id/status"
              description="Zmień status zamówienia. Dozwolone są tylko prawidłowe przejścia między statusami."
              permission="orders:status"
              params={[{ name: ':id', type: 'UUID', desc: 'ID zamówienia' }]}
              body={`{
  "status": "preparing",
  "note": "Rozpoczęto przygotowanie"   // opcjonalne
}`}
              response={`{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "preparing",
    "status_history": [
      { "status": "pending", "timestamp": "...", "changed_by": "system" },
      { "status": "confirmed", "timestamp": "...", "changed_by": "api" },
      { "status": "accepted", "timestamp": "...", "changed_by": "api" },
      { "status": "preparing", "timestamp": "...", "note": "Rozpoczęto przygotowanie" }
    ],
    ...
  },
  "meta": { "timestamp": "..." }
}`}
            />

            {/* Status flow diagram */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Dozwolone przejścia statusów
              </h4>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">pending</span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">confirmed</span>
                  <span className="text-gray-300">|</span>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">cancelled</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">confirmed</span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">accepted</span>
                  <span className="text-gray-300">|</span>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">cancelled</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">accepted</span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">preparing</span>
                  <span className="text-gray-300">|</span>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">cancelled</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">preparing</span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">ready</span>
                  <span className="text-gray-300">|</span>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">cancelled</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">ready</span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">out_for_delivery</span>
                  <span className="text-gray-300">|</span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">delivered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">out_for_delivery</span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">delivered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── CRM ──────────── */}
      <section className="mb-12" id="crm">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Klienci (CRM)</h2>

        <div className="mb-8" id="crm-customers">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">CRUD klientów</h3>
          <div className="space-y-4">
            <Endpoint
              method="GET"
              path="/api/v1/crm/customers"
              description="Pobierz listę klientów z opcjonalnym filtrowaniem, wyszukiwaniem i paginacją."
              permission="crm:read"
              queryParams={[
                { name: 'page', type: 'number', desc: 'Numer strony (domyślnie: 1)' },
                { name: 'per_page', type: 'number', desc: 'Wyników na stronę (domyślnie: 50, maks: 100)' },
                { name: 'search', type: 'string', desc: 'Szukaj po imieniu, nazwisku, email lub telefonie' },
                { name: 'phone', type: 'string', desc: 'Szukaj po dokładnym numerze telefonu' },
                { name: 'email', type: 'string', desc: 'Szukaj po dokładnym adresie email' },
                { name: 'tier', type: 'string', desc: 'Filtruj po poziomie lojalności (bronze, silver, gold)' },
              ]}
              response={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "first_name": "Jan",
      "last_name": "Kowalski",
      "email": "jan@example.com",
      "phone": "+48123456789",
      "loyalty_points": 150,
      "loyalty_tier": "bronze",
      "registration_date": "2026-01-15T10:00:00.000Z",
      "source": "pos_terminal",
      "marketing_consent": true,
      "addresses": [...],
      "preferences": { ... },
      "order_history": {
        "total_orders": 5,
        "total_spent": 250.00,
        "average_order_value": 50.00,
        "last_order_date": "2026-02-20T12:00:00.000Z",
        "first_order_date": "2026-01-15T10:00:00.000Z"
      },
      "is_active": true,
      ...
    }
  ],
  "meta": { "total": 42, "page": 1, "per_page": 50, "timestamp": "..." }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/crm/customers"
              description="Utwórz nowego klienta. Numer telefonu jest wymagany i musi być unikalny. Email jest opcjonalny. Nowy klient otrzymuje automatycznie 0 punktów lojalnościowych i poziom Bronze."
              permission="crm:write"
              body={`{
  "first_name": "Jan",
  "last_name": "Kowalski",
  "phone": "+48123456789",           // wymagany, unikalny
  "email": "jan@example.com",        // opcjonalny, unikalny
  "birth_date": "1990-05-15T00:00:00.000Z",  // opcjonalny
  "source": "pos_terminal",          // mobile_app | pos_terminal | website | manual_import
  "marketing_consent": true,         // GDPR
  "addresses": [                     // opcjonalne
    {
      "label": "Dom",
      "street": "Marszałkowska",
      "building_number": "10",
      "apartment_number": "5",       // opcjonalne
      "postal_code": "00-001",       // format: XX-XXX
      "city": "Warszawa",
      "is_default": true,
      "delivery_instructions": "Domofon 105"  // opcjonalne
    }
  ],
  "preferences": {                   // opcjonalne
    "favorite_products": ["uuid1", "uuid2"],
    "dietary_restrictions": ["gluten", "milk"],
    "default_payment_method": "card"
  },
  "notes": "Klient VIP"             // opcjonalne
}`}
              response={`{
  "success": true,
  "data": {
    "id": "uuid",
    "first_name": "Jan",
    "last_name": "Kowalski",
    "phone": "+48123456789",
    "loyalty_points": 0,
    "loyalty_tier": "bronze",
    "is_active": true,
    ...
  },
  "meta": { "timestamp": "..." }
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/crm/customers/:id"
              description="Pobierz szczegóły klienta."
              permission="crm:read"
              params={[{ name: ':id', type: 'UUID', desc: 'ID klienta' }]}
            />

            <Endpoint
              method="PUT"
              path="/api/v1/crm/customers/:id"
              description="Zaktualizuj dane klienta (partial update). Przy zmianie telefonu/email sprawdzana jest unikalność."
              permission="crm:write"
              params={[{ name: ':id', type: 'UUID', desc: 'ID klienta' }]}
              body={`{
  "first_name": "Janusz",
  "marketing_consent": true,
  "notes": "Zmiana preferencji"
}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/crm/customers/:id"
              description="Usuń klienta (soft-delete — ustawia is_active na false)."
              permission="crm:write"
              params={[{ name: ':id', type: 'UUID', desc: 'ID klienta' }]}
              response={`{
  "success": true,
  "data": { "deleted": true },
  "meta": { "timestamp": "..." }
}`}
            />
          </div>
        </div>
      </section>

      {/* ──────────── LOCATIONS ──────────── */}
      <section className="mb-12" id="locations">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Lokalizacje</h2>

        <div className="mb-8" id="locations-list">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">Lista lokalizacji</h3>
          <div className="space-y-4">
            <Endpoint
              method="GET"
              path="/api/v1/locations"
              description="Pobierz listę lokalizacji (punktów sprzedaży, kuchni centralnych) z opcjonalnym filtrowaniem."
              permission="settings:read"
              queryParams={[
                { name: 'page', type: 'number', desc: 'Numer strony (domyślnie: 1)' },
                { name: 'per_page', type: 'number', desc: 'Wyników na stronę (domyślnie: 50, maks: 100)' },
                { name: 'active', type: 'boolean', desc: 'Filtruj po statusie aktywności (true/false)' },
              ]}
              response={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Kuchnia Centralna",
      "type": "central_kitchen",
      "address": {
        "street": "ul. Przemysłowa 12",
        "city": "Warszawa",
        "postal_code": "02-232",
        "country": "PL",
        "lat": null,
        "lng": null
      },
      "phone": "+48123456789",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "per_page": 50, "timestamp": "..." }
}`}
            />
          </div>
        </div>

        <div id="locations-detail">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">Szczegóły lokalizacji</h3>
          <div className="space-y-4">
            <Endpoint
              method="GET"
              path="/api/v1/locations/:id"
              description="Pobierz szczegóły lokalizacji wraz z pełną konfiguracją: delivery, paragon, KDS."
              permission="settings:read"
              params={[{ name: ':id', type: 'UUID', desc: 'ID lokalizacji' }]}
              response={`{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Kuchnia Centralna",
    "type": "central_kitchen",
    "address": {
      "street": "ul. Przemysłowa 12",
      "city": "Warszawa",
      "postal_code": "02-232",
      "country": "PL"
    },
    "phone": "+48123456789",
    "is_active": true,
    "delivery_config": {
      "id": "uuid",
      "location_id": "uuid",
      "is_delivery_active": true,
      "delivery_radius_km": 5,
      "delivery_fee": 10.00,
      "min_order_amount": 30.00,
      "estimated_delivery_minutes": 45,
      "opening_time": "11:00",
      "closing_time": "21:00",
      "pickup_time_min": 15,
      "pickup_time_max": 30,
      "pickup_buffer_after_open": 30,
      "pickup_buffer_before_close": 30,
      "pay_on_pickup_enabled": false,
      "pay_on_pickup_fee": 0,
      "pay_on_pickup_max_order": 0,
      "ordering_paused_until_date": "2026-03-20"
    },
    "receipt_config": {
      "id": "uuid",
      "location_id": "uuid",
      "receipt_header": "MESO - Japanese Comfort Food",
      "receipt_footer": "Dziękujemy za wizytę!",
      "print_automatically": true,
      "show_logo": true
    },
    "kds_config": {
      "id": "uuid",
      "location_id": "uuid",
      "alert_time_minutes": 5,
      "auto_accept_orders": false,
      "sound_enabled": true,
      "display_priority": true
    }
  },
  "meta": { "timestamp": "..." }
}`}
            />

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Uwagi
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  Pola <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">delivery_config</code>,{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">receipt_config</code> i{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">kds_config</code> mogą być{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">null</code> jeśli konfiguracja
                  nie została jeszcze utworzona dla danej lokalizacji.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── ENUMS ──────────── */}
      <section className="mb-12" id="enumy">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Wartości enum</h2>
        <p className="mb-6 text-sm text-gray-600">
          Poniżej znajdują się wszystkie dozwolone wartości dla pól typu enum używanych w API.
        </p>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">OrderStatus</h3>
            <code className="text-xs text-gray-600">
              pending | confirmed | accepted | preparing | ready | out_for_delivery | delivered | cancelled
            </code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">OrderChannel</h3>
            <code className="text-xs text-gray-600">pos | online | phone | delivery_app</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">OrderSource</h3>
            <code className="text-xs text-gray-600">dine_in | takeaway | delivery</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">PaymentMethod</h3>
            <code className="text-xs text-gray-600">cash | card | blik | online | voucher</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">ProductType</h3>
            <code className="text-xs text-gray-600">single | with_variants | combo</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">VariantType</h3>
            <code className="text-xs text-gray-600">size | version | weight</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">ModifierType</h3>
            <code className="text-xs text-gray-600">single | multiple</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">ModifierAction</h3>
            <code className="text-xs text-gray-600">add | remove | substitute | preparation</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">SalesChannel</h3>
            <code className="text-xs text-gray-600">delivery | pickup | eat_in</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Allergen (EU 14)</h3>
            <code className="text-xs text-gray-600">
              gluten | crustaceans | eggs | fish | peanuts | soybeans | milk | nuts | celery | mustard | sesame | sulphites | lupin | molluscs
            </code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">LocationType</h3>
            <code className="text-xs text-gray-600">central_kitchen | food_truck | kiosk | restaurant</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">CustomerSource</h3>
            <code className="text-xs text-gray-600">mobile_app | pos_terminal | website | manual_import</code>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">LoyaltyTier</h3>
            <code className="text-xs text-gray-600">bronze | silver | gold</code>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
        MESOpos API v1 &mdash; Wygenerowano automatycznie
      </footer>
    </div>
  );
}
