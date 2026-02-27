import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@mesopos.pl',
    password: 'Admin123!',
    email_confirm: true,
    user_metadata: {
      app_role: 'staff',
      name: 'Administrator',
      role: 'admin',
    },
  });

  if (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }

  console.log('Admin user created:', data.user?.id);
  console.log('Email: admin@mesopos.pl');
  console.log('Password: Admin123!');
}

createAdmin();
