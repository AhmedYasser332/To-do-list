import { createClient } from '@supabase/supabase-js';

async function provisionOwner() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    console.error('Error: SUPABASE_SECRET_KEY is required for owner provisioning.');
    process.exit(1);
  }

  const email = process.env.OWNER_EMAIL || 'owner@example.com';
  const password = process.env.OWNER_PASSWORD || 'password123';

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`Checking if owner account ${email} exists...`);
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Failed to query users:', listError.message);
    process.exit(1);
  }

  const existingUser = usersData.users.find((u) => u.email === email);

  if (existingUser) {
    console.log(`Owner account ${email} already exists (ID: ${existingUser.id}). Idempotent setup verified.`);
    return;
  }

  console.log(`Creating owner account ${email}...`);
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    console.error('Failed to create owner account:', createError.message);
    process.exit(1);
  }

  console.log(`Owner account successfully created (ID: ${newUser.user.id}).`);
}

provisionOwner().catch((err) => {
  console.error('Provisioning error:', err);
  process.exit(1);
});
