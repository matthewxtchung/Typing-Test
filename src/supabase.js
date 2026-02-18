import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://fxyjggnjtiovcoseumah.supabase.co',
  'sb_publishable_KugRmv9dADbDg-0ZUkRbtA_5rUb1Zbe'  // Replace with your Supabase public key
);

// Wrap your async calls inside an async function
async function signUpAndLogin(email, password, finalWpm, finalAccuracy) {
  // Sign up a user
  const { user, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError.message);
    return;
  }

  // Log the user in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Sign in error:', signInError.message);
    return;
  }

  // Get the user info after login
  const { data: { user: loggedInUser }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error('Get user error:', userError.message);
    return;
  }

  // Insert typing test result
  const { error: insertError } = await supabase
    .from('tests')
    .insert([
      {
        user_id: loggedInUser.id,
        wpm: finalWpm,
        accuracy: finalAccuracy,
      },
    ]);

  if (insertError) {
    console.error('Insert error:', insertError.message);
    return;
  }

  // Fetch tests for the user
  const { data, error: fetchError } = await supabase
    .from('tests')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Fetch error:', fetchError.message);
    return;
  }

  console.log(data); // Output the data for testing
}

export default signUpAndLogin;
