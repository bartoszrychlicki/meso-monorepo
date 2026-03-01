/**
 * MESO Delivery - Database Migration Script
 * Uruchamia migracje SQL w Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration(filename) {
  const filePath = path.join(__dirname, '..', 'supabase', 'migrations', filename)

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${filename}`)
    return false
  }

  const sql = fs.readFileSync(filePath, 'utf8')

  console.log(`\n📦 Running migration: ${filename}`)
  console.log('─'.repeat(50))

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, we need to use the SQL directly via REST API
      throw error
    }

    console.log(`✅ Migration ${filename} completed successfully`)
    return true
  } catch (error) {
    // Fallback: execute SQL statements one by one
    console.log('⚠️  Executing SQL statements individually...')

    // Split SQL into statements (basic split - may need improvement for complex SQL)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let success = 0
    let failed = 0

    for (const statement of statements) {
      if (statement.toLowerCase().startsWith('do $$') ||
          statement.includes('$$')) {
        // Skip PL/pgSQL blocks for now - they need special handling
        console.log('⏭️  Skipping PL/pgSQL block')
        continue
      }

      try {
        const { error: stmtError } = await supabase.from('_migrations').select('*').limit(0)
        // We can't execute arbitrary SQL via the JS client, need to use Dashboard
        success++
      } catch (e) {
        failed++
      }
    }

    console.log(`\n⚠️  Note: For full migration support, please run the SQL directly in Supabase Dashboard.`)
    console.log(`   Go to: ${supabaseUrl.replace('.supabase.co', '')}/project/sql`)
    return false
  }
}

async function main() {
  console.log('🍜 MESO Delivery - Database Migration')
  console.log('=====================================\n')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)

  // Test connection
  const { data, error } = await supabase.from('locations').select('count').single()

  if (error && error.code !== 'PGRST116') {
    console.log('\n📋 Tables do not exist yet. Please run migrations in Supabase Dashboard:\n')
    console.log(`1. Go to: https://supabase.com/dashboard/project/gyxcdrcdnnzjdmcrwbpr/sql/new`)
    console.log(`2. Copy and paste the content of: supabase/migrations/001_initial_schema.sql`)
    console.log(`3. Click "Run"`)
    console.log(`4. Then do the same for: supabase/migrations/002_seed_data.sql`)
  } else {
    console.log('\n✅ Database connection successful!')

    // Check if tables exist
    const { data: locations } = await supabase.from('locations').select('name').limit(1)
    const { data: products } = await supabase.from('products').select('name').limit(1)

    if (locations && locations.length > 0) {
      console.log('✅ Locations table exists with data')
    }
    if (products && products.length > 0) {
      console.log('✅ Products table exists with data')
    }
  }
}

main().catch(console.error)
